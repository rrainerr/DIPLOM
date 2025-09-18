using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using static ReactApp1.Server.Controllers.mapController;
using ReactApp1.Server.Controllers;
using static ReactApp1.Server.Controllers.aesController;

[ApiController]
[Route("api/[controller]")]
public class wellController : ControllerBase
{
    private readonly PostgresContext _context;

    public wellController(PostgresContext context)
    {
        _context = context;
    }

    [HttpGet("add/wellWithoutPacker")]
    public async Task<ActionResult<IEnumerable<Well>>> GetWellsWithoutPackers()
    {
        var wellsWithoutPackers = await _context.Wells
            .Where(w => !_context.Packers.Any(p => p.IdWell == w.IdWell))
            .ToListAsync();

        if (wellsWithoutPackers == null || !wellsWithoutPackers.Any())
        {
            return NotFound("Скважины без пакеров не найдены.");
        }

        return Ok(wellsWithoutPackers);
    }

    [HttpGet("name/{wellId}")]
    public async Task<IActionResult> GetWellName(int wellId)
    {
           var well = await _context.Wells
                .FirstOrDefaultAsync(p => p.IdWell == wellId);

            return Ok(well);
    }

    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<Well>>> GetWell()
    {
        var well = await _context.Wells
        .Where(w => !_context.WellSlants.Any(p => p.IdWell == w.IdWell))
        .ToListAsync();

        if (well == null || !well.Any())
        {
            return NotFound("Скважины без искревления не найдены.");
        }

        return Ok(well);
    }
    [HttpPost("wellslant")]
    public async Task<IActionResult> AddWellSlant([FromBody] List<WellSlant> slantData)
    {
        if (slantData == null || slantData.Count == 0)
        {
            return BadRequest("No data provided");
        }

        try
        {
            await _context.WellSlants.AddRangeAsync(slantData);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Well slant data added successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
    [HttpGet("wellslant/table")]
    public async Task<ActionResult<IEnumerable<WellSlant>>> GetWellSlantTable([FromQuery] long wellId)
    {
        var slantData = await _context.WellSlants
            .Where(ws => ws.IdWell == wellId)
            .OrderBy(ws => ws.Height)
            .ToListAsync();

        if (slantData == null || !slantData.Any())
        {
            return NotFound("Данные о кривизне не найдены");
        }

        return Ok(slantData);
    }

    [HttpGet("add")]
    public async Task<ActionResult<IEnumerable<Well>>> GetWells()
    {
        var wells = await _context.Wells.ToListAsync();

        if (wells == null || !wells.Any())
        {
            return NotFound("Скважины не найдены.");
        }

        return Ok(wells);

    }

    [HttpGet("table")]
    public async Task<ActionResult> GetWells(
  [FromQuery] int page = 1,
  [FromQuery] int pageSize = 10,
  [FromQuery] long? ngdu = null,
  [FromQuery] long? workshop = null)
    {
        var query = _context.Wells
            .Where(w => w.IdType == 2)
            .Include(w => w.IdWorkshopNavigation)
                .ThenInclude(workshop => workshop.IdNgduNavigation)
            .AsQueryable();

        // Применение фильтра по НГДУ
        if (ngdu.HasValue)
        {
            query = query.Where(w => w.IdWorkshopNavigation.IdNgduNavigation.IdNgdu == ngdu.Value);
        }

        // Применение фильтра по цеху
        if (workshop.HasValue)
        {
            query = query.Where(w => w.IdWorkshopNavigation.IdWorkshop == workshop.Value);
        }

        var totalRecords = await query.CountAsync();

        var wells = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(w => new
            {
                w.IdWell,
                w.Name,
                w.Latitude,
                w.Longitude,
                NGDU = w.IdWorkshopNavigation != null && w.IdWorkshopNavigation.IdNgduNavigation != null
                    ? w.IdWorkshopNavigation.IdNgduNavigation.Name
                    : "Нет данных",
                Workshop = w.IdWorkshopNavigation != null ? w.IdWorkshopNavigation.Name : "Нет данных",
            })
            .ToListAsync();

        return Ok(new
        {
            totalRecords,
            wells
        });
    }
    // Метод для получения данных скважин с фильтрацией
    [HttpGet("table/nag")]
    public async Task<ActionResult> GetNag(
      [FromQuery] int page = 1,
      [FromQuery] int pageSize = 10,
      [FromQuery] long? ngdu = null,
      [FromQuery] long? workshop = null)
        {
            var query = _context.Wells
                .Where(w => w.IdType == 1)
                .Include(w => w.IdWorkshopNavigation)
                    .ThenInclude(workshop => workshop.IdNgduNavigation)
                .AsQueryable();

            // Применение фильтра по НГДУ
            if (ngdu.HasValue)
            {
                query = query.Where(w => w.IdWorkshopNavigation.IdNgduNavigation.IdNgdu == ngdu.Value);
            }

            // Применение фильтра по цеху
            if (workshop.HasValue)
            {
                query = query.Where(w => w.IdWorkshopNavigation.IdWorkshop == workshop.Value);
            }

            var totalRecords = await query.CountAsync();

            var wells = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(w => new
                {
                    w.IdWell,
                    w.Name,
                    w.Latitude,
                    w.Longitude,
                    NGDU = w.IdWorkshopNavigation != null && w.IdWorkshopNavigation.IdNgduNavigation != null
                        ? w.IdWorkshopNavigation.IdNgduNavigation.Name
                        : "Нет данных",
                    Workshop = w.IdWorkshopNavigation != null ? w.IdWorkshopNavigation.Name : "Нет данных",

                })
                .ToListAsync();

            return Ok(new
            {
                totalRecords,
                wells
            });
    }
    [HttpGet("map")]
    public async Task<ActionResult<IEnumerable<object>>> GetWellsByWorkshop()
    {
        var wells = await _context.Wells
            .Where(w => w.IdType == 2)
            .ToListAsync();

        return wells.Select(w => new
        {
            w.IdWell,
            w.Name,
            Longitude = SimpleAES.DecryptToDouble(w.Longitude),
            Latitude = SimpleAES.DecryptToDouble(w.Latitude),
            w.IdWorkshop,
            w.IdType,
            w.DrainageRadius,
            w.WellRadius,
        }).ToList();
    }
    [HttpPost("map/add")]
    public async Task<ActionResult<Well>> AddWell([FromBody] AddWellRequest request)
    {
        if (request == null)
            return BadRequest("Некорректные данные");

        var newWell = new Well
        {
            Name = request.Name,
            Longitude = SimpleAES.Encrypt(request.Longitude ?? 0),
            Latitude = SimpleAES.Encrypt(request.Latitude ?? 0),
            IdWorkshop = request.IdWorkshop ?? 0,
            IdType = request.IdType ?? 0,
            DrainageRadius = request.DrainageRadius ?? 0,
            WellRadius = request.WellRadius ?? 0,
        };

        _context.Wells.Add(newWell);
        await _context.SaveChangesAsync();

        if (request.IdType == 1 && request.WellLinks != null && request.WellLinks.Any())
        {
            foreach (var wellLinkId in request.WellLinks)
            {
                var link = new Link
                {
                    IdWell = newWell.IdWell,
                    WellLink = wellLinkId, 
                    Lastratio = 0,
                    Status = 1,
                };

                _context.Links.Add(link);
            }
            await _context.SaveChangesAsync();
        }

        else if (request.WellLink.HasValue)
        {
            var link = new Link
            {
                IdWell = newWell.IdWell,
                WellLink = request.WellLink.Value,
                Lastratio = 0,
                Status = 1,
            };

            _context.Links.Add(link);
            await _context.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetWells), new { id = newWell.IdWell }, newWell);
    }




    [HttpGet("map/point")]
    public async Task<ActionResult<IEnumerable<object>>> GetWellsMap()
    {
        var wells = await _context.Wells
            .Where(p => p.Longitude != null && p.Latitude != null)
            .Include(w => w.Links)
            .ToListAsync();

        if (!wells.Any())
            return NotFound("Скважины не найдены");

        return wells.Select(w => new
        {
            w.IdWell,
            w.Name,
            Longitude = SimpleAES.DecryptToDouble(w.Longitude),
            Latitude = SimpleAES.DecryptToDouble(w.Latitude),
            w.IdWorkshop,
            w.IdType,
            w.DrainageRadius,
            w.WellRadius,
            w.Links
        }).ToList();
    }


    public class AddRatioRequest
    {
        public long IdLink { get; set; }
        public double Ratio { get; set; }
        public long IdUsers { get; set; }
        public long IdWell { get; set; }
    }
    public class LinkedPointRequest
    {
        public string? Name { get; set; }
        public double? Longitude { get; set; }
        public double? Latitude { get; set; }
        public long? IdWorkshop { get; set; }
        public long? IdType { get; set; }
        public double? DrainageRadius { get; set; }
        public double? WellRadius { get; set; }

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
        public List<int> WellLinks { get; set; } = new List<int>();
        public List<long>? LinkedWellIds { get; set; }
        public List<LinkedPointRequest>? LinkedPoints { get; set; }
    }
}