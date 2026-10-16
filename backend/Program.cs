using System.Text.Json.Serialization;
using LaptopTracking.Api.Data;
using LaptopTracking.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add Database Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<LaptopDbContext>(options =>
    options.UseSqlServer(connectionString));

// Register Domain Services
builder.Services.AddScoped<ExcelParserService>();
builder.Services.AddScoped<ComparisonEngine>();
builder.Services.AddScoped<ImportService>();
builder.Services.AddScoped<LaptopService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<BatchService>();
builder.Services.AddScoped<RasReconciliationService>();
builder.Services.AddScoped<RasImportService>();
builder.Services.AddScoped<ActualInventoryService>();

// Add Controllers with JSON formatting
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// CORS for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Ensure Database schema is created on SQLEXPRESS
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LaptopDbContext>();
    try
    {
        db.Database.EnsureCreated();
        db.Database.ExecuteSqlRaw("""
            IF OBJECT_ID(N'dbo.ActualInventoryUploads', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.ActualInventoryUploads (
                    BatchId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_ActualInventoryUploads PRIMARY KEY,
                    SnapshotDate date NOT NULL,
                    FileName nvarchar(255) NOT NULL,
                    UploadedAt datetimeoffset NOT NULL
                );
                CREATE INDEX IX_ActualInventoryUploads_UploadedAt ON dbo.ActualInventoryUploads (UploadedAt);
            END;

            IF OBJECT_ID(N'dbo.ActualInventoryRows', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.ActualInventoryRows (
                    Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_ActualInventoryRows PRIMARY KEY,
                    BatchId int NOT NULL,
                    SnapshotDate date NOT NULL,
                    FbrId nvarchar(100) NOT NULL,
                    PoNumber nvarchar(100) NOT NULL,
                    Location nvarchar(150) NOT NULL,
                    SystemStockFromFile int NOT NULL,
                    ActualStock int NOT NULL,
                    UploadedAt datetimeoffset NOT NULL,
                    CONSTRAINT FK_ActualInventoryRows_ActualInventoryUploads_BatchId
                        FOREIGN KEY (BatchId) REFERENCES dbo.ActualInventoryUploads (BatchId) ON DELETE CASCADE
                );
                CREATE INDEX IX_ActualInventoryRows_BatchId ON dbo.ActualInventoryRows (BatchId);
                CREATE INDEX IX_ActualInventoryRows_Location ON dbo.ActualInventoryRows (Location);
            END;
            """);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Error initializing database.");
    }
}

app.UseCors("AllowAll");

app.MapControllers();

app.Run();
