using System.Globalization;
using ClosedXML.Excel;
using LaptopTracking.Api.Data;
using LaptopTracking.Api.Models;
using LaptopTracking.Api.Models.DTOs;
using LaptopTracking.Api.Models.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace LaptopTracking.Api.Services;

public class ActualInventoryService
{
    private static readonly IReadOnlyDictionary<string, string[]> HeaderAliases =
        new Dictionary<string, string[]>(StringComparer.Ordinal)
        {
            ["FBR ID"] = ["FBR ID", "FBR Number", "FBR Request", "FBR"],
            ["PO Number"] = ["PO Number", "PO No", "Purchase Order Number", "PO"],
            ["Location"] = ["Location", "City", "Office Location"],
            ["System Stock"] =
            [
                "System Stock",
                "Expected/System Stock",
                "Expected Stock",
                "IT Asset In Stock as on date",
                "IT Asset In Stock",
                "System Stock as on date"
            ],
            ["Actual Stock"] =
            [
                "Actual Stock",
                "Actual Stock showing in FBR ID as on date",
                "Actual Stock Showing in FBR ID",
                "Physical Stock"
            ]
        };

    private readonly LaptopDbContext _db;

    public ActualInventoryService(LaptopDbContext db)
    {
        _db = db;
    }

    public async Task<ActualInventoryUploadResultDto> UploadAsync(
        IFormFile file,
        DateOnly snapshotDate,
        CancellationToken cancellationToken)
    {
        using var stream = file.OpenReadStream();
        var parsedRows = ParseRows(stream, snapshotDate);
        if (parsedRows.Count == 0)
        {
            throw new InvalidDataException("The uploaded Excel file contains no inventory rows.");
        }

        var uploadedAt = DateTimeOffset.UtcNow;
        foreach (var row in parsedRows)
        {
            row.UploadedAt = uploadedAt;
        }

        var upload = new ActualInventoryUpload
        {
            SnapshotDate = snapshotDate,
            FileName = Path.GetFileName(file.FileName),
            UploadedAt = uploadedAt,
            Rows = parsedRows
        };

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        _db.ActualInventoryUploads.Add(upload);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new ActualInventoryUploadResultDto
        {
            Success = true,
            Message = "Actual inventory uploaded successfully.",
            BatchId = upload.BatchId,
            SnapshotDate = snapshotDate,
            RecordCount = parsedRows.Count,
            UploadedAt = uploadedAt
        };
    }

    public async Task<List<ActualInventoryLocationSummaryDto>> GetLocationSummaryAsync(
        CancellationToken cancellationToken)
    {
        var latestBatchId = await GetLatestBatchIdAsync(cancellationToken);
        if (latestBatchId == null)
        {
            return [];
        }

        return await _db.ActualInventoryRows
            .Where(row => row.BatchId == latestBatchId.Value)
            .GroupBy(row => row.Location)
            .Select(group => new ActualInventoryLocationSummaryDto
            {
                Location = group.Key,
                ActualStock = group.Sum(row => row.ActualStock)
            })
            .OrderBy(item => item.Location)
            .ToListAsync(cancellationToken);
    }

    public async Task<ActualInventoryLocationDto> GetLocationAsync(
        string location,
        CancellationToken cancellationToken)
    {
        var latestBatchId = await GetLatestBatchIdAsync(cancellationToken);
        var actualRows = latestBatchId == null
            ? []
            : await _db.ActualInventoryRows
                .Where(row => row.BatchId == latestBatchId.Value && row.Location == location)
                .Select(row => new { row.FbrId, row.ActualStock })
                .ToListAsync(cancellationToken);

        var systemRows = await _db.LaptopCurrents
            .Where(laptop =>
                laptop.Location == location &&
                (laptop.Status == LaptopStatuses.InStock || laptop.Status == LaptopStatuses.InStockLegacy))
            .Select(laptop => laptop.FBRRequest)
            .ToListAsync(cancellationToken);

        var systemCounts = systemRows
            .Where(fbrId => !string.IsNullOrWhiteSpace(fbrId))
            .GroupBy(fbrId => fbrId, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.OrdinalIgnoreCase);
        var actualCounts = actualRows
            .GroupBy(row => row.FbrId, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Sum(row => row.ActualStock), StringComparer.OrdinalIgnoreCase);

        var fbrIds = systemCounts.Keys
            .Concat(actualCounts.Keys)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(fbrId => fbrId, StringComparer.OrdinalIgnoreCase);
        var items = fbrIds.Select(fbrId =>
        {
            var systemStock = systemCounts.GetValueOrDefault(fbrId);
            var actualStock = actualCounts.GetValueOrDefault(fbrId);
            return new ActualInventoryItemDto
            {
                FbrId = fbrId,
                SystemStock = systemStock,
                ActualStock = actualStock,
                Difference = actualStock - systemStock
            };
        }).ToList();

        var totalSystemStock = items.Sum(item => item.SystemStock);
        var totalActualStock = items.Sum(item => item.ActualStock);
        return new ActualInventoryLocationDto
        {
            Location = location,
            SystemStock = totalSystemStock,
            ActualStock = totalActualStock,
            Variance = totalActualStock - totalSystemStock,
            Items = items
        };
    }

