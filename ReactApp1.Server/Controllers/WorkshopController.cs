using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class workshopController : ControllerBase
{
    private readonly PostgresContext _context;

    public workshopController(PostgresContext context)
    {
        _context = context;
    }

    // Получение списка цехов
    [HttpGet]
    public async Task<IActionResult> GetWorkshops()
    {
        var workshops = await _context.Workshops
            .Include(w => w.IdNgduNavigation) // Включаем связанное НГДУ
            .Include(w => w.IdTypeNavigation) // Включаем связанный тип
            .Select(w => new
            {
                w.IdWorkshop,
                w.Name,
                w.IdType,
                NgduName = w.IdNgduNavigation.Name, // Название НГДУ
                TypeName = w.IdTypeNavigation.Name // Название типа
            })
            .ToListAsync();

        return Ok(workshops);
    }
    [HttpGet("table")]
    public async Task<ActionResult> GetWorkshopList([FromQuery] long ngduId)
    {
        var workshopList = await _context.Workshops
            .Where(w => w.IdNgduNavigation.IdNgdu == ngduId)
            .Select(w => new
            {
                w.IdWorkshop,
                w.Name,
                w.IdNgdu,
                w.IdType
            })
            .ToListAsync();

        return Ok(workshopList); // Возвращаем массив без $id и $values
    }

    // Добавление нового цеха
    [HttpPost("add")]
    public async Task<IActionResult> AddWorkshop([FromBody] Workshop workshop)
    {
        if (workshop == null)
        {
            return BadRequest("Workshop data is null.");
        }

        // Логируем полученные данные
        Console.WriteLine($"Received workshop data: {JsonSerializer.Serialize(workshop)}");

        // Убедитесь, что навигационные свойства не передаются с клиента
        workshop.IdNgduNavigation = null;
        workshop.IdTypeNavigation = null;
        workshop.Users = null;
        workshop.Wells = null;

        _context.Workshops.Add(workshop);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Workshop added successfully.", workshopId = workshop.IdWorkshop });
    }

    // Редактирование цеха
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateWorkshop(long id, [FromBody] WorkshopUpdateDto workshopDto)
    {
        try
        {
            Console.WriteLine($"Received ID: {id}, Type: {id.GetType()}");
            Console.WriteLine($"Received data: {JsonSerializer.Serialize(workshopDto)}");

            if (workshopDto == null || id != workshopDto.IdWorkshop)
            {
                return BadRequest("Invalid data.");
            }

            var existingWorkshop = await _context.Workshops.FindAsync(id);
            if (existingWorkshop == null)
            {
                return NotFound("Workshop not found.");
            }

            existingWorkshop.Name = workshopDto.Name;
            existingWorkshop.IdNgdu = workshopDto.IdNgdu;
            existingWorkshop.IdType = workshopDto.IdType;

            _context.Workshops.Update(existingWorkshop);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Workshop updated successfully.", workshopId = existingWorkshop.IdWorkshop });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error", details = ex.Message });
        }
    }

    // Удаление цеха
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWorkshop(long id)
    {
        try
        {
            var workshop = await _context.Workshops.FindAsync(id);
            if (workshop == null)
            {
                return NotFound("Workshop not found.");
            }

            _context.Workshops.Remove(workshop);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Workshop deleted successfully.", workshopId = id });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error", details = ex.Message });
        }
    }
    public class WorkshopUpdateDto
    {
        public long IdWorkshop { get; set; }
        public string Name { get; set; }
        public long IdNgdu { get; set; }
        public long IdType { get; set; }
    }
}