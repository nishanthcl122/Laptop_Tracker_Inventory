using System;
using System.Linq;
using System.Threading.Tasks;
using LaptopTracking.Api.Data;
using LaptopTracking.Api.Helpers;
using LaptopTracking.Api.Models.DTOs;
using LaptopTracking.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LaptopTracking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RasController : ControllerBase
{
    private readonly RasImportService _importService;
    private readonly LaptopDbContext _db;

    public RasController(RasImportService importService, LaptopDbContext db)
    {
        _importService = importService;
        _db = db;
    }

    [HttpPost("preview")]
    public async Task<IActionResult> PreviewRas([FromForm] IFormFile? file, [FromForm] string? snapshotDate)
    {
        var validation = FileUploadValidator.Validate(file);
        if (!validation.IsValid)
        {
            return BadRequest(new { success = false, message = validation.ErrorMessage });
        }

        DateOnly date = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        if (!string.IsNullOrWhiteSpace(snapshotDate) && DateOnly.TryParse(snapshotDate, out var parsed))
        {
            date = parsed;
        }

        var preview = await _importService.PreviewRasAsync(file!, date);
        return Ok(preview);
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmRas([FromBody] ConfirmImportRequest request)
    {
        if (request == null || request.BatchId <= 0)
        {
            return BadRequest(new { message = "Valid BatchId is required." });
        }

        var result = await _importService.ConfirmRasAsync(request.BatchId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("{batchId:int}/confirm")]
    public async Task<IActionResult> ConfirmRasByRoute(int batchId)
    {
        if (batchId <= 0)
        {
            return BadRequest(new { message = "Valid BatchId is required." });
        }

        var result = await _importService.ConfirmRasAsync(batchId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentRas([FromQuery] RasQueryParameters query)
    {
        var q = _db.RASCurrents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            string s = query.Search.Trim();
            q = q.Where(r => r.EmployeeCode.Contains(s) || (r.EmployeeName != null && r.EmployeeName.Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(query.SapId))
        {
            string s = query.SapId.Trim();
            if (s.Contains(','))
            {
                var saps = s.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                q = q.Where(r => saps.Contains(r.EmployeeCode));
            }
            else
            {
                q = q.Where(r => r.EmployeeCode.Contains(s));
            }
        }

        if (!string.IsNullOrWhiteSpace(query.Location) && !query.Location.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.Location.Contains(','))
            {
                var locs = query.Location.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                q = q.Where(r => locs.Contains(r.PSA));
            }
            else
            {
                q = q.Where(r => r.PSA == query.Location);
            }
        }

        if (!string.IsNullOrWhiteSpace(query.EmployeeStatus) && !query.EmployeeStatus.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.EmployeeStatus.Contains(','))
            {
                var statuses = query.EmployeeStatus.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                q = q.Where(r => statuses.Contains(r.EmployeeStatus));
            }
            else
            {
                q = q.Where(r => r.EmployeeStatus == query.EmployeeStatus);
            }
        }

        if (query.HasLwd.HasValue)
        {
            q = query.HasLwd.Value ? q.Where(r => r.LastWorkingDay != null) : q.Where(r => r.LastWorkingDay == null);
        }

        int totalCount = await q.CountAsync();
        int page = query.Page <= 0 ? 1 : query.Page;
        int pageSize = query.PageSize <= 0 ? 25 : query.PageSize;

        bool desc = string.Equals(query.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        q = (query.SortBy?.ToLowerInvariant()) switch
        {
            "employeename" or "name" => desc ? q.OrderByDescending(r => r.EmployeeName) : q.OrderBy(r => r.EmployeeName),
            "location" or "psa" => desc ? q.OrderByDescending(r => r.PSA) : q.OrderBy(r => r.PSA),
            "lastworkingday" or "lwd" => desc ? q.OrderByDescending(r => r.LastWorkingDay) : q.OrderBy(r => r.LastWorkingDay),
            "snapshotdate" => desc ? q.OrderByDescending(r => r.SnapshotDate) : q.OrderBy(r => r.SnapshotDate),
            _ => desc ? q.OrderByDescending(r => r.EmployeeCode) : q.OrderBy(r => r.EmployeeCode)
        };

        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RasEmployeeDto
            {
                RASRecordId = r.RasRecordId,
                SAPId = r.EmployeeCode,
                EmployeeName = r.EmployeeName,
                Location = r.PSA,
                EmployeeStatus = r.EmployeeStatus,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                LastWorkingDay = r.LastWorkingDay,
                BatchId = r.BatchId,
                SnapshotDate = r.SnapshotDate,
                RawDataJson = r.RawRecordJson ?? "{}"
            })
            .ToListAsync();

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("records/{sapId}")]
    public async Task<IActionResult> GetRasRecords(string sapId)
    {
        var records = await _db.RASCurrents.AsNoTracking()
            .Where(r => r.EmployeeCode == sapId)
            .OrderBy(r => r.RasRecordId)
            .Select(record => new RasEmployeeDto
            {
                RASRecordId = record.RasRecordId,
                SAPId = record.EmployeeCode,
                EmployeeName = record.EmployeeName,
                Location = record.PSA,
                EmployeeStatus = record.EmployeeStatus,
                StartDate = record.StartDate,
                EndDate = record.EndDate,
                LastWorkingDay = record.LastWorkingDay,
                BatchId = record.BatchId,
                SnapshotDate = record.SnapshotDate,
                RawDataJson = record.RawRecordJson ?? "{}"
            })
            .ToListAsync();

        if (records.Count == 0)
        {
            return NotFound(new { message = $"Employee with SAP ID '{sapId}' not found in current RAS." });
        }

        return Ok(records);
    }
}
