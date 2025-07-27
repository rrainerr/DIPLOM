using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Models;
using System.Linq;
using System.Threading.Tasks;
using Stem = ReactApp1.Server.Models.Stem;
using Well = ReactApp1.Server.Models.Well;

namespace ReactApp1.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class pakerController : ControllerBase
    {
        private readonly PostgresContext _context;

        public pakerController(PostgresContext context)
        {
            _context = context;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddPacker([FromBody] Packer packer)
        {
            if (packer == null)
            {
                return BadRequest("Packer data is null.");
            }

            // Проверяем, существует ли скважина (Well) с указанным IdWell
            var wellExists = await _context.Wells.AnyAsync(w => w.IdWell == packer.IdWell);
            if (!wellExists)
            {
                return BadRequest("Well with the specified IdWell does not exist.");
            }

            // Добавляем новый пакер в контекст
            _context.Packers.Add(packer);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Packer added successfully.", packerId = packer.IdPacker });
        }

        [HttpGet("table")]
        public async Task<ActionResult<IEnumerable<Packer>>> GetPackers(
           [FromQuery] int page = 1,
           [FromQuery] int pageSize = 10,
           [FromQuery] long? wellId = null)
        {
            var query = _context.Packers
                .Include(p => p.IdWellNavigation) // Включаем данные о скважине
                .AsQueryable();

            // Применение фильтра по скважине
            if (wellId.HasValue)
            {
                query = query.Where(p => p.IdWell == wellId.Value);
            }

            var totalRecords = await query.CountAsync();

            var packers = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.IdPacker,
                    p.Name,
                    p.Depth,
                    WellName = p.IdWellNavigation != null ? p.IdWellNavigation.Name : "Нет данных"
                })
                .ToListAsync();

            return Ok(new
            {
                totalRecords,
                packers
            });
        }

        // Получение пакера по ID
        [HttpGet("table/{id}")]
        public async Task<ActionResult<Packer>> GetPacker(long id)
        {
            var packer = await _context.Packers
                .Include(p => p.IdWellNavigation)
                .FirstOrDefaultAsync(p => p.IdPacker == id);

            if (packer == null)
            {
                return NotFound();
            }

            return Ok(packer);
        }
        [HttpPut("table/{id}")]
        public async Task<IActionResult> UpdatePacker(long id, [FromBody] PackerUpdateDto updateDto)
        {
            var packer = await _context.Packers.FindAsync(id);
            if (packer == null)
            {
                return NotFound();
            }

            var well = await _context.Wells.FirstOrDefaultAsync(w => w.IdWell == packer.IdWell);
            if (well == null)
            {
                return BadRequest("Well not found");
            }

            // Get all stems for this well
            var stems = await _context.Stems
                .Where(s => s.IdWell == packer.IdWell)
                .ToListAsync();

            // Update packer depth first
            packer.Depth = updateDto.Depth;

            bool allStemsInactive = true;

            foreach (var stem in stems)
            {
                // Get all points for this specific stem
                var pointsForStem = await _context.Points
                    .Where(p => p.IdStem == stem.IdStem)
                    .ToListAsync();

                bool stemShouldBeActive = false;

                if (pointsForStem.Any())
                {
                    // Check points for this stem
                    foreach (var point in pointsForStem)
                    {
                        if (point.Depth <= updateDto.Depth)
                        {
                            stemShouldBeActive = true;
                            break;
                        }
                    }
                }
                else
                {
                    // If no points, check stem depth directly
                    if (stem.Depth <= updateDto.Depth)
                    {
                        stemShouldBeActive = true;
                    }
                }

                stem.Work = stemShouldBeActive ? 1 : 0;

                if (stem.Work == 1)
                {
                    allStemsInactive = false;
                }
            }

            // Update link status based on all stems
            if (well.IdType == 1)
            {
                var link = await _context.Links.FirstOrDefaultAsync(l => l.IdWell == packer.IdWell);
                if (link != null)
                {
                    link.Status = allStemsInactive ? 0 : 1;
                }
            }
            else if (well.IdType == 2)
            {
                var link = await _context.Links.FirstOrDefaultAsync(l => l.WellLink == packer.IdWell);
                if (link != null)
                {
                    link.Status = allStemsInactive ? 0 : 1;
                }
            }

            try
            {
                await _context.SaveChangesAsync();
                return Ok(packer);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PackerExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
        }
      
        public class PackerUpdateDto
        {
            public double? Depth { get; set; }
        }

        private bool PackerExists(long id)
        {
            return _context.Packers.Any(e => e.IdPacker == id);
        }
    }


}