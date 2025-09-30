using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Models;
using System.ComponentModel.DataAnnotations;
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


    [HttpPost]
    public async Task<IActionResult> AddHorizont([FromBody] Horizont horizont)
    {
        if (horizont == null)
        {
            return BadRequest("Horizont data is null.");
        }

        var fieldExists = await _context.Fields.AnyAsync(f => f.IdField == horizont.IdField);
        if (!fieldExists)
        {
            return BadRequest("Field with the specified IdField does not exist.");
        }


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
                .Where(h => h.IdWell == wellId) 
               
                .ToListAsync();

            return Ok(horizonts);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
        }
    }

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
    [HttpPost("import")]
    public async Task<IActionResult> ImportHorizonts([FromBody] ImportHorizontsRequest request)
    {
        if (request == null || request.Horizonts == null || !request.Horizonts.Any())
        {
            return BadRequest("No data provided for import.");
        }

        // Проверяем существование скважины
        var wellExists = await _context.Wells.AnyAsync(w => w.IdWell == request.WellId);
        if (!wellExists)
        {
            return BadRequest("Well with the specified Id does not exist.");
        }

        // Проверяем существование поля
        var fieldExists = await _context.Fields.AnyAsync(f => f.IdField == request.FieldId);
        if (!fieldExists)
        {
            return BadRequest("Field with the specified Id does not exist.");
        }

        var importedCount = 0;
        var errors = new List<string>();

        foreach (var horizontData in request.Horizonts)
        {
            try
            {
                // Валидация обязательных полей
                if (string.IsNullOrWhiteSpace(horizontData.Name))
                {
                    errors.Add($"Record {importedCount + 1}: Name is required");
                    continue;
                }

                var horizont = new Horizont
                {
                    IdField = request.FieldId,
                    IdWell = request.WellId,
                    Roof = horizontData.Roof,
                    Sole = horizontData.Sole,
                    Name = horizontData.Name.Trim(),
                    Porosity = horizontData.Porosity,
                    Thickness = horizontData.Thickness,
                    Viscosity = horizontData.Viscosity,
                    Permeability = horizontData.Permeability,
                    Compressibility = horizontData.Compressibility,
                    SostPl = horizontData.SostPl ?? 0
                };

                // Дополнительная валидация
                if (horizont.Roof.HasValue && horizont.Sole.HasValue && horizont.Roof >= horizont.Sole)
                {
                    errors.Add($"Record '{horizont.Name}': Roof ({horizont.Roof}) must be less than Sole ({horizont.Sole})");
                    continue;
                }

                _context.Horizonts.Add(horizont);
                importedCount++;
            }
            catch (Exception ex)
            {
                errors.Add($"Error importing horizont '{horizontData.Name}': {ex.Message}");
            }
        }

        if (importedCount > 0)
        {
            await _context.SaveChangesAsync();
        }

        var result = new
        {
            importedCount,
            totalCount = request.Horizonts.Count(),
            errors
        };

        return Ok(result);
    }

    [HttpGet("table")]
    public async Task<ActionResult> GetHorizonts(
  [FromQuery] int page = 1,
  [FromQuery] int pageSize = 10,
  [FromQuery] long? fieldId = null,
  [FromQuery] long? wellId = null)
    {
        var query = _context.Horizonts
         .Include(h => h.IdFieldNavigation) 
         .Include(h => h.IdWellNavigation)             
         .AsQueryable();

 
        if (fieldId.HasValue)
        {
            query = query.Where(h => h.IdField == fieldId.Value);
        }

        if (wellId.HasValue)
        {
            query = query.Where(h => h.IdWell == wellId.Value); 
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

    public class ImportHorizontsRequest
    {
        [Required]
        public long WellId { get; set; }

        [Required]
        public long FieldId { get; set; }

        [Required]
        [MinLength(1)]
        public List<HorizontImportData> Horizonts { get; set; } = new List<HorizontImportData>();
    }

    public class HorizontImportData
    {
        public double? Roof { get; set; }

        public double? Sole { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public double? Porosity { get; set; }

        public double? Thickness { get; set; }

        public double? Viscosity { get; set; }

        public double? Permeability { get; set; }

        public double? Compressibility { get; set; }

        public long? SostPl { get; set; }
    }

}