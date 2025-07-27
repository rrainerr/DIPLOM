using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Models;

using Type = ReactApp1.Server.Models.Type;

namespace ReactApp1.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class mapController : ControllerBase
    {
        private readonly PostgresContext _context;
        private readonly ILogger<mapController> _logger;

        public mapController(PostgresContext context, ILogger<mapController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("type")]
        public async Task<ActionResult<IEnumerable<Type>>> GetTypes()
        {
            return await _context.Types.ToListAsync();
        }

        [HttpGet("link")]
        public async Task<IActionResult> GetLinkedWells(long wellId)
        {
            var linkedWells = await _context.Links
                .Where(l => l.Status == 1 && l.WellLink == wellId)
                .Select(l => new
                {
                    l.IdLink,
                    l.IdWellNavigation.Name,
                    l.Lastratio,
                    l.IdWell,
                    Workshop = new
                    {
                        l.IdWellNavigation.IdWorkshopNavigation.Name,
                        Ngdu = new
                        {
                            l.IdWellNavigation.IdWorkshopNavigation.IdNgduNavigation.Name
                        }
                    }
                })
                .ToListAsync();

            return Ok(linkedWells);
        }

        [HttpGet("linkNag")]
        public async Task<IActionResult> GetLinkedWells_nag(long wellId)
        {
            var linkData = await _context.Links
                .Where(l => l.Status == 1 && l.IdWell == wellId)
                .Select(l => new { l.IdLink, l.WellLink, l.Lastratio })
                .ToListAsync();

            var linkedWellIds = linkData.Select(l => l.WellLink).Distinct().ToList();

            var linkedWells = await _context.Wells
                .Where(w => linkedWellIds.Contains(w.IdWell))
                .Select(w => new
                {
                    w.IdWell,
                    w.Name,
                    Workshop = new
                    {
                        w.IdWorkshopNavigation.Name,
                        Ngdu = new
                        {
                            w.IdWorkshopNavigation.IdNgduNavigation.Name
                        }
                    }
                })
                .ToListAsync();

            var result = linkedWells.Select(w => new
            {
                IdLink = linkData.FirstOrDefault(l => l.WellLink == w.IdWell)?.IdLink,
                Lastratio = linkData.FirstOrDefault(l => l.WellLink == w.IdWell)?.Lastratio,
                w.IdWell,
                w.Name,
                w.Workshop
            }).ToList();

            return Ok(result);
        }

        [HttpPost("addMultiple")]
        public async Task<IActionResult> AddMultipleRatios([FromBody] List<AddRatioRequest> requests)
        {
            if (requests == null || !requests.Any())
                return BadRequest(new { error = "Некорректные данные" });

            try
            {
                var groupedRequests = requests.GroupBy(r => r.IdWell);

                foreach (var group in groupedRequests)
                {
                    var currentSum = await _context.Links
                        .Where(l => l.IdWell == group.Key && !group.Select(r => r.IdLink).Contains(l.IdLink))
                        .SumAsync(l => l.Lastratio);

                    var newSum = group.Sum(r => r.Ratio);

                    if (currentSum + newSum > 100)
                        return Ok(new { success = false, error = $"Сумма Ratio для скважины с id {group.Key} превышает 100" });
                }

                foreach (var request in requests)
                {
                    var newMeasuring = new Measuring
                    {
                        IdLink = request.IdLink,
                        Ratio = request.Ratio,
                        IdUsers = request.IdUsers,
                        DateReading = DateTime.Now
                    };
                    _context.Measurings.Add(newMeasuring);

                    var link = await _context.Links.FindAsync(request.IdLink);
                    if (link != null)
                    {
                        link.Lastratio = request.Ratio;
                        _context.Links.Update(link);
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Ratios успешно добавлены и обновлены" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при добавлении Ratio");
                return StatusCode(500, new { success = false, error = "Внутренняя ошибка сервера", details = ex.Message });
            }
        }
    }

    public class AddRatioRequest
    {
        public long IdLink { get; set; }
        public double Ratio { get; set; }
        public long IdUsers { get; set; }
        public long IdWell { get; set; }
    }

    public class AddWellRequest
    {
        public string? Name { get; set; }
        public double? Longitude { get; set; }
        public double? Latitude { get; set; }
        public long? IdWorkshop { get; set; }
        public long? IdType { get; set; }
        public double? DrainageRadius { get; set; }
        public double? WellRadius { get; set; }
        public int? WellLink { get; set; }
        public long? LinkedWellId { get; set; }
        public List<long>? LinkedWellIds { get; set; }
        public List<LinkedPointRequest>? LinkedPoints { get; set; }
    }

    public class LinkedPointRequest
    {
        public string? Name { get; set; }
        public double? Longitude { get; set; }
        public double? Latitude { get; set; }
        public long? IdWorkshop { get; set; }
        public long? IdType { get; set; }
        public double? Debit { get; set; }
        public double? Omissions { get; set; }
        public double? Pressure { get; set; }
    }
}
