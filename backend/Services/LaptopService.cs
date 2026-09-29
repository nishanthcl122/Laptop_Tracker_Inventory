using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LaptopTracking.Api.Data;
using LaptopTracking.Api.Models.DTOs;
using LaptopTracking.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace LaptopTracking.Api.Services;

public class LaptopService
{
    private readonly LaptopDbContext _db;

    public LaptopService(LaptopDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<LaptopDto>> GetLaptopsAsync(LaptopQueryParameters query)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var q = _db.LaptopCurrents.AsNoTracking().AsQueryable();

        // Global search
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            string s = query.Search.Trim();
            q = q.Where(l =>
                l.SerialNumber.Contains(s) ||
                l.FBRRequest.Contains(s) ||
                l.Location.Contains(s) ||
                (l.ITSPOC != null && l.ITSPOC.Contains(s)) ||
                (l.SAPId != null && l.SAPId.Contains(s)) ||
                (l.UserName != null && l.UserName.Contains(s)));
        }

        // Status filter
        string? statusFilter = !string.IsNullOrWhiteSpace(query.Status) ? query.Status : query.AllocationStatus;
        if (!string.IsNullOrWhiteSpace(statusFilter) && !statusFilter.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (statusFilter.Contains(','))
            {
                var statuses = statusFilter.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => s.ToUpperInvariant().Replace("_", " "))
                    .ToList();
                q = q.Where(l => statuses.Contains(l.Status.ToUpper()));
            }
            else
            {
                string normStatus = statusFilter.Trim().ToUpperInvariant().Replace("_", " ");
                if (normStatus == "ALLOCATED" || normStatus == "ASSIGNED")
                {
                    q = q.Where(l => l.Status == "Allocated");
                }
                else if (normStatus == "IN STOCK" || normStatus == "INSTOCK" || normStatus == "STOCK")
                {
                    q = q.Where(l => l.Status == "In Stock");
                }
                else
                {
                    q = q.Where(l => l.Status == statusFilter);
                }
            }
        }

        // RAS Status filter
        if (!string.IsNullOrWhiteSpace(query.RASStatus) && !query.RASStatus.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.RASStatus.Contains(','))
            {
                var rasList = query.RASStatus.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(r => r.ToUpperInvariant())
                    .ToList();

                q = q.Where(l => (l.Status == "Allocated" || l.Status == "ALLOCATED") && (
                    (rasList.Contains("ACTIVE") && !l.IsLost && l.RASStatus == "ACTIVE") ||
                    (rasList.Contains("LOST") && l.IsLost) ||
                    ((rasList.Contains("NOT_IN_UHG") || rasList.Contains("NOT IN UHG")) && !l.IsLost && l.RASStatus == "NOT_IN_UHG") ||
                    (rasList.Contains("UNKNOWN") && (l.RASStatus == "UNKNOWN" || l.RASStatus == null))
                ));
            }
            else
            {
                string normRas = query.RASStatus.Trim().ToUpperInvariant();
                if (normRas == "ACTIVE")
                {
                    q = q.Where(l => (l.Status == "Allocated" || l.Status == "ALLOCATED") && !l.IsLost && l.RASStatus == "ACTIVE");
                }
                else if (normRas == "LOST")
                {
                    q = q.Where(l => (l.Status == "Allocated" || l.Status == "ALLOCATED") && l.IsLost);
                }
                else if (normRas == "NOT_IN_UHG" || normRas == "NOT IN UHG" || normRas == "NOTINUHG")
                {
                    q = q.Where(l => (l.Status == "Allocated" || l.Status == "ALLOCATED") && !l.IsLost && l.RASStatus == "NOT_IN_UHG");
                }
                else if (normRas == "INACTIVE")
                {
                    q = q.Where(l => (l.Status == "Allocated" || l.Status == "ALLOCATED") && (l.IsLost || l.RASStatus == "NOT_IN_UHG"));
                }
                else if (normRas == "UNKNOWN")
                {
                    q = q.Where(l => l.RASStatus == "UNKNOWN" || l.RASStatus == null);
                }
            }
        }

        // IsLost filter
        if (query.IsLost.HasValue)
        {
            q = q.Where(l => l.IsLost == query.IsLost.Value);
        }

        // Location filter
        if (!string.IsNullOrWhiteSpace(query.Location) && !query.Location.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.Location.Contains(','))
            {
                var locs = query.Location.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                q = q.Where(l => locs.Contains(l.Location));
            }
            else
            {
                q = q.Where(l => l.Location == query.Location);
            }
        }

        // FBR Request filter
        string? fbrFilter = !string.IsNullOrWhiteSpace(query.FBRRequest) ? query.FBRRequest : query.FBRId;
        if (!string.IsNullOrWhiteSpace(fbrFilter) && !fbrFilter.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (fbrFilter.Contains(','))
            {
                var fbrs = fbrFilter.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                q = q.Where(l => fbrs.Contains(l.FBRRequest));
            }
            else
            {
                q = q.Where(l => l.FBRRequest == fbrFilter);
            }
        }

        // IT SPOC filter
        if (!string.IsNullOrWhiteSpace(query.ITSPOC) && !query.ITSPOC.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.ITSPOC.Contains(','))
            {
                var spocs = query.ITSPOC.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                q = q.Where(l => l.ITSPOC != null && spocs.Any(s => l.ITSPOC.Contains(s)));
            }
            else
            {
                q = q.Where(l => l.ITSPOC != null && l.ITSPOC.Contains(query.ITSPOC));
            }
        }

        // SAP ID filter
        if (!string.IsNullOrWhiteSpace(query.SAPId))
        {
            if (query.SAPId.Contains(','))
            {
                var sapList = query.SAPId.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                q = q.Where(l => l.SAPId != null && sapList.Contains(l.SAPId));
            }
            else
            {
                q = q.Where(l => l.SAPId != null && l.SAPId.Contains(query.SAPId));
            }
        }

        // Date filters (checked dynamically against RASCurrent)
        if (query.StartDateFrom.HasValue)
        {
            q = q.Where(l => l.SAPId != null && _db.RASCurrents.Any(r => r.EmployeeCode == l.SAPId && r.StartDate >= query.StartDateFrom.Value));
        }
        if (query.StartDateTo.HasValue)
        {
            q = q.Where(l => l.SAPId != null && _db.RASCurrents.Any(r => r.EmployeeCode == l.SAPId && r.StartDate <= query.StartDateTo.Value));
        }
        if (query.EndDateFrom.HasValue)
        {
            q = q.Where(l => l.SAPId != null && _db.RASCurrents.Any(r => r.EmployeeCode == l.SAPId && r.EndDate >= query.EndDateFrom.Value));
        }
        if (query.EndDateTo.HasValue)
        {
            q = q.Where(l => l.SAPId != null && _db.RASCurrents.Any(r => r.EmployeeCode == l.SAPId && r.EndDate <= query.EndDateTo.Value));
        }
        if (query.LwdFrom.HasValue)
        {
            q = q.Where(l => l.SAPId != null && _db.RASCurrents.Any(r => r.EmployeeCode == l.SAPId && r.LastWorkingDay >= query.LwdFrom.Value));
        }
        if (query.LwdTo.HasValue)
        {
            q = q.Where(l => l.SAPId != null && _db.RASCurrents.Any(r => r.EmployeeCode == l.SAPId && r.LastWorkingDay <= query.LwdTo.Value));
        }

        // Stock Ageing min / max
        if (query.StockAgeMin.HasValue || query.StockAgeMax.HasValue)
        {
            q = q.Where(l => l.Status == "In Stock" && l.InStockSince.HasValue);
            if (query.StockAgeMin.HasValue)
            {
                var maxStartDate = today.AddDays(-query.StockAgeMin.Value);
                q = q.Where(l => l.InStockSince <= maxStartDate);
            }
            if (query.StockAgeMax.HasValue)
            {
                var minStartDate = today.AddDays(-query.StockAgeMax.Value);
                q = q.Where(l => l.InStockSince >= minStartDate);
            }
        }

        // LWD Approaching within 15 days
        if (query.LwdApproaching15Days == true)
        {
            var maxLwd = today.AddDays(15);
            q = q.Where(l => l.Status == "Allocated" && l.SAPId != null &&
                             _db.RASCurrents.Any(r => r.EmployeeCode == l.SAPId &&
                                                      r.LastWorkingDay.HasValue &&
                                                      r.LastWorkingDay.Value >= today &&
                                                      r.LastWorkingDay.Value <= maxLwd));
        }

        if (query.BatchId.HasValue)
        {
            q = q.Where(l => l.LastBatchId == query.BatchId.Value);
        }

        if (query.SnapshotDate.HasValue)
        {
            q = q.Where(l => l.LastSeenDate == query.SnapshotDate.Value);
        }

        int totalCount = await q.CountAsync();

        // Sorting
        bool desc = string.Equals(query.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        q = (query.SortBy?.ToLowerInvariant()) switch
        {
            "fbrrequest" or "fbrid" => desc ? q.OrderByDescending(x => x.FBRRequest) : q.OrderBy(x => x.FBRRequest),
            "location" => desc ? q.OrderByDescending(x => x.Location) : q.OrderBy(x => x.Location),
            "status" or "allocationstatus" => desc ? q.OrderByDescending(x => x.Status) : q.OrderBy(x => x.Status),
            "itspoc" or "it_spoc" => desc ? q.OrderByDescending(x => x.ITSPOC) : q.OrderBy(x => x.ITSPOC),
            "sapid" => desc ? q.OrderByDescending(x => x.SAPId) : q.OrderBy(x => x.SAPId),
            "username" or "employeename" => desc ? q.OrderByDescending(x => x.UserName) : q.OrderBy(x => x.UserName),
            "instocksince" => desc ? q.OrderByDescending(x => x.InStockSince) : q.OrderBy(x => x.InStockSince),
            "lastseendate" => desc ? q.OrderByDescending(x => x.LastSeenDate) : q.OrderBy(x => x.LastSeenDate),
            _ => desc ? q.OrderByDescending(x => x.SerialNumber) : q.OrderBy(x => x.SerialNumber)
        };

        int page = Math.Max(1, query.Page);
        int pageSize = Math.Clamp(query.PageSize, 1, 500);

        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        // Retrieve representative RAS data for the page (FIRST OCCURRENCE start/end date)
        var saps = items.Where(l => !string.IsNullOrEmpty(l.SAPId)).Select(l => l.SAPId!).Distinct().ToList();
        var rasRows = await _db.RASCurrents
            .AsNoTracking()
            .Where(r => saps.Contains(r.EmployeeCode))
            .OrderBy(r => r.RasRecordId) // FIRST OCCURRENCE
            .ToListAsync();

        var rasFirstBySap = rasRows
            .GroupBy(r => r.EmployeeCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var rasLwdBySap = rasRows
            .Where(r => r.LastWorkingDay.HasValue)
            .GroupBy(r => r.EmployeeCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Max(r => r.LastWorkingDay)!.Value, StringComparer.OrdinalIgnoreCase);

        var dtos = items.Select(item => MapToDto(item, today, rasFirstBySap, rasLwdBySap)).ToList();

        return new PagedResult<LaptopDto>
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<LaptopDto?> GetLaptopBySerialAsync(string serialNumber)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var lap = await _db.LaptopCurrents.AsNoTracking()
            .FirstOrDefaultAsync(l => l.SerialNumber == serialNumber);

        if (lap == null) return null;

        var rasFirstBySap = new Dictionary<string, RASCurrent>(StringComparer.OrdinalIgnoreCase);
        var rasLwdBySap = new Dictionary<string, DateOnly>(StringComparer.OrdinalIgnoreCase);

        if (!string.IsNullOrEmpty(lap.SAPId))
        {
            var rasRows = await _db.RASCurrents
                .AsNoTracking()
                .Where(r => r.EmployeeCode == lap.SAPId)
                .OrderBy(r => r.RasRecordId) // FIRST OCCURRENCE
                .ToListAsync();

            if (rasRows.Count > 0)
            {
                rasFirstBySap[lap.SAPId] = rasRows[0];
                var lwd = rasRows.Where(r => r.LastWorkingDay.HasValue).Select(r => r.LastWorkingDay!.Value).DefaultIfEmpty().Max();
                if (lwd != default)
                {
                    rasLwdBySap[lap.SAPId] = lwd;
                }
            }
        }

        return MapToDto(lap, today, rasFirstBySap, rasLwdBySap);
    }

    public async Task<List<AuditHistoryItemDto>> GetLaptopAuditHistoryAsync(string serialNumber)
    {
        return await _db.LaptopAuditHistories
            .AsNoTracking()
            .Where(a => a.SerialNumber == serialNumber)
            .OrderByDescending(a => a.SnapshotDate)
            .ThenByDescending(a => a.AuditId)
            .Select(a => new AuditHistoryItemDto
            {
                AuditId = a.AuditId,
                SerialNumber = a.SerialNumber,
                BatchId = a.BatchId,
                SnapshotDate = a.SnapshotDate,
                FileName = a.FileName,
                ChangeType = a.ChangeType,
                ChangedFields = a.ChangedFields,
                PreviousFBRRequest = a.PreviousFBRRequest,
                PreviousLocation = a.PreviousLocation,
                PreviousStatus = a.PreviousStatus,
                PreviousITSPOC = a.PreviousITSPOC,
                PreviousSAPId = a.PreviousSAPId,
                PreviousUserName = a.PreviousUserName,
                PreviousRASStatus = a.PreviousRASStatus,
                PreviousStartDate = a.PreviousStartDate,
                PreviousEndDate = a.PreviousEndDate,
                PreviousLastWorkingDay = a.PreviousLastWorkingDay,
                PreviousInStockSince = a.PreviousInStockSince,
                PreviousEmployeeName = a.PreviousEmployeeName,
                PreviousWBSType = a.PreviousWBSType,
                PreviousPSA = a.PreviousPSA,
                PreviousRasBatchId = a.PreviousRasBatchId,
                PreviousRasSnapshotDate = a.PreviousRasSnapshotDate,
                CurrentRasBatchId = a.CurrentRasBatchId,
                CurrentRasSnapshotDate = a.CurrentRasSnapshotDate,
                RecordedAt = a.RecordedAt
            })
            .ToListAsync();
    }

    public async Task<UpdateLaptopResultDto> UpdateLaptopStatusAsync(string serialNumber, UpdateLaptopRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return new UpdateLaptopResultDto { Success = false, Message = "Laptop status is required." };
        }

        var normalizedStatus = request.Status.Trim();
        if (!normalizedStatus.Equals("Allocated", StringComparison.OrdinalIgnoreCase) &&
            !normalizedStatus.Equals("In Stock", StringComparison.OrdinalIgnoreCase))
        {
            return new UpdateLaptopResultDto { Success = false, Message = "Status must be 'Allocated' or 'In Stock'." };
        }

        var laptop = await _db.LaptopCurrents
            .FirstOrDefaultAsync(l => l.SerialNumber == serialNumber);

        if (laptop == null)
        {
            return new UpdateLaptopResultDto { Success = false, Message = $"Laptop '{serialNumber}' was not found." };
        }

        var currentStatus = laptop.Status;
        var currentRasStatus = laptop.RASStatus;
        var currentIsLost = laptop.IsLost;
        var previousFbr = laptop.FBRRequest;
        var previousLocation = laptop.Location;
        var previousItSpoc = laptop.ITSPOC;
        var previousSap = laptop.SAPId;
        var previousUser = laptop.UserName;
        var previousInStockSince = laptop.InStockSince;
        var previousRasStatus = laptop.RASStatus;
        var now = DateTimeOffset.UtcNow;
        var today = DateOnly.FromDateTime(now.DateTime);

        if (normalizedStatus.Equals("Allocated", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(request.Location))
            {
                return new UpdateLaptopResultDto { Success = false, Message = "Location is required when allocating the laptop." };
            }

            if (string.IsNullOrWhiteSpace(request.SAPId))
            {
                return new UpdateLaptopResultDto { Success = false, Message = "SAP ID is required when allocating the laptop." };
            }
        }
        else if (normalizedStatus.Equals("In Stock", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(request.Location))
            {
                return new UpdateLaptopResultDto { Success = false, Message = "Location is required when moving the laptop to stock." };
            }
        }

        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var auditEntry = new LaptopAuditHistory
            {
                SerialNumber = laptop.SerialNumber,
                BatchId = 0,
                SnapshotDate = today,
                FileName = "Manual Recovery / Update",
                ChangeType = "MANUAL_RECOVERY_EDIT",
                ChangedFields = $"Status:{currentStatus}->{normalizedStatus};Location:{previousLocation}->{request.Location};SAPId:{previousSap ?? ""}->{request.SAPId ?? ""};UserName:{previousUser ?? ""}->{request.UserName ?? ""};ITSPOC:{previousItSpoc ?? ""}->{request.ITSPOC ?? ""}",
                PreviousFBRRequest = previousFbr,
                PreviousLocation = previousLocation,
                PreviousStatus = currentStatus,
                PreviousITSPOC = previousItSpoc,
                PreviousSAPId = previousSap,
                PreviousUserName = previousUser,
                PreviousRASStatus = previousRasStatus,
                PreviousInStockSince = previousInStockSince,
                RecordedAt = now
            };

            await _db.LaptopAuditHistories.AddAsync(auditEntry);

            laptop.FBRRequest = string.IsNullOrWhiteSpace(request.FBRRequest) ? laptop.FBRRequest : request.FBRRequest.Trim();
            laptop.Location = request.Location!.Trim();
            laptop.Status = normalizedStatus;
            laptop.ITSPOC = normalizedStatus.Equals("Allocated", StringComparison.OrdinalIgnoreCase) ? request.ITSPOC?.Trim() : null;
            laptop.SAPId = normalizedStatus.Equals("Allocated", StringComparison.OrdinalIgnoreCase) ? request.SAPId?.Trim() : null;
            laptop.UserName = normalizedStatus.Equals("Allocated", StringComparison.OrdinalIgnoreCase) ? request.UserName?.Trim() : null;
            laptop.InStockSince = normalizedStatus.Equals("In Stock", StringComparison.OrdinalIgnoreCase)
                ? (request.InStockSince ?? today)
                : null;

            if (normalizedStatus.Equals("Allocated", StringComparison.OrdinalIgnoreCase))
            {
                laptop.IsLost = false;
                laptop.RASStatus = string.IsNullOrWhiteSpace(request.RASStatus) ? "ACTIVE" : request.RASStatus.Trim();
            }
            else
            {
                laptop.IsLost = false;
                laptop.RASStatus = "UNKNOWN";
            }

            laptop.LastSeenDate = today;
            laptop.UpdatedAt = now;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            var updatedLaptop = await GetLaptopBySerialAsync(serialNumber);
            return new UpdateLaptopResultDto
            {
                Success = true,
                Message = $"Laptop '{serialNumber}' updated successfully.",
                Laptop = updatedLaptop
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<byte[]> ExportLaptopsToExcelAsync(LaptopQueryParameters query)
    {
        query.Page = 1;
        query.PageSize = 10000;
        var paged = await GetLaptopsAsync(query);

        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var ws = workbook.Worksheets.Add("Laptops");

        string[] headers = [
            "Serial No.", "FBR Request", "Location", "Status", "IT SPOC",
            "SAP ID", "User Name", "RAS Status", "Start Date", "End Date",
            "Last Working Day", "In Stock Since", "Ageing Days"
        ];

        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
            ws.Cell(1, i + 1).Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.LightGray;
        }

        int row = 2;
        foreach (var l in paged.Items)
        {
            ws.Cell(row, 1).Value = l.SerialNumber;
            ws.Cell(row, 2).Value = l.FBRRequest;
            ws.Cell(row, 3).Value = l.Location;
            ws.Cell(row, 4).Value = l.Status;
            ws.Cell(row, 5).Value = l.ITSPOC ?? "";
            ws.Cell(row, 6).Value = l.SAPId ?? "";
            ws.Cell(row, 7).Value = l.UserName ?? "";
            ws.Cell(row, 8).Value = l.RASStatus;
            ws.Cell(row, 9).Value = l.StartDate?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 10).Value = l.EndDate?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 11).Value = l.LastWorkingDay?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 12).Value = l.InStockSince?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 13).Value = l.AgeingDays?.ToString() ?? "";
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new System.IO.MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public static LaptopDto MapToDto(
        LaptopCurrent l,
        DateOnly today,
        Dictionary<string, RASCurrent>? rasFirstBySap = null,
        Dictionary<string, DateOnly>? rasLwdBySap = null)
    {
        int? ageingDays = null;
        if (l.Status == "In Stock" && l.InStockSince.HasValue)
        {
            ageingDays = today.DayNumber - l.InStockSince.Value.DayNumber;
        }

        bool isAllocated = l.Status == "Allocated" || l.Status == "ALLOCATED";
        bool hasSap = !string.IsNullOrEmpty(l.SAPId);
        RASCurrent? rasFirst = (hasSap && rasFirstBySap != null && rasFirstBySap.TryGetValue(l.SAPId!, out var rf)) ? rf : null;
        bool inRas = rasFirst != null;

        string rasStatus = "UNKNOWN";
        if (isAllocated)
        {
            if (l.IsLost)
            {
                rasStatus = "LOST";
            }
            else if (!string.IsNullOrEmpty(l.RASStatus))
            {
                rasStatus = l.RASStatus;
            }
            else if (inRas)
            {
                rasStatus = "ACTIVE";
            }
            else
            {
                rasStatus = "UNKNOWN";
            }
        }

        DateOnly? startDate = isAllocated && inRas ? rasFirst!.StartDate : null;
        DateOnly? endDate = isAllocated && inRas ? rasFirst!.EndDate : null;
        DateOnly? lwd = null;
        if (isAllocated && hasSap && rasLwdBySap != null && rasLwdBySap.TryGetValue(l.SAPId!, out var foundLwd))
        {
            lwd = foundLwd;
        }
        else if (isAllocated && inRas && rasFirst!.LastWorkingDay.HasValue)
        {
            lwd = rasFirst.LastWorkingDay;
        }

        string? userName = (isAllocated && inRas && !string.IsNullOrEmpty(rasFirst!.EmployeeName))
            ? rasFirst.EmployeeName
            : l.UserName;

        return new LaptopDto
        {
            SerialNumber = l.SerialNumber,
            FBRRequest = l.FBRRequest,
            Location = l.Location,
            Status = l.Status,
            ITSPOC = l.ITSPOC,
            SAPId = l.SAPId,
            UserName = userName,
            IsLost = l.IsLost,
            RASStatus = rasStatus,
            StartDate = startDate,
            EndDate = endDate,
            LastWorkingDay = lwd,
            InStockSince = l.InStockSince,
            AgeingDays = ageingDays,
            FirstSeenDate = l.FirstSeenDate,
            LastSeenDate = l.LastSeenDate,
            LastBatchId = l.LastBatchId,
            UpdatedAt = l.UpdatedAt
        };
    }
}
