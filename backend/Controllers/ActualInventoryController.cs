using LaptopTracking.Api.Helpers;
using LaptopTracking.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LaptopTracking.Api.Controllers;

[ApiController]
[Route("api/actual-inventory")]
public class ActualInventoryController : ControllerBase
{
    private const long MaxFileSize = 10 * 1024 * 1024;
    private readonly ActualInventoryService _actualInventoryService;
    private readonly ILogger<ActualInventoryController> _logger;

    public ActualInventoryController(
        ActualInventoryService actualInventoryService,
        ILogger<ActualInventoryController> logger)
    {
        _actualInventoryService = actualInventoryService;
        _logger = logger;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSize)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile? file,
        [FromForm] string? snapshotDate,
        CancellationToken cancellationToken)
    {
        var validation = FileUploadValidator.Validate(file);
        if (!validation.IsValid)
        {
            return BadRequest(new { success = false, message = validation.ErrorMessage });
        }

        if (file!.Length > MaxFileSize)
        {
            return BadRequest(new { success = false, message = "The uploaded file exceeds the maximum allowed size." });
        }

        if (string.IsNullOrWhiteSpace(snapshotDate) || !DateOnly.TryParse(snapshotDate, out var parsedDate))
        {
            return BadRequest(new { success = false, message = "A valid business snapshot date is required." });
        }

        try
        {
            return Ok(await _actualInventoryService.UploadAsync(file, parsedDate, cancellationToken));
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(new { success = false, message = exception.Message });
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Actual inventory upload failed");
            return StatusCode(500, new { success = false, message = "The actual inventory file could not be uploaded." });
        }
    }

    [HttpGet("location-summary")]
    public async Task<IActionResult> GetLocationSummary(CancellationToken cancellationToken)
    {
        var summary = await _actualInventoryService.GetLocationSummaryAsync(cancellationToken);
        return Ok(summary);
    }

    [HttpGet("location/{location}")]
    public async Task<IActionResult> GetLocation(string location, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(location))
        {
            return BadRequest(new { success = false, message = "Location is required." });
        }

        var result = await _actualInventoryService.GetLocationAsync(location, cancellationToken);
        return Ok(result);
    }
}
