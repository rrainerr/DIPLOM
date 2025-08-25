using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Models; // ���������, ��� ��� ���������� ������������ ���� ��� PostgresContext
using static ReactApp1.Server.Controllers.CrmCalculatorController;

var builder = WebApplication.CreateBuilder(args);

// ��������� ������� � ���������.
builder.Services.AddControllers();
var base64Key = builder.Configuration["Encryption:Base64Key"];
ReactApp1.Server.Controllers.aesController.SimpleAES.Initialize(base64Key);
builder.Services.AddCors(options =>
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()));
builder.Services.AddScoped<AverageWellDataService>();
// ������������ �������� ���� ������
builder.Services.AddDbContext<PostgresContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ��������� Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.Preserve;
        options.JsonSerializerOptions.MaxDepth = 64; // ��������� �������, ���� ��� ����������
    });
var app = builder.Build();

// ���������� ����������� ����� � ������������� �� ���������
app.UseDefaultFiles();
app.UseStaticFiles();

// ��������� ��������� HTTP-��������.
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