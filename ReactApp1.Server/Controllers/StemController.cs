using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class stemController : ControllerBase
{
    private readonly PostgresContext _context;

    public stemController(PostgresContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Stem>>> GetStems(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] long? wellId = null,
        [FromQuery] long? horizontId = null)
    {
        var query = _context.Stems
            .Include(s => s.IdWellNavigation) 
            .Include(s => s.IdHorizontNavigation) 
            .AsQueryable();


        if (wellId.HasValue)
        {
            query = query.Where(s => s.IdWell == wellId.Value);
        }

        if (horizontId.HasValue)
        {
            query = query.Where(s => s.IdHorizont == horizontId.Value);
        }

        var totalRecords = await query.CountAsync();

        var stems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.IdStem,
                s.Name,
                s.Depth,
                s.Work,
                WellName = s.IdWellNavigation != null ? s.IdWellNavigation.Name : "Нет данных",
                HorizontName = s.IdHorizontNavigation != null ? s.IdHorizontNavigation.Name : "Нет данных"
            })
            .ToListAsync();

        return Ok(new
        {
            totalRecords,
            stems
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Stem>> GetStem(long id)
    {
        var stem = await _context.Stems
            .Include(s => s.IdWellNavigation)
            .Include(s => s.IdHorizontNavigation)
            .FirstOrDefaultAsync(s => s.IdStem == id);

        if (stem == null)
        {
            return NotFound();
        }

        return Ok(stem);
    }

    [HttpPost("{idStem}/point")]
    public async Task<IActionResult> AddPiercingPoint(long idStem, [FromBody] Point point)
    {
        if (point == null)
        {
            return BadRequest("Point data is null.");
        }

        var stem = await _context.Stems
            .Include(s => s.IdWellNavigation) 
            .FirstOrDefaultAsync(s => s.IdStem == idStem);

        if (stem == null)
        {
            return BadRequest("Stem with the specified IdStem does not exist.");
        }

        point.IdWell = stem.IdWell;
        point.IdStem = idStem; 

        _context.Points.Add(point);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Piercing point added successfully.", pointId = point.IdPoint });
    }

    [HttpPost("add")]
    public async Task<IActionResult> AddStem([FromBody] Stem stem)
    {
        if (stem == null)
        {
            return BadRequest("Stem data is null.");
        }

        var well = await _context.Wells
            .Include(w => w.IdTypeNavigation) 
            .FirstOrDefaultAsync(w => w.IdWell == stem.IdWell);

        if (well == null)
        {
            return BadRequest("Well with the specified IdWell does not exist.");
        }

        if (stem.IdHorizont != null)
        {
            var horizontExists = await _context.Horizonts.AnyAsync(h => h.IdHorizont == stem.IdHorizont);
            if (!horizontExists)
            {
                return BadRequest("Horizont with the specified IdHorizont does not exist.");
            }
        }

        _context.Stems.Add(stem);
        await _context.SaveChangesAsync();
  

        return Ok(new { message = "Stem added successfully.", stemId = stem.IdStem });
    }
   
}