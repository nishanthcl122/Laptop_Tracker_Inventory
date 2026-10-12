using System;
using System.Threading.Tasks;
using LaptopTracking.Api.Helpers;
using LaptopTracking.Api.Models.DTOs;
using LaptopTracking.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace LaptopTracking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImportController : ControllerBase
{
    private readonly ImportService _importService;
    private readonly RasImportService _rasImportService;
    private readonly BatchService _batchService;
    private readonly ILogger<ImportController> _logger;

    public ImportController(ImportService importService, RasImportService rasImportService, BatchService batchService, ILogger<ImportController> logger)
    {
        _importService = importService;
        _rasImportService = rasImportService;
        _batchService = batchService;
        _logger = logger;
    }

    [HttpPost("preview")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Preview([FromForm] IFormFile file, [FromForm] string? snapshotDate, CancellationToken cancellationToken)
    {
        var validation = FileUploadValidator.Validate(file);
        const long MaxFileSize = 10 * 1024 * 1024;

        if (file.Length > MaxFileSize)
        {
            return BadRequest(new
            {
                success = false,
                message = "The uploaded file exceeds the maximum allowed size."
            });
        }

        if (!validation.IsValid)
        {
            return BadRequest(new { success = false, message = validation.ErrorMessage });
        }


        DateOnly parsedDate;
        if (string.IsNullOrWhiteSpace(snapshotDate) || !DateOnly.TryParse(snapshotDate, out parsedDate))
        {
            parsedDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        }

        try
        {
            var preview = await _importService.PreviewImportAsync(file, parsedDate, cancellationToken);
            return Ok(preview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Import validation failed");
            return StatusCode(500, new { success = false, message = "The import could not be processed." });
        }
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmImportRequest request, CancellationToken cancellationToken)
    {
        if (request == null || request.BatchId <= 0)
        {
            return BadRequest(new { success = false, message = "Invalid batch ID provided." });
        }

        var result = await _importService.ConfirmImportAsync(request.BatchId, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("ras/preview")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> PreviewRas([FromForm] IFormFile file, [FromForm] string? snapshotDate, CancellationToken cancellationToken)
    {
        var validation = FileUploadValidator.Validate(file);
        if (!validation.IsValid)
        {
            return BadRequest(new { success = false, message = validation.ErrorMessage });
        }

        const long MaxFileSize = 10 * 1024 * 1024;

        if (file.Length > MaxFileSize)
        {
            return BadRequest(new
            {
                success = false,
                message = "The uploaded file exceeds the maximum allowed size."
            });
        }

        DateOnly parsedDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        if (!string.IsNullOrWhiteSpace(snapshotDate) && DateOnly.TryParse(snapshotDate, out var dt))
        {
            parsedDate = dt;
        }

        var preview = await _rasImportService.PreviewRasAsync(file, parsedDate, cancellationToken);
        return Ok(preview);
    }

    [HttpPost("ras/{batchId:int}/confirm")]
    public async Task<IActionResult> ConfirmRas(int batchId, CancellationToken cancellationToken)
    {
        if (batchId <= 0)
        {
            return BadRequest(new { success = false, message = "Valid BatchId is required." });
        }

        var result = await _rasImportService.ConfirmRasAsync(batchId, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("batches")]
    public async Task<IActionResult> GetBatches(CancellationToken cancellationToken)
    {
        var batches = await _batchService.GetBatchesAsync(cancellationToken);
        return Ok(batches);
    }

    [HttpGet("batches/{batchId:int}")]
    public async Task<IActionResult> GetBatchDetails(int batchId, CancellationToken cancellationToken)
    {
        var details = await _batchService.GetBatchDetailsAsync(batchId, cancellationToken);
        if (details == null) return NotFound(new { success = false, message = $"Batch #{batchId} not found." });
        return Ok(details);
    }
}
