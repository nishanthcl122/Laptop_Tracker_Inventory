using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LaptopTracking.Api.Data;
using LaptopTracking.Api.Models.DTOs;
using LaptopTracking.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LaptopTracking.Api.Services;

public class DashboardService
{
    private readonly LaptopDbContext _db;

    public DashboardService(LaptopDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync( CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var maxLwd = today.AddDays(15);

        var total = await _db.LaptopCurrents.CountAsync(cancellationToken);
        var allocated = await _db.LaptopCurrents.CountAsync(l => l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy, cancellationToken);
        var inStock = await _db.LaptopCurrents.CountAsync(l => l.Status == LaptopStatuses.InStock || l.Status == LaptopStatuses.InStockLegacy, cancellationToken);

        var locationBreakdown = await _db.LaptopCurrents
            .Where(l => (l.Status == LaptopStatuses.InStock || l.Status == LaptopStatuses.InStockLegacy) && !string.IsNullOrWhiteSpace(l.Location))
            .GroupBy(l => l.Location)
            .Select(g => new LocationBreakdownItemDto
            {
                Location = g.Key ?? "Unknown",
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Location)
            .ToListAsync(cancellationToken);

        var rasActive = await _db.LaptopCurrents.CountAsync(l =>
            (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) && !l.IsLost && l.RASStatus == RasStatuses.Active, cancellationToken);

        var lost = await _db.LaptopCurrents.CountAsync(l =>
            (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) && l.IsLost, cancellationToken);

        var notInUhg = await _db.LaptopCurrents.CountAsync(l =>
            (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) && !l.IsLost && l.RASStatus == RasStatuses.NotInUhg, cancellationToken);

        var lwdApproaching = await _db.LaptopCurrents.CountAsync(l =>
            (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) &&
            l.SAPId != null &&
            _db.RASCurrents.Any(r => r.EmployeeCode == l.SAPId &&
                                     r.LastWorkingDay.HasValue &&
                                     r.LastWorkingDay.Value >= today &&
                                     r.LastWorkingDay.Value <= maxLwd), cancellationToken);

        // Distinct employees in RASCurrent with no allocated laptop + breakdown
        var rasIdleRows = await _db.RASCurrents
            .Where(r => !_db.LaptopCurrents.Any(l => l.SAPId == r.EmployeeCode && (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy)))
            .Select(r => new { r.RasRecordId, r.EmployeeCode, r.WBSType, r.PSA })
            .ToListAsync(cancellationToken);

        var idleRepresentatives = rasIdleRows
            .GroupBy(r => r.EmployeeCode, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderBy(r => r.RasRecordId).First())
            .ToList();

        var deemedCodes = new HashSet<string>(
            await _db.RasDeemedUnbillables.Where(d => d.IsActive).Select(d => d.EmployeeCode).ToListAsync(cancellationToken),
            StringComparer.OrdinalIgnoreCase);

        int offshoreBillable = 0;
        int offshoreUnbillable = 0;
        int onsiteCount = 0;
        int nearshoreCount = 0;
        int unknownWbsCount = 0;
        var billableOffshorePsaCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var emp in idleRepresentatives)
        {
            var wbs = emp.WBSType?.Trim();
            var wbsLower = wbs?.ToLowerInvariant() ?? "";

            if (wbsLower == "offshore")
            {
                if (deemedCodes.Contains(emp.EmployeeCode))
                {
                    offshoreUnbillable++;
                }
                else
                {
                    offshoreBillable++;
                    var psa = string.IsNullOrWhiteSpace(emp.PSA) ? "Unknown" : emp.PSA.Trim();
                    billableOffshorePsaCounts[psa] = billableOffshorePsaCounts.GetValueOrDefault(psa) + 1;
                }
            }
            else if (wbsLower == "onsite")
            {
                onsiteCount++;
            }
            else if (wbsLower == "nearshore")
            {
                nearshoreCount++;
            }
            else
            {
                unknownWbsCount++;
            }
        }

        var rasIdleBreakdown = new RasIdleBreakdownDto
        {
            Total = idleRepresentatives.Count,
            Offshore = new RasIdleOffshoreBreakdownDto
            {
                Total = offshoreBillable + offshoreUnbillable,
                Billable = offshoreBillable,
                Unbillable = offshoreUnbillable,
                BillableByPsa = billableOffshorePsaCounts
                    .Select(kvp => new RasIdlePsaCountDto { Psa = kvp.Key, Count = kvp.Value })
                    .OrderByDescending(x => x.Count)
                    .ThenBy(x => x.Psa)
                    .ToList()
            },
            Onsite = onsiteCount,
            Nearshore = nearshoreCount,
            Unknown = unknownWbsCount
        };

        var rasIdle = idleRepresentatives.Count;

        // LWD Risk Breakdown (exact same bucket definitions & calculation as previously in the chart)
        var allocatedLwds = await _db.LaptopCurrents
            .Where(l => (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) && l.SAPId != null)
            .Join(_db.RASCurrents.Where(r => r.LastWorkingDay.HasValue),
                  l => l.SAPId,
                  r => r.EmployeeCode,
                  (l, r) => r.LastWorkingDay!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        int overdue = 0, horizon0_7 = 0, horizon8_15 = 0, horizon15Plus = 0;
        foreach (var lwd in allocatedLwds)
        {
            int diff = lwd.DayNumber - today.DayNumber;
            if (diff < 0) overdue++;
            else if (diff <= 7) horizon0_7++;
            else if (diff <= 15) horizon8_15++;
            else horizon15Plus++;
        }

        var lwdBreakdown = new List<ChartDataPoint>
        {
            new() { Name = "Overdue", Value = overdue },
            new() { Name = "0–7 days", Value = horizon0_7 },
            new() { Name = "8–15 days", Value = horizon8_15 },
            new() { Name = "> 15 days", Value = horizon15Plus }
        };

        return new DashboardSummaryDto
        {
            TotalLaptops = total,
            AllocatedLaptops = allocated,
            InStock = inStock,
            LocationBreakdown = locationBreakdown,
            RasActive = rasActive,
            Lost = lost,
            NotInUhg = notInUhg,
            RasIdle = rasIdle,
            LwdApproaching15Days = lwdApproaching,
            RasIdleBreakdown = rasIdleBreakdown,
            LwdRiskBreakdown = lwdBreakdown
        };
    }

    public async Task<DashboardChartsDto> GetChartsAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);

        var allocatedCount = await _db.LaptopCurrents.CountAsync(l => l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy,cancellationToken);
        var inStockCount = await _db.LaptopCurrents.CountAsync(l => l.Status == LaptopStatuses.InStock || l.Status == LaptopStatuses.InStockLegacy, cancellationToken);

        var rasActive = await _db.LaptopCurrents.CountAsync(l =>
            (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) && !l.IsLost && l.RASStatus == RasStatuses.Active, cancellationToken);

        var lostCount = await _db.LaptopCurrents.CountAsync(l =>
            (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) && l.IsLost, cancellationToken);

        var notInUhgCount = await _db.LaptopCurrents.CountAsync(l =>
            (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) && !l.IsLost && l.RASStatus == RasStatuses.NotInUhg, cancellationToken);

        // 1. Allocation Status (Allocated, In Stock, Lost)
        var allocationList = new List<ChartDataPoint>
        {
            new() { Name = LaptopStatuses.Allocated, Value = allocatedCount },
            new() { Name = LaptopStatuses.InStock, Value = inStockCount },
            new() { Name = RasStatuses.Lost, Value = lostCount }
        };

        // 2. Stock Ageing (In Stock only)
        var inStockLaptops = await _db.LaptopCurrents
            .Where(l => l.Status == LaptopStatuses.InStock || l.Status == LaptopStatuses.InStockLegacy)
            .Select(l => l.InStockSince)
            .ToListAsync(cancellationToken);

        int age0_30 = 0, age31_60 = 0, age61_90 = 0, age90Plus = 0;
        foreach (var inStockSince in inStockLaptops)
        {
            int days = inStockSince.HasValue ? (today.DayNumber - inStockSince.Value.DayNumber) : 0;
            if (days < 0) days = 0;
            if (days <= 30) age0_30++;
            else if (days <= 60) age31_60++;
            else if (days <= 90) age61_90++;
            else age90Plus++;
        }

        var stockAgeingList = new List<ChartDataPoint>
        {
            new() { Name = "0–30 days", Value = age0_30 },
            new() { Name = "31–60 days", Value = age31_60 },
            new() { Name = "61–90 days", Value = age61_90 },
            new() { Name = "> 90 days", Value = age90Plus }
        };

        // 3. Project RAS Activity (Allocated only: ACTIVE, LOST, NOT IN UHG)
        var rasGroups = new List<ChartDataPoint>
        {
            new() { Name = RasStatuses.Active, Value = rasActive },
            new() { Name = RasStatuses.Lost, Value = lostCount },
            new() { Name = "NOT IN UHG", Value = notInUhgCount }
        };

        // 4. LWD Risk Timeline (Allocated only, sourced from RASCurrent)
        var allocatedLwds = await _db.LaptopCurrents
            .Where(l => l.Status == LaptopStatuses.Allocated && l.SAPId != null)
            .Join(_db.RASCurrents.Where(r => r.LastWorkingDay.HasValue),
                  l => l.SAPId,
                  r => r.EmployeeCode,
                  (l, r) => r.LastWorkingDay!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        int overdue = 0, horizon0_7 = 0, horizon8_15 = 0, horizon15Plus = 0;
        foreach (var lwd in allocatedLwds)
        {
            int diff = lwd.DayNumber - today.DayNumber;
            if (diff < 0) overdue++;
            else if (diff <= 7) horizon0_7++;
            else if (diff <= 15) horizon8_15++;
            else horizon15Plus++;
        }

        var lwdList = new List<ChartDataPoint>
        {
            new() { Name = "Overdue", Value = overdue },
            new() { Name = "0–7 days", Value = horizon0_7 },
            new() { Name = "8–15 days", Value = horizon8_15 },
            new() { Name = "> 15 days", Value = horizon15Plus }
        };

        // 5. Laptop Count by Location (All Laptops)
        var locationList = await _db.LaptopCurrents
            .Where(l => !string.IsNullOrEmpty(l.Location))
            .GroupBy(l => l.Location)
            .Select(g => new ChartDataPoint { Name = g.Key ?? "Unknown", Value = g.Count() })
            .OrderByDescending(x => x.Value)
            .Take(8)
            .ToListAsync(cancellationToken);

        // 6. RAS Idle Location Distribution: Group by PSA, COUNT(DISTINCT EmployeeCode)
        var rasIdleLocationList = await _db.RASCurrents
            .Where(r => !_db.LaptopCurrents.Any(l => l.SAPId == r.EmployeeCode && (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy)) && !string.IsNullOrEmpty(r.PSA))
            .GroupBy(r => r.PSA)
            .Select(g => new ChartDataPoint { Name = g.Key ?? "Unknown", Value = g.Select(x => x.EmployeeCode).Distinct().Count() })
            .OrderByDescending(x => x.Value)
            .Take(8)
            .ToListAsync(cancellationToken);

        return new DashboardChartsDto
        {
            AllocationStatus = allocationList,
            StockAgeing = stockAgeingList,
            RasStatus = rasGroups,
            LwdRisk = lwdList,
            LocationDistribution = locationList,
            RasIdleLocationDistribution = rasIdleLocationList
        };
    }

    public async Task<PagedResult<RasIdleEmployeeDto>> GetRasIdleEmployeesAsync(
        string? location, string? search,
        CancellationToken cancellationToken,
        string? wbsType = null, string? billingClassification = null,
        int page = 1,
        int pageSize = 50
        )
    {
        var baseQuery = _db.RASCurrents.Where(r =>
            !_db.LaptopCurrents.Any(l => l.SAPId == r.EmployeeCode && (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy)));

        var deemedCodesQuery = _db.RasDeemedUnbillables
            .Where(d => d.IsActive)
            .Select(d => d.EmployeeCode);

        if (!string.IsNullOrWhiteSpace(wbsType) && !wbsType.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            var w = wbsType.Trim().ToLower();
            if (w == "unknown")
            {
                baseQuery = baseQuery.Where(r => r.WBSType == null || r.WBSType == "" ||
                    (r.WBSType.ToLower().Trim() != "offshore" && r.WBSType.ToLower().Trim() != "onsite" && r.WBSType.ToLower().Trim() != "nearshore"));
            }
            else
            {
                baseQuery = baseQuery.Where(r => r.WBSType != null && r.WBSType.Trim().ToLower() == w);
            }
        }

        if (!string.IsNullOrWhiteSpace(billingClassification) && !billingClassification.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            var b = billingClassification.Trim();
            if (b.Equals("Unbillable", StringComparison.OrdinalIgnoreCase) || b.Equals("DeemedUnbillable", StringComparison.OrdinalIgnoreCase))
            {
                baseQuery = baseQuery.Where(r => deemedCodesQuery.Contains(r.EmployeeCode));
            }
            else if (b.Equals("Billable", StringComparison.OrdinalIgnoreCase))
            {
                baseQuery = baseQuery.Where(r => !deemedCodesQuery.Contains(r.EmployeeCode));
            }
        }

        if (!string.IsNullOrWhiteSpace(location) && location != "ALL")
        {
            if (location.Equals("Unknown", StringComparison.OrdinalIgnoreCase))
            {
                baseQuery = baseQuery.Where(r => r.PSA == null || r.PSA == "");
            }
            else
            {
                baseQuery = baseQuery.Where(r => r.PSA == location);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            baseQuery = baseQuery.Where(r => r.EmployeeCode.ToLower().Contains(s) ||
                             (r.EmployeeName != null && r.EmployeeName.ToLower().Contains(s)) ||
                             (r.PSA != null && r.PSA.ToLower().Contains(s)));
        }

        var q = baseQuery
            .GroupBy(r => r.EmployeeCode)
            .Select(g => new RasIdleEmployeeDto
            {
                SAPId = g.Key,
                EmployeeName = g.Select(x => x.EmployeeName).FirstOrDefault(x => x != null) ?? "—",
                Location = g.Select(x => x.PSA).FirstOrDefault(x => x != null) ?? "—",
                EmployeeStatus = g.Select(x => x.EmployeeStatus).FirstOrDefault(x => x != null) ?? "—",
                LastWorkingDay = g.Max(x => x.LastWorkingDay),
                SnapshotDate = g.Max(x => x.SnapshotDate),
                WBSType = g.Select(x => x.WBSType).FirstOrDefault(x => x != null) ?? "—"
            });

        int totalCount = await q.CountAsync(cancellationToken);
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var items = await q
            .OrderBy(r => r.Location)
            .ThenBy(r => r.EmployeeName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<RasIdleEmployeeDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<LocationLaptopsResultDto> GetLaptopsByLocationAsync(string location, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var laptops = await _db.LaptopCurrents
            .Where(l => l.Location == location)
            .OrderBy(l => l.Status)
            .ThenBy(l => l.SerialNumber)
            .ToListAsync(cancellationToken);

        var saps = laptops.Where(l => !string.IsNullOrEmpty(l.SAPId)).Select(l => l.SAPId!).Distinct().ToList();
        var rasRows = await _db.RASCurrents
            .AsNoTracking()
            .Where(r => saps.Contains(r.EmployeeCode))
            .OrderBy(r => r.RasRecordId)
            .ToListAsync(cancellationToken);

        var rasFirstBySap = rasRows
            .GroupBy(r => r.EmployeeCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var rasLwdBySap = rasRows
            .Where(r => r.LastWorkingDay.HasValue)
            .GroupBy(r => r.EmployeeCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Max(r => r.LastWorkingDay)!.Value, StringComparer.OrdinalIgnoreCase);

        var dtos = laptops.Select(l => LaptopService.MapToDto(l, today, rasFirstBySap, rasLwdBySap)).ToList();

        return new LocationLaptopsResultDto
        {
            Location = location,
            TotalCount = dtos.Count,
            AllocatedCount = dtos.Count(x => x.Status == LaptopStatuses.Allocated),
            InStockCount = dtos.Count(x => x.Status == LaptopStatuses.InStock),
            Laptops = dtos
        };
    }
}
