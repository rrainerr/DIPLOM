using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class horizontController : ControllerBase
{
    private readonly PostgresContext _context;

    public horizontController(PostgresContext context)
    {
        _context = context;
    }


    // Добавление нового пласта
    [HttpPost]
    public async Task<IActionResult> AddHorizont([FromBody] Horizont horizont)
    {
        if (horizont == null)
        {
            return BadRequest("Horizont data is null.");
        }

        // Проверяем, существует ли поле (Field) с указанным IdField
        var fieldExists = await _context.Fields.AnyAsync(f => f.IdField == horizont.IdField);
        if (!fieldExists)
        {
            return BadRequest("Field with the specified IdField does not exist.");
        }

        // Добавляем новый пласт в контекст
        _context.Horizonts.Add(horizont);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Horizont added successfully.", horizontId = horizont.IdHorizont });
    }

    [HttpPost("horizontStem")]
    public async Task<IActionResult> horizontsStem([FromBody] Horizont packer)
    {
        var Horizonts = await _context.Horizonts.AnyAsync(w => w.IdWell == packer.IdWell);
        return Ok(Horizonts);
    }

    [HttpGet("stem")]
    public async Task<IActionResult> GetHorizontsByWellId([FromQuery] int wellId)
    {
        try
        {
            var horizonts = await _context.Horizonts
                .Where(h => h.IdWell == wellId) // или ваше условие связи
               
                .ToListAsync();

            return Ok(horizonts);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
        }
    }
    // Получение списка пластов
    [HttpGet("add")]
    public async Task<ActionResult<IEnumerable<Horizont>>> GetHorizonts()
    {
        var horizonts = await _context.Horizonts.ToListAsync();

        if (horizonts == null || !horizonts.Any())
        {
            return NotFound("Пласты не найдены.");
        }

        return Ok(horizonts);
    }
    // Метод для получения данных горизонтов с фильтрацией
    [HttpGet("table")]
    public async Task<ActionResult> GetHorizonts(
  [FromQuery] int page = 1,
  [FromQuery] int pageSize = 10,
  [FromQuery] long? fieldId = null,
  [FromQuery] long? wellId = null)
    {
        var query = _context.Horizonts
         .Include(h => h.IdFieldNavigation) // Поле
         .Include(h => h.IdWellNavigation)             // Скважина (навигационное свойство)
         .AsQueryable();

        // Применяем фильтры, если они указаны
        if (fieldId.HasValue)
        {
            query = query.Where(h => h.IdField == fieldId.Value);
        }

        if (wellId.HasValue)
        {
            query = query.Where(h => h.IdWell == wellId.Value); // Фильтр по WellId
        }

        var totalRecords = await query.CountAsync();

        var horizonts = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new
            {
                h.IdHorizont,
                h.Name,
                h.Roof,
                h.Sole,
                h.Porosity,
                FieldName = h.IdFieldNavigation != null ? h.IdFieldNavigation.Name : "Нет данных",
                WellName = h.IdWellNavigation.Name != null ? h.IdWellNavigation.Name : "Нет данных",
            })
            .ToListAsync();

        return Ok(new
        {
            totalRecords,
            horizonts
        });
    }


}