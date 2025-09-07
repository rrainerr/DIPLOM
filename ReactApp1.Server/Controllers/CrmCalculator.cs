using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.ML;
using Microsoft.ML.Data;
using Microsoft.ML.Transforms.TimeSeries;
using System.Linq.Expressions;

namespace ReactApp1.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CrmCalculatorController : ControllerBase
    {
        private readonly PostgresContext _db;
        private readonly ILogger<CrmCalculatorController> _logger;
        private readonly MLContext _mlContext;
        private readonly AverageWellDataService _avgDataService;

        public CrmCalculatorController(
          PostgresContext db,
          ILogger<CrmCalculatorController> logger,
          AverageWellDataService avgDataService)
        {
            _db = db;
            _logger = logger;
            _mlContext = new MLContext();
            _avgDataService = avgDataService;
        }
        private async Task<(Dictionary<string, double> averages, List<MissingDataRequest> missingData)> ApplyAverageValues(Well well, Horizont horizon)
        {
            var averages = await _avgDataService.GetAverageValuesAsync();
            var missingDataRequests = new List<MissingDataRequest>();

            if (well.DrainageRadius == null || well.DrainageRadius <= 0)
            {
                missingDataRequests.Add(new MissingDataRequest
                {
                    ParameterName = "DrainageRadius",
                    Description = "Радиус дренирования скважины",
                    DefaultValue = averages["DrainageRadius"],
                    IsCritical = true
                });
                well.DrainageRadius = averages["DrainageRadius"];
                _logger.LogInformation($"Using average DrainageRadius: {well.DrainageRadius}");
            }

            if (horizon.Permeability == null || horizon.Permeability <= 0)
            {
                missingDataRequests.Add(new MissingDataRequest
                {
                    ParameterName = "Permeability",
                    Description = "Проницаемость пласта",
                    DefaultValue = averages["Permeability"],
                    IsCritical = true
                });
                horizon.Permeability = averages["Permeability"];
                _logger.LogInformation($"Using average Permeability: {horizon.Permeability}");
            }
            if (horizon.Porosity == null || horizon.Porosity <= 0)
            {
                missingDataRequests.Add(new MissingDataRequest
                {
                    ParameterName = "Porosity",
                    Description = "Пористость пласта",
                    DefaultValue = averages["Porosity"],
                    IsCritical = true
                });
                horizon.Porosity = averages["Porosity"];
                _logger.LogInformation($"Using average Porosity: {horizon.Porosity}");
            }

            if (horizon.Thickness == null || horizon.Thickness <= 0)
            {
                missingDataRequests.Add(new MissingDataRequest
                {
                    ParameterName = "Thickness",
                    Description = "Толщина пласта",
                    DefaultValue = averages["Thickness"],
                    IsCritical = true
                });
                horizon.Thickness = averages["Thickness"];
                _logger.LogInformation($"Using average Thickness: {horizon.Thickness}");
            }

            if (horizon.Viscosity == null || horizon.Viscosity <= 0)
            {
                missingDataRequests.Add(new MissingDataRequest
                {
                    ParameterName = "Viscosity",
                    Description = "Вязкость флюида",
                    DefaultValue = averages["Viscosity"],
                    IsCritical = true
                });
                horizon.Viscosity = averages["Viscosity"];
                _logger.LogInformation($"Using average Viscosity: {horizon.Viscosity}");
            }

            if (horizon.Compressibility == null || horizon.Compressibility <= 0)
            {
                missingDataRequests.Add(new MissingDataRequest
                {
                    ParameterName = "Compressibility",
                    Description = "Сжимаемость пласта",
                    DefaultValue = averages["Compressibility"],
                    IsCritical = true
                });
                horizon.Compressibility = averages["Compressibility"];
                _logger.LogInformation($"Using average Compressibility: {horizon.Compressibility}");
            }


            return (averages, missingDataRequests);
        }

        [HttpGet("ratios/{producerId}")]
        public async Task<ActionResult<CrmCalculationResponse>> CalculateCrmRatiosAsync(int producerId)
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
                var allMissingData = new List<MissingDataRequest>();

                var prodHorizont = producer.Horizonts.FirstOrDefault(h => h.SostPl == 1 || h.SostPl == 3);
                if (prodHorizont == null)
                    return BadRequest("Не найден продуктивный горизонт");

                var (_, prodMissingData) = await ApplyAverageValues(producer, prodHorizont);
                allMissingData.AddRange(prodMissingData.Select(m => new MissingDataRequest
                {
                    ParameterName = m.ParameterName,
                    Description = m.Description,
                    DefaultValue = m.DefaultValue,
                    IsCritical = m.IsCritical,
                    WellId = producerId,
                    WellName = producer.Name ?? "Неизвестно",
                    IsProducer = true
                }));

                var injectorInfo = new Dictionary<long, (string Name, long IdWell)>();

                foreach (var link in activeLinks)
                {
                    var injector = _db.Wells
                        .Include(w => w.Horizonts)
                        .FirstOrDefault(w => w.IdWell == link.IdWell);

                    if (injector == null)
                        continue;

                    injectorInfo[link.IdLink] = (injector.Name ?? "Неизвестно", injector.IdWell);

                    var injHorizont = injector.Horizonts.FirstOrDefault(h => h.SostPl == 1 || h.SostPl == 3);
                    if (injHorizont == null)
                        continue;

                    var (_, injMissingData) = await ApplyAverageValues(injector, injHorizont);
                    allMissingData.AddRange(injMissingData.Select(m => new MissingDataRequest
                    {
                        ParameterName = m.ParameterName,
                        Description = m.Description,
                        DefaultValue = m.DefaultValue,
                        IsCritical = m.IsCritical,
                        WellId = injector.IdWell,
                        WellName = injector.Name,
                        LinkId = link.IdLink,
                        IsProducer = false
                    }));
                }

                foreach (var link in activeLinks)
                {
                    var injector = _db.Wells
                        .Include(w => w.Horizonts)
                        .FirstOrDefault(w => w.IdWell == link.IdWell);


                    double producerRate = latestWellData.TryGetValue(producerId, out var prodData) ? prodData?.Rate ?? 1 : 1;
                    double injectorRate = latestWellData.TryGetValue(injector.IdWell, out var injData) ? injData?.Rate ?? 1 : 1;

                    prodHorizont = producer.Horizonts.FirstOrDefault(h => h.SostPl == 1 || h.SostPl == 3);
                    var injHorizont = _db.Wells
                        .Include(w => w.Horizonts)
                        .FirstOrDefault(w => w.IdWell == injector.IdWell)?
                        .Horizonts.FirstOrDefault(h => h.SostPl == 1 || h.SostPl == 3);

                    if (prodHorizont == null || injHorizont == null)
                        continue;

                    double crmRatio = CalculateCrmRatio(producer,
                       injector, 
                        link, prodHorizont, injHorizont, producerRate, injectorRate);

                    if (link.Lastratio.HasValue && link.Lastratio > 0)
                    {
                        crmRatio = 0.75 * crmRatio + 0.15 * link.Lastratio.Value;
                    }


                    var historicalData = _db.Measurings
                        .Where(m => m.IdLink == link.IdLink)
                        .OrderBy(m => m.DateReading)
                        .ToList();

                    double forecastedRatio = ForecastRatio(historicalData, crmRatio);

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

                NormalizeRatios(results, injectorTotals, activeLinks);
                NormalizeForecastedRatios(results, forecastedTotals, activeLinks);

                var appliedDefaults = allMissingData.Select(m => new AppliedDefaultValue
                {
                    Parameter = m.ParameterName,
                    Value = m.DefaultValue ?? 0,
                    Source = "Среднее значение из БД",
                    WellId = m.IsProducer ? producerId : (int)m.WellId,
                    WellName = m.WellName
                }).ToList();

                return Ok(new CrmCalculationResponse
                {
                    Results = results,
                    AppliedDefaults = appliedDefaults
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка расчета CRM коэффициентов");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        [HttpGet("production/{producerId}")]
        public async Task<IActionResult> CalculateProduction(int producerId)
        {
            try
            {
                var ratiosResponse = await CalculateCrmRatiosAsync(producerId);

                if (ratiosResponse.Result is not OkObjectResult okResult ||
                    okResult.Value is not CrmCalculationResponse crmResponse)
                {
                    return BadRequest("Не удалось получить данные о коэффициентах");
                }
                var productionHistory1 = _db.WellData
                   .Where(w => w.IdWell == producerId)
                   .OrderBy(w => w.Year)
                   .ThenBy(w => w.Month)
                   .Take(24) 
                   .Select(w => new HistoricalProduction
                   {
                       Date = new DateTime((int)(w.Year ?? DateTime.Now.Year),
                                         (int)(w.Month ?? 1), 1),
                       Value = w.Rate ?? 0,
                       Type = "actual"
                   })
                   .ToList();
                var ratios = crmResponse.Results;

                var lastHistoryDate = productionHistory1.Max(h => h.Date);
     
                var monthsToForecast = (DateTime.Now.Year - lastHistoryDate.Year) * 12 + DateTime.Now.Month - lastHistoryDate.Month;

                var forecast = GenerateProductionForecast(productionHistory1, Math.Max(monthsToForecast, 1));

                var producer = _db.Wells
                    .Include(w => w.Horizonts)
                    .FirstOrDefault(w => w.IdWell == producerId);
                if (producer == null) return NotFound("Скважина не найдена");


                var currentProductionData = _db.WellData
                    .Where(w => w.IdWell == producerId)
                    .OrderByDescending(w => w.Year)
                    .ThenByDescending(w => w.Month)
                    .FirstOrDefault();

                var injectorIds = ratios.Select(r => r.InjectorId.Value).ToList();
                var currentInjectionData = _db.Wells
                    .Where(w => injectorIds.Contains(w.IdWell))
                    .Select(w => new {
                        w.IdWell,
                        CurrentInjection = _db.WellData
                            .Where(wd => wd.IdWell == w.IdWell)
                            .OrderByDescending(wd => wd.Year)
                            .ThenByDescending(wd => wd.Month)
                            .FirstOrDefault()
                    })
                    .ToDictionary(
                        x => x.IdWell,
                        x => x.CurrentInjection?.Rate ?? 0
                    );


                var productionHistory = _db.WellData
                    .Where(w => w.IdWell == producerId)
                    .OrderByDescending(w => w.Year)
                    .ThenByDescending(w => w.Month)
                    .Take(12)
                    .ToList();

                var injectionHistory = _db.WellData
                    .Where(w => injectorIds.Contains(w.IdWell.Value))
                    .ToList()
                    .GroupBy(w => w.IdWell)
                    .ToDictionary(
                        g => g.Key,
                        g => g.OrderByDescending(w => w.Year)
                              .ThenByDescending(w => w.Month)
                              .Take(12)
                              .ToList()
                    );


                double tau = CalculateTauParameter(producer);
                var crmRatios = ratios.ToDictionary(r => r.InjectorId.Value, r => r.CalculatedRatio);

                double productionRate = CalculateProductionRate(productionHistory, injectionHistory, crmRatios, tau);

                var injectionRates = ratios.ToDictionary(
                    r => r.InjectorId.Value,
                    r => CalculateInjectionRate(
                        injectionHistory.TryGetValue(r.InjectorId.Value, out var data) ? data : new List<WellDatum>(),
                        r.CalculatedRatio,
                        tau
                    )
                );

                return Ok(new ProductionResult
                {
                    ProducerId = producerId,
                    ProductionRate = productionRate,
                    CurrentProduction = currentProductionData?.Rate ?? 0,
                    InjectionRates = injectionRates,
                    CurrentInjectionRates = currentInjectionData,
                    TimeConstant = tau,
                    ConnectivityFactors = crmRatios,
                    AppliedDefaults = crmResponse.AppliedDefaults,
                    HistoricalProduction = productionHistory1,
                    ForecastedProduction = forecast
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка расчета параметров добычи");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }
        private List<HistoricalProduction> GenerateProductionForecast(List<HistoricalProduction> history, int months)
        {
            if (history.Count < 3) return new List<HistoricalProduction>();

            try
            {
                var dataView = _mlContext.Data.LoadFromEnumerable(
                    history.Select(h => new ProductionData
                    {
                        Date = h.Date,
                        Value = (float)h.Value
                    })
                );

                var forecastingPipeline = _mlContext.Forecasting.ForecastBySsa(
                    outputColumnName: "ForecastedValues",
                    inputColumnName: "Value",
                    windowSize: 3,
                    seriesLength: history.Count,
                    trainSize: history.Count,
                    horizon: months,
                    confidenceLevel: 0.95f);

                var forecaster = forecastingPipeline.Fit(dataView);
                var forecastingEngine = forecaster.CreateTimeSeriesEngine<ProductionData, ProductionForecast>(_mlContext);
                var forecast = forecastingEngine.Predict();

                var result = new List<HistoricalProduction>();
                DateTime lastDate = history.Last().Date;

                for (int i = 0; i < months; i++)
                {
                    result.Add(new HistoricalProduction
                    {
                        Date = lastDate.AddMonths(i + 1),
                        Value = forecast.ForecastedValues[i],
                        Type = "forecast"
                    });
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка генерации прогноза");
                return new List<HistoricalProduction>();
            }
        }
        private double CalculateTauParameter(Well producer)
        {
            try
            {
                var horizon = producer.Horizonts.FirstOrDefault(h => h.SostPl == 1 || h.SostPl == 3);
                if (horizon == null)
                {
                    _logger.LogWarning($"Не найден активный горизонт для скважины {producer.IdWell}");
                    return 1.0;
                }
                ApplyAverageValues(producer, horizon);

                double permeability = horizon.Permeability ?? 0; 
                double thickness = horizon.Thickness ?? 10;
                double porosity = horizon.Porosity ?? 0.2; 
                double viscosity = horizon.Viscosity ?? 1; 
                double compressibility = horizon.Compressibility ?? 1e-5; 

                // Параметры скважины
                double drainageRadius = producer.DrainageRadius ?? 500;
                double wellRadius = producer.WellRadius ?? 0.1;
                double skinFactor = producer.SkinFactors?
                    .OrderByDescending(s => s.Date)
                    .FirstOrDefault()?
                    .SkinFactor1 ?? 0;

              
                double drainageArea = Math.PI * Math.Pow(drainageRadius, 2);
                double V = drainageArea * thickness * porosity;

             
                double J = CalculateProductivityIndex(
                    permeability,
                    thickness,
                    viscosity,
                    drainageRadius,
                    wellRadius,
                    skinFactor);

                double tau = (compressibility * V) / Math.Max(J, 0.001);

                _logger.LogInformation($"Рассчитаны параметры для скв. {producer.IdWell}: V={V:F2} м³, J={J:F2}, τ={tau:F2} дней");
                return tau;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Ошибка расчета τ для скважины {producer.IdWell}");
                return 1.0;
            }
        }

        private double CalculateProductionRate(
            List<WellDatum> productionHistory,
            Dictionary<long?, List<WellDatum>> injectionHistory,
            Dictionary<long, double> crmRatios,
            double tau)
        {
            if (productionHistory.Count == 0) return 0;

            var current = productionHistory.FirstOrDefault();
            var previous = productionHistory.Skip(1).FirstOrDefault();

            if (current == null || previous == null)
                return productionHistory.First().Rate ?? 0;

            double totalWeightedInjection = 0;
            foreach (var injector in injectionHistory)
            {
                if (!crmRatios.TryGetValue(injector.Key.Value, out var fij)) continue;

                var injData = injector.Value.Take(2).ToList();
                if (injData.Count < 2) continue;

                double currentInj = injData[0].Rate ?? 0;
                double prevInj = injData[1].Rate ?? 0;
                double avgInj = (currentInj + prevInj) / 2;

                totalWeightedInjection += fij * avgInj;
            }

            DateTime currentDate = new DateTime((int)(current.Year ?? DateTime.Now.Year),
                                    (int)(current.Month ?? 1), 1);
            DateTime prevDate = new DateTime((int)(previous.Year ?? DateTime.Now.Year),
                                    (int)(previous.Month ?? 1), 1);

            double deltaT = (currentDate - prevDate).TotalDays / 30.0;
            if (deltaT <= 0) deltaT = 1;

            double Q_prev = previous.Rate ?? 0;
            double Q_new = (Q_prev + (totalWeightedInjection * deltaT / tau)) /
                           (1 + deltaT / tau);

            return Q_new;
        }

        private double CalculateInjectionRate(
            List<WellDatum> injectionHistory,
            double fij,
            double tau)
        {
            if (injectionHistory.Count == 0) return 0;

            var current = injectionHistory.FirstOrDefault();
            var previous = injectionHistory.Skip(1).FirstOrDefault();

            if (current == null || previous == null)
                return injectionHistory.First().Rate ?? 0;

            DateTime currentDate = new DateTime((int)(current.Year ?? DateTime.Now.Year),
                                    (int)(current.Month ?? 1), 1);
            DateTime prevDate = new DateTime((int)(previous.Year ?? DateTime.Now.Year),
                                    (int)(previous.Month ?? 1), 1);

            double deltaT = (currentDate - prevDate).TotalDays / 30.0;
            if (deltaT <= 0) deltaT = 1;

            double I_prev = previous.Rate ?? 0;
            double I_current = current.Rate ?? 0;

            double I_new = (I_prev + (fij * I_current * deltaT / tau)) /
                           (1 + deltaT / tau);

            return I_new;
        }

        private double CalculateCrmRatio(Well producer, Well injector, Link link,
                                 Horizont prodHorizont, Horizont injHorizont,
                                 double producerRate, double injectorRate)
        {
            double permeability = prodHorizont.Permeability ?? 0;
            double thickness = prodHorizont.Thickness ?? 0;
            double viscosity = prodHorizont.Viscosity ?? 1;

            double khProducer = permeability * thickness;
            double khInjector = (injHorizont.Permeability ?? 0) * (injHorizont.Thickness ?? 0);

            if (khProducer <= 0 || khInjector <= 0)
                return 0;

            double mobilityRatio = (khProducer / viscosity) / (khInjector / viscosity);
            double distance = CalculateDistance(
                producer.Latitude,
                producer.Longitude,
                injector.Latitude,
                injector.Longitude);

            double rateRatio = injectorRate / (producerRate + 0.0001);

            double skin = producer.SkinFactors?
                .OrderByDescending(s => s.Date)
                .FirstOrDefault()?.SkinFactor1 ?? 0;

            double drainageRadius = producer.DrainageRadius ?? 500;
            double wellRadius = producer.WellRadius ?? 0.1;

            double J = CalculateProductivityIndex(
                permeability, thickness, viscosity,
                drainageRadius, wellRadius, skin);

            double crmRatio = (khInjector * rateRatio) / (distance * distance * mobilityRatio * J);

            return Math.Clamp(crmRatio, 0, 1);
        }

        private double CalculateDistance(string lat1, string lon1, string lat2, string lon2)
        {
            double? decLat1 = aesController.SimpleAES.DecryptToDouble(lat1);
            double? decLon1 = aesController.SimpleAES.DecryptToDouble(lon1);
            double? decLat2 = aesController.SimpleAES.DecryptToDouble(lat2);
            double? decLon2 = aesController.SimpleAES.DecryptToDouble(lon2);

            if (!decLat1.HasValue || !decLon1.HasValue || !decLat2.HasValue || !decLon2.HasValue)
                return 0;

            const double R = 6371;
            var dLat = ToRadians(decLat2.Value - decLat1.Value);
            var dLon = ToRadians(decLon2.Value - decLon1.Value);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(decLat1.Value)) * Math.Cos(ToRadians(decLat2.Value)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c * 1000;
        }

        private double ToRadians(double angle) => Math.PI * angle / 180.0;

        private double CalculateProductivityIndex(double permeability, double thickness, double viscosity,
                                              double drainageRadius, double wellRadius, double skinFactor)
        {
            return (2 * Math.PI * permeability * thickness) /
                   (viscosity * (Math.Log(drainageRadius / wellRadius) + skinFactor)) * 0.008527;
        }

        private void NormalizeRatios(List<CrmRatioResult> results, Dictionary<long, double> injectorTotals, List<Link> activeLinks)
        {
            if (!results.Any()) return;

            var maxAllowedRatios = activeLinks.ToDictionary(
                l => l.IdWell,
                l => 1 - (l.Lastratio ?? 0)
            );

            double totalRatios = results.Sum(r => r.CalculatedRatio);
            if (totalRatios > 0)
            {
                foreach (var item in results)
                {
                    item.CalculatedRatio /= totalRatios;
                }
            }

            bool needReNormalize = false;
            foreach (var item in results)
            {
                if (maxAllowedRatios.TryGetValue(item.InjectorId, out var maxAllowed))
                {
                    if (item.CalculatedRatio > maxAllowed)
                    {
                        item.CalculatedRatio = maxAllowed;
                        needReNormalize = true;
                    }
                }
            }

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

       private void NormalizeForecastedRatios(List<CrmRatioResult> results,
                                       Dictionary<long, double> forecastedTotals,
                                       List<Link> activeLinks)
        {
            if (!results.Any()) return;

            var forecasts = new Dictionary<long, (double value, double weight)>();

            foreach (var item in results)
            {
                if (!item.InjectorId.HasValue) continue;

                double forecastValue;
                double confidenceWeight = 1.0;

                if (item.HistoricalData?.Count >= 3)
                {
                    var history = item.HistoricalData
                        .Where(h => h.Date.HasValue && h.Ratio.HasValue)
                        .OrderBy(h => h.Date)
                        .Select(h => h.Ratio.Value)
                        .ToList();

                    double sma = history.TakeLast(3).Average();
                    double trend = CalculateLinearTrend(history);
                    forecastValue = (sma * 0.3 + trend * 0.7);
                    confidenceWeight = 1.5;
                }
                else
                {
                    forecastValue = item.CalculatedRatio;
                    confidenceWeight = 0.8;
                }

                double minChange = item.CalculatedRatio * 0.05;
                if (Math.Abs(forecastValue - item.CalculatedRatio) < minChange)
                {
                    forecastValue = forecastValue > item.CalculatedRatio
                        ? item.CalculatedRatio + minChange
                        : item.CalculatedRatio - minChange;
                }

                forecasts[item.InjectorId.Value] = (forecastValue, confidenceWeight);
            }

            double totalWeighted = forecasts.Sum(f => f.Value.value * f.Value.weight);
            if (totalWeighted <= 0) return;

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

            if (totalAfterLimits > 0)
            {
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

                double finalSum = limitedForecasts.Sum(f => f.Value);
                foreach (var key in limitedForecasts.Keys.ToList())
                {
                    limitedForecasts[key] /= finalSum;
                }
            }

            foreach (var item in results)
            {
                if (item.InjectorId.HasValue && limitedForecasts.TryGetValue(item.InjectorId.Value, out var value))
                {
                    item.ForecastedRatio = value;
                }
            }
        }

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
            return history.Last() + slope;
        }

        private double ForecastRatio(List<Measuring> historicalData, double currentRatio)
        {
            if (historicalData.Count < 5) return currentRatio;

            try
            {
                var dataView = _mlContext.Data.LoadFromEnumerable(
                    historicalData.Select(h => new RatioData
                    {
                        Date = h.DateReading.Value,
                        Ratio = (float)(h.Ratio ?? 0)
                    })
                );

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

                var forecaster = forecastingPipeline.Fit(dataView);
                var forecastingEngine = forecaster.CreateTimeSeriesEngine<RatioData, RatioForecast>(_mlContext);
                var forecast = forecastingEngine.Predict();

                return forecast.ForecastedRatios[0];
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка прогнозирования CRM коэффициента");
                return currentRatio;
            }
        }
        public class AverageWellDataService
        {
            private readonly ILogger<CrmCalculatorController> _logger;
            private readonly PostgresContext _db;

            public AverageWellDataService(PostgresContext db, ILogger<CrmCalculatorController> logger)
            {
                _db = db;
                _logger = logger;
            }

            public async Task<Dictionary<string, double>> GetAverageValuesAsync()
            {
                try
                {

                    if (!await _db.Database.CanConnectAsync())
                    {
                        _logger.LogWarning("Нет подключения к БД, используются значения по умолчанию");
                        return GetDefaultValues();
                    }

                    var averages = new Dictionary<string, double>();

                    averages["Porosity"] = await GetSafeAverageAsync(
                        _db.Horizonts.Where(h => h.Porosity != null),
                        h => h.Porosity,
                        0.15);

            
                    averages["Thickness"] = await GetSafeAverageAsync(
                        _db.Horizonts.Where(h => h.Thickness != null),
                        h => h.Thickness,
                        10);

                
                    averages["Viscosity"] = await GetSafeAverageAsync(
                        _db.Horizonts.Where(h => h.Viscosity != null),
                        h => h.Viscosity,
                        1);

             
                    averages["Permeability"] = await GetSafeAverageAsync(
                        _db.Horizonts.Where(h => h.Permeability != null),
                        h => h.Permeability,
                        100);

                
                    averages["Compressibility"] = await GetSafeAverageAsync(
                        _db.Horizonts.Where(h => h.Compressibility != null),
                        h => h.Compressibility,
                        0.0005);

                    
                    averages["DrainageRadius"] = await GetSafeAverageAsync(
                        _db.Wells.Where(w => w.DrainageRadius != null),
                        w => w.DrainageRadius,
                        500);

           
                    averages["WellRadius"] = await GetSafeAverageAsync(
                        _db.Wells.Where(w => w.WellRadius != null),
                        w => w.WellRadius,
                        0.1);

                    averages["SkinFactor"] = await GetSafeAverageAsync(
                        _db.SkinFactors.Where(s => s.SkinFactor1 != null),
                        s => s.SkinFactor1,
                        0);

                    return averages;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Ошибка при расчете средних значений");
                    return GetDefaultValues();
                }
            }

            private Dictionary<string, double> GetDefaultValues()
            {
                return new Dictionary<string, double>
                {
                    ["Porosity"] = 0.15,
                    ["Thickness"] = 10,
                    ["Viscosity"] = 1,
                    ["Permeability"] = 100,
                    ["Compressibility"] = 0.0005,
                    ["DrainageRadius"] = 500,
                    ["WellRadius"] = 0.1,
                    ["SkinFactor"] = 0
                };
            }
            private async Task<double> GetSafeAverageAsync<T>(IQueryable<T> query, Expression<Func<T, double?>> selector, double defaultValue)
            {
                try
                {
                    if (!await query.AnyAsync())
                        return defaultValue;

                    var avg = await query.AverageAsync(selector);
                    return avg ?? defaultValue;
                }
                catch
                {
                    return defaultValue;
                }
            }
        }
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

        public class ProductionResult
        {
            public int ProducerId { get; set; }
            public double ProductionRate { get; set; }  
            public double CurrentProduction { get; set; } 
            public Dictionary<long, double> InjectionRates { get; set; } 
            public Dictionary<long, double> CurrentInjectionRates { get; set; } 
            public double TimeConstant { get; set; }
            public Dictionary<long, double> ConnectivityFactors { get; set; }
            public List<AppliedDefaultValue> AppliedDefaults { get; set; }
            public List<HistoricalProduction> HistoricalProduction { get; set; }
            public List<HistoricalProduction> ForecastedProduction { get; set; }

        }
        public class HistoricalProduction
        {
            public DateTime Date { get; set; }
            public double Value { get; set; }
            public string Type { get; set; } 
        }
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
        public class ProductionData
{
    [LoadColumn(0)]
    public DateTime Date { get; set; }

    [LoadColumn(1)]
    public float Value { get; set; }
}

public class ProductionForecast
{
    public float[] ForecastedValues { get; set; }
}
        public class MissingDataRequest
        {
            public string ParameterName { get; set; }
            public string Description { get; set; }
            public double? DefaultValue { get; set; }
            public bool IsCritical { get; set; }
            public long? WellId { get; set; }
            public string WellName { get; set; }
            public long? LinkId { get; set; }
            public bool IsProducer { get; set; }
        }

        public class AppliedDefaultValue
        {
            public string Parameter { get; set; }
            public double Value { get; set; }
            public string Source { get; set; }
            public int WellId { get; set; }
            public string WellName { get; set; }
        }

        public class CrmCalculationResponse
        {
            public List<CrmRatioResult> Results { get; set; }
            public List<AppliedDefaultValue> AppliedDefaults { get; set; }
        }
    }
}