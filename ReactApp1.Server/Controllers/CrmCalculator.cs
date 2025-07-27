using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.ML;
using Microsoft.ML.Data;
using Microsoft.ML.Transforms.TimeSeries;

namespace ReactApp1.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class crmCalculatorController : ControllerBase
    {
        private readonly PostgresContext _db;
        private readonly ILogger<crmCalculatorController> _logger;
        private readonly MLContext _mlContext;

        public crmCalculatorController(PostgresContext db, ILogger<crmCalculatorController> logger)
        {
            _db = db;
            _logger = logger;
            _mlContext = new MLContext();
        }

        [HttpGet("{producerId}")]
        public IActionResult CalculateCrmRatios(int producerId)
        {
            try
            {
                var producer = _db.Wells
                    .Include(w => w.SkinFactors)
                    .Include(w => w.Links)
                    .Include(w => w.Horizonts)
                    .FirstOrDefault(w => w.IdWell == producerId);

                if (producer == null)
                    return NotFound("Скважина-производитель не найдена");

                var activeLinks = _db.Links
                    .Where(l => l.Status == 1 && l.WellLink == producerId)
                    .ToList();

                if (!activeLinks.Any())
                    return Ok(new { Message = "Нет активных нагнетателей" });

                var wellIds = activeLinks.Select(l => l.IdWell).ToList();
                wellIds.Add(producerId);

                var latestWellData = _db.WellData
                    .Where(wd => wellIds.Contains(wd.IdWell.Value))
                    .AsEnumerable()
                    .GroupBy(wd => wd.IdWell.Value)
                    .ToDictionary(
                        g => g.Key,
                        g => g.OrderByDescending(wd => new DateTime(
                            (int)(wd.Year ?? DateTime.Now.Year),
                            (int)(wd.Month ?? 1),
                            1))
                        .FirstOrDefault()
                    );

                var results = new List<CrmRatioResult>();
                var injectorTotals = new Dictionary<long, double>();
                var forecastedTotals = new Dictionary<long, double>();

                foreach (var link in activeLinks)
                {
                    var injector = _db.Wells
                        .Include(w => w.Horizonts)
                        .FirstOrDefault(w => w.IdWell == link.IdWell);

                    if (injector == null)
                        continue;

                    var prodHorizont = producer.Horizonts.FirstOrDefault(h => h.SostPl == 1 || h.SostPl == 3);
                    var injHorizont = injector.Horizonts.FirstOrDefault(h => h.SostPl == 1 || h.SostPl == 3);

                    if (prodHorizont == null || injHorizont == null)
                        continue;

                    double producerRate = latestWellData.TryGetValue(producerId, out var prodData) ? prodData?.Rate ?? 1 : 1;
                    double injectorRate = latestWellData.TryGetValue(injector.IdWell, out var injData) ? injData?.Rate ?? 1 : 1;

                    double crmRatio = CalculateCrmRatio(producer, injector, link, prodHorizont, injHorizont, producerRate, injectorRate);

                    if (link.Lastratio.HasValue && link.Lastratio > 0)
                    {
                        crmRatio = 0.8 * crmRatio + 0.2 * link.Lastratio.Value;
                    }

                    var historicalData = _db.Measurings
                        .Where(m => m.IdLink == link.IdLink)
                        .OrderBy(m => m.DateReading)
                        .ToList();

                    double forecastedRatio = ForecastRatio(historicalData, crmRatio);

                    // Сохраняем суммы для нормализации
                    injectorTotals[injector.IdWell] = crmRatio;
                    forecastedTotals[injector.IdWell] = forecastedRatio;

                    results.Add(new CrmRatioResult
                    {
                        LinkId = link.IdLink,
                        InjectorId = injector.IdWell,
                        InjectorName = injector.Name,
                        CalculatedRatio = crmRatio,
                        ForecastedRatio = forecastedRatio,
                        HistoricalData = historicalData.Select(h => new HistoricalRatio
                        {
                            Date = h.DateReading,
                            Ratio = h.Ratio
                        }).ToList()
                    });
                }

                // Нормализуем оба набора коэффициентов
                NormalizeRatios(results, injectorTotals, activeLinks);
                NormalizeForecastedRatios(results, forecastedTotals, activeLinks);

                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка расчета CRM модели");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // Новая функция для нормализации прогнозируемых значений
        private void NormalizeForecastedRatios(List<CrmRatioResult> results,
                                       Dictionary<long, double> forecastedTotals,
                                       List<Link> activeLinks)
        {
            if (!results.Any()) return;

            // 1. Анализ исторических данных и создание прогноза
            var forecasts = new Dictionary<long, (double value, double weight)>();

            foreach (var item in results)
            {
                if (!item.InjectorId.HasValue) continue;

                double forecastValue;
                double confidenceWeight = 1.0; // Вес прогноза (1 = максимальная уверенность)

                // Если есть достаточная история (минимум 3 точки)
                if (item.HistoricalData?.Count >= 3)
                {
                    var history = item.HistoricalData
                        .Where(h => h.Date.HasValue && h.Ratio.HasValue)
                        .OrderBy(h => h.Date)
                        .Select(h => h.Ratio.Value)
                        .ToList();

                    // Метод 1: Простое скользящее среднее
                    double sma = history.TakeLast(3).Average();

                    // Метод 2: Линейный тренд
                    double trend = CalculateLinearTrend(history);

                    // Комбинируем подходы
                    forecastValue = (sma * 0.3 + trend * 0.7);
                    confidenceWeight = 1.5; // Больший вес для прогнозов с историей
                }
                else
                {
                    // Базовый прогноз если данных недостаточно
                    forecastValue = item.CalculatedRatio;
                    confidenceWeight = 0.8; // Меньший вес
                }

                // Гарантируем минимальное отличие в 5%
                double minChange = item.CalculatedRatio * 0.05;
                if (Math.Abs(forecastValue - item.CalculatedRatio) < minChange)
                {
                    forecastValue = forecastValue > item.CalculatedRatio
                        ? item.CalculatedRatio + minChange
                        : item.CalculatedRatio - minChange;
                }

                forecasts[item.InjectorId.Value] = (forecastValue, confidenceWeight);
            }

            // 2. Взвешенная нормализация с учетом уверенности в прогнозах
            double totalWeighted = forecasts.Sum(f => f.Value.value * f.Value.weight);
            if (totalWeighted <= 0) return;

            // 3. Применение системных ограничений
            var maxAllowed = activeLinks.ToDictionary(
                l => l.IdWell,
                l => 1 - (l.Lastratio ?? 0)
            );

            var limitedForecasts = new Dictionary<long, double>();
            double totalAfterLimits = 0;

            foreach (var forecast in forecasts)
            {
                double value = forecast.Value.value;
                if (maxAllowed.TryGetValue(forecast.Key, out var max))
                {
                    value = Math.Min(value, max);
                }
                limitedForecasts[forecast.Key] = value;
                totalAfterLimits += value;
            }

            // 4. Коррекция и окончательная нормализация
            if (totalAfterLimits > 0)
            {
                // Распределение с учетом весов
                double remaining = 1.0 - totalAfterLimits;
                if (remaining != 0)
                {
                    double totalWeights = forecasts.Sum(f =>
                        limitedForecasts[f.Key] > 0 ? f.Value.weight : 0);

                    if (totalWeights > 0)
                    {
                        foreach (var key in limitedForecasts.Keys.ToList())
                        {
                            if (limitedForecasts[key] > 0)
                            {
                                double weight = forecasts[key].weight;
                                limitedForecasts[key] += remaining * (weight / totalWeights);
                            }
                        }
                    }
                }

                // Финальная нормализация
                double finalSum = limitedForecasts.Sum(f => f.Value);
                foreach (var key in limitedForecasts.Keys.ToList())
                {
                    limitedForecasts[key] /= finalSum;
                }
            }

            // 5. Применение результатов
            foreach (var item in results)
            {
                if (item.InjectorId.HasValue && limitedForecasts.TryGetValue(item.InjectorId.Value, out var value))
                {
                    item.ForecastedRatio = value;
                }
            }
        }

        // Вспомогательный метод для расчета линейного тренда
        private double CalculateLinearTrend(List<double> history)
        {
            int n = history.Count;
            double xSum = 0, ySum = 0, xySum = 0, x2Sum = 0;

            for (int i = 0; i < n; i++)
            {
                double x = i;
                double y = history[i];
                xSum += x;
                ySum += y;
                xySum += x * y;
                x2Sum += x * x;
            }

            double slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
            return history.Last() + slope; // Прогнозируем следующее значение
        }

        private double ForecastRatio(List<Measuring> historicalData, double currentRatio)
        {
            if (historicalData.Count < 5) // Not enough data for forecasting
            {
                return currentRatio; // Return current ratio as forecast
            }

            try
            {
                // Convert historical data to ML format
                var dataView = _mlContext.Data.LoadFromEnumerable(
                    historicalData.Select(h => new RatioData
                    {
                        Date = h.DateReading.Value,
                        Ratio = (float)(h.Ratio ?? 0)
                    })
                );

                // Create and configure the forecasting pipeline
                var forecastingPipeline = _mlContext.Forecasting.ForecastBySsa(
                    outputColumnName: "ForecastedRatios",
                    inputColumnName: "Ratio",
                    windowSize: 5,
                    seriesLength: historicalData.Count,
                    trainSize: historicalData.Count,
                    horizon: 1,
                    confidenceLevel: 0.95f,
                    confidenceLowerBoundColumn: "LowerBoundRatios",
                    confidenceUpperBoundColumn: "UpperBoundRatios");

                // Train the model
                var forecaster = forecastingPipeline.Fit(dataView);

                // Create forecasting engine
                var forecastingEngine = forecaster.CreateTimeSeriesEngine<RatioData, RatioForecast>(_mlContext);

                // Forecast
                var forecast = forecastingEngine.Predict();

                // Return the forecasted value
                return forecast.ForecastedRatios[0];
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка прогнозирования CRM коэффициента");
                return currentRatio; // Fallback to current ratio if forecasting fails
            }
        }

        /// <summary>
        /// Расчет CRM-коэффициента между производителем и нагнетателем
        /// </summary>
        /// <param name="producer">Скважина-производитель</param>
        /// <param name="injector">Скважина-нагнетатель</param>
        /// <param name="link">Связь между скважинами</param>
        /// <param name="prodHorizont">Горизонт производителя</param>
        /// <param name="injHorizont">Горизонт нагнетателя</param>
        /// <param name="producerRate">Дебит производителя</param>
        /// <param name="injectorRate">Дебит нагнетателя</param>
        /// <returns>CRM-коэффициент (0-1)</returns>
        private double CalculateCrmRatio(Well producer, Well injector, Link link,
                                 Horizont prodHorizont, Horizont injHorizont,
                                 double producerRate, double injectorRate)
        {
            // 1. Расчет параметров пласта
            double permeability = prodHorizont.Permeability ?? 0; // Проницаемость
            double thickness = prodHorizont.Thickness ?? 0; // Толщина пласта
            double viscosity = prodHorizont.Viscosity ?? 1; // Вязкость

            // 2. Расчет kh (проницаемость * толщина) для обеих скважин
            double khProducer = permeability * thickness;
            double khInjector = (injHorizont.Permeability ?? 0) * (injHorizont.Thickness ?? 0);

            if (khProducer <= 0 || khInjector <= 0)
                return 0;

            // 3. Расчет мобильностного отношения (отношение подвижностей)
            double mobilityRatio = (khProducer / viscosity) / (khInjector / viscosity);

            // 4. Расчет расстояния между скважинами (в метрах)
            double distance = CalculateDistance(
                 (producer.Latitude),
                 (producer.Longitude),
                 (injector.Latitude),
                (injector.Longitude));

            // 5. Отношение дебитов (нагнетатель/производитель)
            double rateRatio = injectorRate / (producerRate + 0.0001); // +0.0001 чтобы избежать деления на 0

            // 6. Параметры скважины
            double skin = producer.SkinFactors?
                .OrderByDescending(s => s.Date)
                .FirstOrDefault()?.SkinFactor1 ?? 0; // Скин-фактор (последнее значение)

            double drainageRadius = producer.DrainageRadius ?? 500; // Радиус дренирования
            double wellRadius = producer.WellRadius ?? 0.1; // Радиус скважины

            // 7. Расчет индекса продуктивности (J)
            double J = CalculateProductivityIndex(
                permeability, thickness, viscosity,
                drainageRadius, wellRadius, skin);

            // 8. Основная формула CRM
            // Формула: (khInjector * rateRatio) / (distance^2 * mobilityRatio * J)
            double crmRatio = (khInjector * rateRatio) / (distance * distance * mobilityRatio * J);

            // Ограничиваем значение между 0 и 1
            return Math.Clamp(crmRatio, 0, 1);
        }

        /// <summary>
        /// Расчет расстояния между двумя точками по координатам (в метрах)
        /// </summary>
        /// <param name="encryptedLat1">Широта точки 1 (зашифрованная)</param>
        /// <param name="encryptedLon1">Долгота точки 1 (зашифрованная)</param>
        /// <param name="encryptedLat2">Широта точки 2 (зашифрованная)</param>
        /// <param name="encryptedLon2">Долгота точки 2 (зашифрованная)</param>
        /// <returns>Расстояние в метрах</returns>
        private double CalculateDistance(string encryptedLat1, string encryptedLon1,
                                 string encryptedLat2, string encryptedLon2)
        {
            // Дешифровка координат
            double? lat1 = aesController.SimpleAES.DecryptToDouble(encryptedLat1);
            double? lon1 = aesController.SimpleAES.DecryptToDouble(encryptedLon1);
            double? lat2 = aesController.SimpleAES.DecryptToDouble(encryptedLat2);
            double? lon2 = aesController.SimpleAES.DecryptToDouble(encryptedLon2);

            // Проверка успешности дешифровки
            if (!lat1.HasValue || !lon1.HasValue || !lat2.HasValue || !lon2.HasValue)
            {
                return 0; // Если дешифровка не удалась, возвращаем 0
            }

            // Формула гаверсинусов для расчета расстояния между точками на сфере
            const double R = 6371; // Радиус Земли в км
            var dLat = ToRadians(lat2.Value - lat1.Value);
            var dLon = ToRadians(lon2.Value - lon1.Value);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1.Value)) * Math.Cos(ToRadians(lat2.Value)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c * 1000; // Переводим в метры
        }

        /// <summary>
        /// Преобразование градусов в радианы
        /// </summary>
        private double ToRadians(double angle) => Math.PI * angle / 180.0;

        /// <summary>
        /// Расчет индекса продуктивности (J)
        /// </summary>
        /// <param name="permeability">Проницаемость</param>
        /// <param name="thickness">Толщина пласта</param>
        /// <param name="viscosity">Вязкость</param>
        /// <param name="drainageRadius">Радиус дренирования</param>
        /// <param name="wellRadius">Радиус скважины</param>
        /// <param name="skinFactor">Скин-фактор</param>
        /// <returns>Индекс продуктивности</returns>
        private double CalculateProductivityIndex(double permeability, double thickness, double viscosity,
                                                  double drainageRadius, double wellRadius, double skinFactor)
        {
            // Формула Дюпюи для индекса продуктивности
            return (2 * Math.PI * permeability * thickness) /
                   (viscosity * (Math.Log(drainageRadius / wellRadius) + skinFactor)) * 0.008527;
        }

        /// <summary>
        /// Нормализация CRM-коэффициентов
        /// </summary>
        /// <param name="results">Список результатов</param>
        /// <param name="injectorTotals">Суммы по нагнетателям</param>
        /// <param name="activeLinks">Активные связи</param>
        private void NormalizeRatios(List<CrmRatioResult> results, Dictionary<long, double> injectorTotals, List<Link> activeLinks)
        {
            if (!results.Any()) return;

            // 1. Создаем словарь с максимально допустимыми коэффициентами для нагнетателей
            // Максимальное значение = 1 - предыдущее значение коэффициента
            var maxAllowedRatios = activeLinks.ToDictionary(
                l => l.IdWell,
                l => 1 - (l.Lastratio ?? 0)
            );

            // 2. Первая нормализация - сумма всех коэффициентов = 1
            double totalRatios = results.Sum(r => r.CalculatedRatio);
            if (totalRatios > 0)
            {
                foreach (var item in results)
                {
                    item.CalculatedRatio /= totalRatios;
                }
            }

            // 3. Проверяем ограничения для нагнетателей
            bool needReNormalize = false;
            foreach (var item in results)
            {
                if (maxAllowedRatios.TryGetValue(item.InjectorId, out var maxAllowed))
                {
                    if (item.CalculatedRatio > maxAllowed)
                    {
                        item.CalculatedRatio = maxAllowed; // Ограничиваем максимальным значением
                        needReNormalize = true;
                    }
                }
            }

            // 4. Если были изменения - повторно нормализуем
            if (needReNormalize)
            {
                totalRatios = results.Sum(r => r.CalculatedRatio);
                if (totalRatios > 0)
                {
                    foreach (var item in results)
                    {
                        item.CalculatedRatio /= totalRatios;
                    }
                }
            }
        }

        /// <summary>
        /// Класс для хранения результатов расчета CRM
        /// </summary>
        public class CrmRatioResult
        {
            public long? LinkId { get; set; }
            public long? InjectorId { get; set; }
            public string InjectorName { get; set; }
            public double CalculatedRatio { get; set; }
            public double ForecastedRatio { get; set; }
            public List<HistoricalRatio> HistoricalData { get; set; }
        }

        public class HistoricalRatio
        {
            public DateTime? Date { get; set; }
            public double? Ratio { get; set; }
        }

        // ML.NET data models
        public class RatioData
        {
            [LoadColumn(0)]
            public DateTime Date { get; set; }

            [LoadColumn(1)]
            public float Ratio { get; set; }
        }

        public class RatioForecast
        {
            public float[] ForecastedRatios { get; set; }
            public float[] LowerBoundRatios { get; set; }
            public float[] UpperBoundRatios { get; set; }
        }
    }
}