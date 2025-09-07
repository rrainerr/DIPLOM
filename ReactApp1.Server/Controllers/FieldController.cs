using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class fieldController : ControllerBase
{
    private readonly PostgresContext _context;

    public fieldController(PostgresContext context)
    {
        _context = context;
    }


    [HttpGet]
    public async Task<IActionResult> GetFields()
    {
        var fields = await _context.Fields.ToListAsync();
        return Ok(fields);
    }



    [HttpPost("add")]
    public async Task<IActionResult> AddField([FromBody] Field field)
    {
        if (field == null)
        {
            return BadRequest("Field data is null.");
        }

        _context.Fields.Add(field);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Field added successfully.", fieldId = field.IdField });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateField(long id, [FromBody] Field field)
    {
        try
        {
            Console.WriteLine($"Received ID: {id}, Type: {id.GetType()}"); 
            Console.WriteLine($"Received data: {JsonSerializer.Serialize(field)}"); 

            if (field == null || id != field.IdField)
            {
                return BadRequest("Invalid data.");
            }

            var existingField = await _context.Fields.FindAsync(id);
            if (existingField == null)
            {
                return NotFound("Field not found.");
            }

            // Обновляем данные
            existingField.Name = field.Name;

            _context.Fields.Update(existingField);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Field updated successfully.", fieldId = existingField.IdField });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error", details = ex.Message });
        }
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteField(long id)
    {
        try
        {
            var field = await _context.Fields.FindAsync(id);
            if (field == null)
            {
                return NotFound("Field not found.");
            }

            _context.Fields.Remove(field);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Field deleted successfully.", fieldId = id });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error", details = ex.Message });
        }
    }

}