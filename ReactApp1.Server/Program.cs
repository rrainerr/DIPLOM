using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Models; // ���������, ��� ��� ���������� ������������ ���� ��� PostgresContext

var builder = WebApplication.CreateBuilder(args);

// ��������� ������� � ���������.
builder.Services.AddControllers();

// ������������ �������� ���� ������
builder.Services.AddDbContext<PostgresContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ��������� Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();