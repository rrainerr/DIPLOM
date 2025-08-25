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
            var packer = await _context.Packers
                .Include(p => p.IdWellNavigation)
                    .ThenInclude(w => w.Horizonts)
                        .ThenInclude(h => h.Stems)
                .Include(p => p.IdWellNavigation)
                    .ThenInclude(w => w.Stems)
                        .ThenInclude(s => s.Points)
                .FirstOrDefaultAsync(p => p.IdPacker == id);

            if (packer == null)
            {
                return NotFound("Packer not found");
            }

            if (packer.IdWellNavigation == null)
            {
                return BadRequest("Well not found");
            }

            // Сохраняем старую глубину для сравнения
            var oldDepth = packer.Depth;
            packer.Depth = updateDto.Depth;

            var well = packer.IdWellNavigation;
            bool hasActiveHorizonts = false;

            // Обрабатываем все горизонты скважины
            foreach (var horizont in well.Horizonts)
            {
                bool isHorizontActive = false;

                // Проверяем все стволы горизонта
                foreach (var stem in horizont.Stems)
                {
                    bool stemShouldBeActive = false;

                    // Проверяем точки ствола, если они есть
                    if (stem.Points.Any())
                    {
                        foreach (var point in stem.Points)
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
                        // Если точек нет, проверяем глубину ствола
                        if (stem.Depth <= updateDto.Depth)
                        {
                            stemShouldBeActive = true;
                        }
                    }

                    stem.Work = stemShouldBeActive ? 1 : 0;

                    // Если хотя бы один ствол горизонта активен, горизонт активен
                    if (stemShouldBeActive)
                    {
                        isHorizontActive = true;
                    }
                }

                // Обновляем состояние горизонта
                horizont.SostPl = isHorizontActive ? 1 : 0;

                if (isHorizontActive)
                {
                    hasActiveHorizonts = true;
                }
            }

            // Обрабатываем все стволы скважины, не привязанные к горизонтам
            foreach (var stem in well.Stems.Where(s => s.IdHorizont == null))
            {
                bool stemShouldBeActive = false;

                if (stem.Points.Any())
                {
                    foreach (var point in stem.Points)
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
                    if (stem.Depth <= updateDto.Depth)
                    {
                        stemShouldBeActive = true;
                    }
                }

                stem.Work = stemShouldBeActive ? 1 : 0;
            }

            // Обновляем состояние связи (Link) в зависимости от активных горизонтов
            var link = well.IdType == 1
                ? await _context.Links.FirstOrDefaultAsync(l => l.IdWell == well.IdWell)
                : await _context.Links.FirstOrDefaultAsync(l => l.WellLink == well.IdWell);

            if (link != null)
            {
                link.Status = hasActiveHorizonts ? 1 : 0;
            }

            try
            {
                await _context.SaveChangesAsync();

                // Возвращаем обновленные данные пакера
                var result = new
                {
                    packer.IdPacker,
                    packer.Name,
                    packer.Depth,
                    packer.IdWell,
                    WellName = packer.IdWellNavigation?.Name,
                    HasActiveHorizonts = hasActiveHorizonts,
                    LinkStatus = link?.Status
                };

                return Ok(result);
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