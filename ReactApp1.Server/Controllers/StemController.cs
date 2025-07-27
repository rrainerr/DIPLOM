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
    // Получение списка всех стволов
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Stem>>> GetStems(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] long? wellId = null,
        [FromQuery] long? horizontId = null)
    {
        var query = _context.Stems
            .Include(s => s.IdWellNavigation) // Включаем данные о скважине
            .Include(s => s.IdHorizontNavigation) // Включаем данные о горизонте
            .AsQueryable();

        // Применение фильтра по скважине
        if (wellId.HasValue)
        {
            query = query.Where(s => s.IdWell == wellId.Value);
        }

        // Применение фильтра по горизонту
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

    // Получение ствола по ID
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

        // Находим ствол по IdStem
        var stem = await _context.Stems
            .Include(s => s.IdWellNavigation) // Включаем связанную скважину
            .FirstOrDefaultAsync(s => s.IdStem == idStem);

        if (stem == null)
        {
            return BadRequest("Stem with the specified IdStem does not exist.");
        }

        // Убедимся, что точка врезки связана с той же скважиной, что и ствол
        point.IdWell = stem.IdWell;
        point.IdStem = idStem; 
        // Добавляем точку врезки в контекст
        _context.Points.Add(point);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Piercing point added successfully.", pointId = point.IdPoint });
    }
    // Добавление нового ствола
    [HttpPost("add")]
    public async Task<IActionResult> AddStem([FromBody] Stem stem)
    {
        if (stem == null)
        {
            return BadRequest("Stem data is null.");
        }

        // Проверяем, существует ли скважина (Well) с указанным I   dWell
        var well = await _context.Wells
            .Include(w => w.IdTypeNavigation) // Загружаем связанный тип скважины
            .FirstOrDefaultAsync(w => w.IdWell == stem.IdWell);

        if (well == null)
        {
            return BadRequest("Well with the specified IdWell does not exist.");
        }

        // Проверяем, существует ли пласт (Horizont) с указанным IdHorizont
        if (stem.IdHorizont != null)
        {
            var horizontExists = await _context.Horizonts.AnyAsync(h => h.IdHorizont == stem.IdHorizont);
            if (!horizontExists)
            {
                return BadRequest("Horizont with the specified IdHorizont does not exist.");
            }
        }

        // Добавляем новый ствол в контекст
        _context.Stems.Add(stem);
        await _context.SaveChangesAsync();
  

        return Ok(new { message = "Stem added successfully.", stemId = stem.IdStem });
    }
   
}