using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class ngduController : ControllerBase
{
    private readonly PostgresContext _context;

    public ngduController(PostgresContext context)
    {
        _context = context;
    }


    // Получение списка НГДУ
    [HttpGet("add")]
    public async Task<IActionResult> GetNgdus()
    {
        var ngdus = await _context.Ngdus.ToListAsync();
        return Ok(ngdus);
    }
    // Метод для получения списка НГДУ
    [HttpGet("table")]
    public async Task<ActionResult> GetNgduList()
    {
        var ngduList = await _context.Ngdus
            .Select(n => new
            {
                n.IdNgdu,
                n.Name
            })
            .ToListAsync();

        return Ok(ngduList); // Возвращаем массив без $id и $values
    }
    // Добавление нового НГДУ
    [HttpPost("add/ngdu")]
    public async Task<IActionResult> AddNgdu([FromBody] Ngdu ngdu)
    {
        if (ngdu == null)
        {
            return BadRequest("Ngdu data is null.");
        }

        _context.Ngdus.Add(ngdu);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Ngdu added successfully.", ngduId = ngdu.IdNgdu });
    }


    // Редактирование НГДУ
    [HttpPut("add/{id}")]
    public async Task<IActionResult> UpdateNgdu(long id, [FromBody] Ngdu ngdu)
    {
        try
        {
            Console.WriteLine($"Received ID: {id}, Type: {id.GetType()}"); // Логируем ID и его тип
            Console.WriteLine($"Received data: {JsonSerializer.Serialize(ngdu)}"); // Логируем данные

            if (ngdu == null || id != ngdu.IdNgdu)
            {
                return BadRequest("Invalid data.");
            }

            var existingNgdu = await _context.Ngdus.FindAsync(id);
            if (existingNgdu == null)
            {
                return NotFound("Ngdu not found.");
            }

            // Обновляем данные
            existingNgdu.Name = ngdu.Name;

            _context.Ngdus.Update(existingNgdu);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Ngdu updated successfully.", ngduId = existingNgdu.IdNgdu });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error", details = ex.Message });
        }
    }

    // Удаление НГДУ
    [HttpDelete("add/{id}")]
    public async Task<IActionResult> DeleteNgdu(long id)
    {
        try
        {
            // Находим Ngdu по id
            var ngdu = await _context.Ngdus
                .Include(n => n.Workshops) // Включаем связанные Workshop
                .FirstOrDefaultAsync(n => n.IdNgdu == id);

            if (ngdu == null)
            {
                return NotFound("Ngdu not found.");
            }

            // Устанавливаем IdNgdu в null для всех связанных Workshop
            foreach (var workshop in ngdu.Workshops)
            {
                workshop.IdNgdu = null;
            }

            // Удаляем Ngdu
            _context.Ngdus.Remove(ngdu);

            // Сохраняем изменения в базе данных
            await _context.SaveChangesAsync();

            return Ok(new { message = "Ngdu deleted successfully.", ngduId = id });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error", details = ex.Message });
        }
    }
}