    private Task<int?> GetLatestBatchIdAsync(CancellationToken cancellationToken)
    {
        return _db.ActualInventoryUploads
            .OrderByDescending(upload => upload.UploadedAt)
            .ThenByDescending(upload => upload.BatchId)
            .Select(upload => (int?)upload.BatchId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static List<ActualInventoryRow> ParseRows(Stream stream, DateOnly snapshotDate)
    {
        XLWorkbook workbook;
        try
        {
            workbook = new XLWorkbook(stream);
        }
        catch (Exception exception) when (
            exception is IOException or ArgumentException or InvalidDataException or System.Xml.XmlException)
        {
            throw new InvalidDataException("The uploaded file could not be read as an Excel workbook.", exception);
        }

        using (workbook)
        {
            var worksheet = workbook.Worksheets.FirstOrDefault()
                ?? throw new InvalidDataException("The uploaded Excel file contains no worksheets.");
            var headerRow = worksheet.FirstRowUsed()
                ?? throw new InvalidDataException("The worksheet is empty.");

            var columns = new Dictionary<string, int>(StringComparer.Ordinal);
            foreach (var header in HeaderAliases)
            {
                var matches = headerRow.CellsUsed()
                    .Where(cell => IsHeaderMatch(header.Key, cell.GetString(), header.Value))
                    .Select(cell => cell.Address.ColumnNumber)
                    .Distinct()
                    .ToList();

                if (matches.Count == 0)
                {
                    throw new InvalidDataException($"The required '{header.Key}' column is missing.");
                }

                if (matches.Count > 1)
                {
                    throw new InvalidDataException($"Multiple columns match '{header.Key}'. Keep only one matching header.");
                }

                columns.Add(header.Key, matches[0]);
            }

            var rows = new List<ActualInventoryRow>();
            foreach (var row in worksheet.RowsUsed().Where(row => row.RowNumber() > headerRow.RowNumber()))
            {
                if (!row.CellsUsed().Any(cell => !string.IsNullOrWhiteSpace(cell.GetFormattedString())))
                {
                    continue;
                }

                var fbrId = GetCellText(row, columns["FBR ID"]);
                var location = GetCellText(row, columns["Location"]);
                if (string.IsNullOrWhiteSpace(fbrId))
                {
                    throw new InvalidDataException($"FBR ID is required on row {row.RowNumber()}.");
                }

                if (string.IsNullOrWhiteSpace(location))
                {
                    throw new InvalidDataException($"Location is required on row {row.RowNumber()}.");
                }

                var poNumber = GetCellText(row, columns["PO Number"]);
                if (fbrId.Length > 100 || poNumber.Length > 100 || location.Length > 150)
                {
                    throw new InvalidDataException($"FBR ID, PO Number, or Location exceeds the allowed length on row {row.RowNumber()}.");
                }

                rows.Add(new ActualInventoryRow
                {
                    SnapshotDate = snapshotDate,
                    FbrId = fbrId,
                    PoNumber = poNumber,
                    Location = location,
                    SystemStockFromFile = GetStockValue(row, columns["System Stock"], "System Stock"),
                    ActualStock = GetStockValue(row, columns["Actual Stock"], "Actual Stock")
                });
            }

            return rows;
        }
    }

    private static string GetCellText(IXLRow row, int column)
    {
        return row.Cell(column).GetFormattedString().Trim();
    }

    private static int GetStockValue(IXLRow row, int column, string fieldName)
    {
        var value = GetCellText(row, column);
        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var stock) ||
            decimal.TryParse(value, NumberStyles.Number, CultureInfo.CurrentCulture, out stock))
        {
            if (stock >= 0 && stock <= int.MaxValue && decimal.Truncate(stock) == stock)
            {
                return (int)stock;
            }
        }

        throw new InvalidDataException(
            $"{fieldName} must be a non-negative whole number on row {row.RowNumber()}.");
    }

    private static string NormalizeHeader(string value)
    {
        return new string(value.Where(char.IsLetterOrDigit).Select(char.ToLowerInvariant).ToArray());
    }

    private static bool IsHeaderMatch(string field, string header, IReadOnlyCollection<string> aliases)
    {
        var normalizedHeader = NormalizeHeader(header);
        return aliases.Any(alias => NormalizeHeader(alias) == normalizedHeader) ||
               (field == "System Stock" && normalizedHeader.StartsWith("itassetinstockason", StringComparison.Ordinal)) ||
               (field == "Actual Stock" && normalizedHeader.StartsWith("actualstockshowinginfbridason", StringComparison.Ordinal));
    }
}
