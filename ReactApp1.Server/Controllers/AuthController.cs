using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Models;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using BCrypt.Net;

namespace ReactApp1.Server.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly PostgresContext _context;
        private readonly ILogger<AuthController> _logger;

        public AuthController(PostgresContext context, ILogger<AuthController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);

            if (user == null)
            {
                _logger.LogWarning("Попытка входа с неверными данными: {Email}", model.Email);
                return Unauthorized(new { message = "Неверный email или пароль" });
            }

            // Проверка, хеширован ли пароль
            if (!user.Password.StartsWith("$2b$"))
            {
                // Если пароль не хеширован, проверяем его как текст, хешируем и обновляем в базе
                if (user.Password == model.Password)
                {
                    user.Password = BCrypt.Net.BCrypt.HashPassword(model.Password);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Пароль пользователя {Email} обновлен до защищенного формата.", user.Email);
                }
                else
                {
                    _logger.LogWarning("Попытка входа с неверным паролем: {Email}", model.Email);
                    return Unauthorized(new { message = "Неверный email или пароль" });
                }
            }
            else if (!BCrypt.Net.BCrypt.Verify(model.Password, user.Password))
            {
                _logger.LogWarning("Попытка входа с неверными данными: {Email}", model.Email);
                return Unauthorized(new { message = "Неверный email или пароль" });
            }
            user = await _context.Users
            .Include(u => u.IdRoleNavigation) // Загружаем связанную роль
            .FirstOrDefaultAsync(u => u.Email == model.Email);
            _logger.LogInformation("Пользователь {Email} успешно авторизован.", user.Email);
            return Ok(new
            {
                message = "Авторизация успешна",
                user = new
                {
                    user.IdUsers,
                    user.FirstName,
                    user.Surname,
                    user.Email,
                    RoleName = user.IdRoleNavigation.Name // Добавляем название роли
                }
            });
        }
    }

    public class LoginModel
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}
