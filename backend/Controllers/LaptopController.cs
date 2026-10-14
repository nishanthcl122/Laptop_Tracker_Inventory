using System.Threading.Tasks;
using LaptopTracking.Api.Models.DTOs;
using LaptopTracking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LaptopTracking.Api.Controllers;

[ApiController]
[Route("api/laptops")]
public class LaptopController : ControllerBase
{
    private readonly LaptopService _laptopService;

    public LaptopController(LaptopService laptopService)
    {
        _laptopService = laptopService;
    }

    [HttpGet]
    public async Task<IActionResult> GetLaptops([FromQuery] LaptopQueryParameters query, CancellationToken cancellationToken)
    {
        var result = await _laptopService.GetLaptopsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{serialNumber}")]
    public async Task<IActionResult> GetLaptop(string serialNumber, CancellationToken cancellationToken)
    {
        var laptop = await _laptopService.GetLaptopBySerialAsync(serialNumber,cancellationToken);
        if (laptop == null)
        {
            return NotFound(new { success = false, message = $"Laptop '{serialNumber}' not found." });
        }
        return Ok(laptop);
    }

    [HttpGet("{serialNumber}/audit")]
    public async Task<IActionResult> GetAuditHistory(string serialNumber, CancellationToken cancellationToken)
    {
        var audits = await _laptopService.GetLaptopAuditHistoryAsync(serialNumber, cancellationToken);
        return Ok(audits);
    }

    [HttpPut("{serialNumber}")]
    public async Task<IActionResult> UpdateLaptop(string serialNumber, [FromBody] UpdateLaptopRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
        {
            return BadRequest(new { success = false, message = "Serial number is required." });
        }

        if (request == null)
        {
            return BadRequest(new { success = false, message = "Request body is required." });
        }

        var result = await _laptopService.UpdateLaptopStatusAsync(serialNumber, request, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(new { success = false, message = result.Message });
        }

        return Ok(new { success = true, message = result.Message, laptop = result.Laptop });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] LaptopQueryParameters query, CancellationToken cancellationToken)
    {
        var excelBytes = await _laptopService.ExportLaptopsToExcelAsync(query, cancellationToken);
        return File(excelBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"laptops_export_{System.DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx");
    }
}
