using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Models; // Убедитесь, что это правильное пространство имен для PostgresContext
using static ReactApp1.Server.Controllers.CrmCalculatorController;

var builder = WebApplication.CreateBuilder(args);

// Добавляем сервисы в контейнер.
builder.Services.AddControllers();
var base64Key = builder.Configuration["Encryption:Base64Key"];
ReactApp1.Server.Controllers.aesController.SimpleAES.Initialize(base64Key);
builder.Services.AddCors(options =>
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()));
builder.Services.AddScoped<AverageWellDataService>();
// Регистрируем контекст базы данных
builder.Services.AddDbContext<PostgresContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Настройка Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.Preserve;
        options.JsonSerializerOptions.MaxDepth = 64; // Увеличьте глубину, если это необходимо
    });
var app = builder.Build();

// Используем статические файлы и маршрутизацию по умолчанию
app.UseDefaultFiles();
app.UseStaticFiles();

// Настройка конвейера HTTP-запросов.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.UseCors("AllowAll");

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();