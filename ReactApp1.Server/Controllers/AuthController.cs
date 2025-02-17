using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Models;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

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

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == model.Email && u.Password == model.Password);

            if (user == null)
            {
                _logger.LogWarning("Попытка входа с неверными данными: {Email}", model.Email);
                return Unauthorized(new { message = "Неверный email или пароль" });
            }

            _logger.LogInformation("Пользователь {Email} успешно авторизован.", user.Email);
            return Ok(new { message = "Авторизация успешна", user });
        }

    }

    public class LoginModel
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}