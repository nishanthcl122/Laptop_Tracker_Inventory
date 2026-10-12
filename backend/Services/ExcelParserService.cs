using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using LaptopTracking.Api.Models.DTOs;
using LaptopTracking.Api.Models.Entities;
using LaptopTracking.Api.Models;

namespace LaptopTracking.Api.Services;

public class ExcelParseResult
{
    public List<ImportBatchRow> ValidRows { get; set; } = [];
    public List<ValidationErrorDto> Errors { get; set; } = [];
}

public class ExcelParserService
{
    private static readonly IReadOnlyDictionary<string, string[]> ColumnAliases = new Dictionary<string, string[]>(StringComparer.Ordinal)
    {
        ["Serial Number"] = ["Serial No.", "Serial No", "Laptop Serial Number", "Serial Number", "SerialNumber", "Serial"],
        ["FBR Request"] = ["FBR Request", "FBRRequest", "Laptop FBR ID", "Laptop FBR Number", "FBR ID", "FBR Number", "FBR"],
        ["Location"] = ["Location", "City", "Office Location"],
        ["Status"] = ["Status", "Allocation Status", "AllocationStatus"],
        ["IT SPOC"] = ["IT SPOC", "ITSPOC", "IT_SPOC", "SPOC"],
        ["SAP ID"] = ["SAP ID", "Employee SAP ID", "SAPID", "SAP"],
        ["User Name"] = ["User Name", "UserName", "Employee Name", "User", "Employee", "Name", "Emp Name"],
        ["RAS Status"] = ["RAS Status", "RAS", "RASStatus"],
        ["Start Date"] = ["Start Date", "StartDate", "Allocation Start Date", "Assignment Date"],
        ["End Date"] = ["End Date", "EndDate", "Allocation End Date"],
        ["Last Working Day"] = ["Last Working Day", "LWD", "LastWorkingDay"]
    };

    public ExcelParseResult ParseAndValidate(Stream stream, int batchId)
    {
        var result = new ExcelParseResult();
        using var workbook = new XLWorkbook(stream);
        var worksheet = workbook.Worksheets.Count > 0 ? workbook.Worksheet(1) : null;

        if (worksheet == null)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = 1,
                Field = "File",
                Message = "The uploaded Excel file contains no worksheets."
            });
            return result;
        }

        var headerRow = worksheet.FirstRowUsed();
        if (headerRow == null)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = 1,
                Field = "File",
                Message = "The worksheet is completely empty."
            });
            return result;
        }

        // Map header column names to indexes
        var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var duplicateHeaders = new List<string>();
        var normalizedHeaders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var cell in headerRow.CellsUsed())
        {
            var headerText = cell.GetString().Trim();
            if (!string.IsNullOrEmpty(headerText))
            {
                if (!colMap.TryAdd(headerText, cell.Address.ColumnNumber) || !normalizedHeaders.Add(NormalizeHeader(headerText)))
                {
                    duplicateHeaders.Add(headerText);
                }
            }
        }

        if (duplicateHeaders.Count > 0)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = headerRow.RowNumber(),
                Field = "Header",
                Message = $"Duplicate column headers are not allowed: {string.Join(", ", duplicateHeaders.Distinct(StringComparer.OrdinalIgnoreCase))}."
            });
            return result;
        }

        int serialCol = FindColumn(colMap, ColumnAliases["Serial Number"], out var serialMatches);
        int fbrCol = FindColumn(colMap, ColumnAliases["FBR Request"], out var fbrMatches);
        int locationCol = FindColumn(colMap, ColumnAliases["Location"], out var locationMatches);
        int statusCol = FindColumn(colMap, ColumnAliases["Status"], out var statusMatches);
        int itSpocCol = FindColumn(colMap, ColumnAliases["IT SPOC"], out var itSpocMatches);
        int sapCol = FindColumn(colMap, ColumnAliases["SAP ID"], out var sapMatches);
        int userCol = FindColumn(colMap, ColumnAliases["User Name"], out var userMatches);
        int rasCol = FindColumn(colMap, ColumnAliases["RAS Status"], out var rasMatches);
        int startCol = FindColumn(colMap, ColumnAliases["Start Date"], out var startDateMatches);
        int endCol = FindColumn(colMap, ColumnAliases["End Date"], out var endDateMatches);
        int lwdCol = FindColumn(colMap, ColumnAliases["Last Working Day"], out var lwdMatches);

        var ambiguousColumns = new (string Field, List<string> Matches)[]
        {
            ("Serial Number", serialMatches), ("FBR Request", fbrMatches), ("Location", locationMatches),
            ("Status", statusMatches), ("IT SPOC", itSpocMatches), ("SAP ID", sapMatches),
            ("User Name", userMatches), ("RAS Status", rasMatches), ("Start Date", startDateMatches),
            ("End Date", endDateMatches), ("Last Working Day", lwdMatches)
        };
        foreach (var (field, matches) in ambiguousColumns.Where(x => x.Matches.Count > 1))
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = headerRow.RowNumber(),
                Field = "Header",
                Message = $"Multiple columns match '{field}': {string.Join(", ", matches)}. Keep only one matching header."
            });
        }

        var selectedColumns = new (string Field, int Column)[]
        {
            ("Serial Number", serialCol), ("FBR Request", fbrCol), ("Location", locationCol),
            ("Status", statusCol), ("IT SPOC", itSpocCol), ("SAP ID", sapCol),
            ("User Name", userCol), ("RAS Status", rasCol), ("Start Date", startCol),
            ("End Date", endCol), ("Last Working Day", lwdCol)
        }.Where(mapping => mapping.Column > 0);
        var reusedColumns = selectedColumns
            .GroupBy(mapping => mapping.Column)
            .Where(group => group.Count() > 1)
            .ToList();
        foreach (var group in reusedColumns)
        {
            string header = colMap.First(pair => pair.Value == group.Key).Key;
            result.Errors.Add(new ValidationErrorDto
            {
                Row = headerRow.RowNumber(),
                Field = "Header",
                Message = $"Column '{header}' matches multiple fields: {string.Join(", ", group.Select(mapping => mapping.Field))}."
            });
        }
        if (ambiguousColumns.Any(x => x.Matches.Count > 1) || reusedColumns.Count > 0) return result;

        if (serialCol == -1)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = headerRow.RowNumber(),
                Field = "Header",
                Message = "Required column 'Serial No.' / 'Laptop Serial Number' was not found in the Excel header."
            });
            return result;
        }

        var seenSerials = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var lastRowNumber = worksheet.LastRowUsed()?.RowNumber() ?? headerRow.RowNumber();

        for (int rowNum = headerRow.RowNumber() + 1; rowNum <= lastRowNumber; rowNum++)
        {
            var row = worksheet.Row(rowNum);
            if (row.IsEmpty()) continue;

            string rawSerial = GetCellString(row, serialCol);
            if (string.IsNullOrWhiteSpace(rawSerial))
            {
                result.Errors.Add(new ValidationErrorDto
                {
                    Row = rowNum,
                    Field = "Serial Number",
                    Message = "Laptop Serial Number is missing or blank."
                });
                continue;
            }

            string serial = rawSerial.Trim().ToUpperInvariant();

            if (seenSerials.Contains(serial))
            {
                result.Errors.Add(new ValidationErrorDto
                {
                    Row = rowNum,
                    Field = "Serial Number",
                    Message = $"Duplicate serial number '{serial}' found within the same file."
                });
                continue;
            }
            seenSerials.Add(serial);

            string rawFbr = GetCellString(row, fbrCol);
            string fbr = string.IsNullOrWhiteSpace(rawFbr) ? string.Empty : rawFbr.Trim();

            string rawLoc = GetCellString(row, locationCol);
            string location = string.IsNullOrWhiteSpace(rawLoc) ? string.Empty : rawLoc.Trim();

            string rawStatus = GetCellString(row, statusCol);
            string status = NormalizeStatus(rawStatus);
            if (status == ImportRowValidationStatuses.Invalid)
            {
                result.Errors.Add(new ValidationErrorDto
                {
                    Row = rowNum,
                    Field = "Status",
                    Message = $"Invalid Status '{rawStatus}'. Must be 'Allocated' or 'In Stock'."
                });
                continue;
            }

            string? itSpoc = itSpocCol > 0 ? NormalizeSpaces(GetCellString(row, itSpocCol)) : null;

            string rawSap = GetCellString(row, sapCol);
            string? sapId = string.IsNullOrWhiteSpace(rawSap) ? null : rawSap.Trim().ToUpperInvariant();

            string rawUser = GetCellString(row, userCol);
            string? userName = NormalizeSpaces(rawUser);

            string rawRas = GetCellString(row, rasCol);
            string rasStatus = NormalizeRasStatus(rawRas);

            DateOnly? startDate = ParseDateCell(row, startCol);
            DateOnly? endDate = ParseDateCell(row, endCol);
            DateOnly? lwd = ParseDateCell(row, lwdCol);

            var batchRow = new ImportBatchRow
            {
                BatchId = batchId,
                SerialNumber = serial,
                FBRRequest = fbr,
                Location = location,
                Status = status,
                ITSPOC = itSpoc,
                SAPId = sapId,
                UserName = userName,
                RASStatus = rasStatus,
                StartDate = startDate,
                EndDate = endDate,
                LastWorkingDay = lwd,
                ValidationStatus = ImportRowValidationStatuses.Valid
            };

            result.ValidRows.Add(batchRow);
        }

        return result;
    }

    private static int FindColumn(Dictionary<string, int> map, string[] candidates, out List<string> matchingHeaders)
    {
        var normalizedCandidates = candidates
            .Select(NormalizeHeader)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var matches = map
            .Where(pair => normalizedCandidates.Contains(NormalizeHeader(pair.Key)))
            .ToList();

        matchingHeaders = matches.Select(match => match.Key).ToList();
        return matches.Count == 1 ? matches[0].Value : -1;
    }

    private static string NormalizeHeader(string header) => Regex.Replace(header, @"[^a-zA-Z0-9]", "");

    private static string GetCellString(IXLRow row, int colNumber)
    {
        if (colNumber <= 0) return string.Empty;
        var cell = row.Cell(colNumber);
        return cell.GetString();
    }

    private static string NormalizeStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return ImportRowValidationStatuses.Invalid;
        string s = raw.Trim().ToUpperInvariant().Replace("_", " ");
        if (s == LaptopStatuses.AllocatedLegacy || s == "ASSIGNED") return LaptopStatuses.Allocated;
        if (s == "IN STOCK" || s == "INSTOCK" || s == "STOCK" || s == "AVAILABLE") return LaptopStatuses.InStock;
        return ImportRowValidationStatuses.Invalid;
    }

    private static string NormalizeRasStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return RasStatuses.Unknown;
        string s = raw.Trim().ToUpperInvariant();
        if (s == RasStatuses.Active || s == "ACT") return RasStatuses.Active;
        if (s == RasStatuses.Inactive || s == "INACT" || s == "IN-ACTIVE" || s == RasStatuses.Lost) return RasStatuses.Inactive;
        return RasStatuses.Unknown;
    }

    private static string? NormalizeSpaces(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return Regex.Replace(raw.Trim(), @"\s+", " ");
    }

    private static DateOnly? ParseDateCell(IXLRow row, int colNumber)
    {
        if (colNumber <= 0) return null;
        var cell = row.Cell(colNumber);
        if (cell.IsEmpty()) return null;

        if (cell.DataType == XLDataType.DateTime)
        {
            return DateOnly.FromDateTime(cell.GetDateTime().Date);
        }

        if (cell.DataType == XLDataType.Number)
        {
            try
            {
                double num = cell.GetDouble();
                var dt = DateTime.FromOADate(num);
                return DateOnly.FromDateTime(dt.Date);
            }
            catch
            {
                // Continue to string parsing
            }
        }

        string text = cell.GetString().Trim();
        if (string.IsNullOrWhiteSpace(text)) return null;

        string[] formats = ["yyyy-MM-dd", "dd-MMM-yyyy", "dd-MM-yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "d-MMM-yy", "d-MMM-yyyy"];
        if (DateTime.TryParseExact(text, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedExact))
        {
            return DateOnly.FromDateTime(parsedExact.Date);
        }

        if (DateTime.TryParse(text, CultureInfo.CurrentCulture, DateTimeStyles.None, out var parsedGeneral))
        {
            return DateOnly.FromDateTime(parsedGeneral.Date);
        }

        return null;
    }
}
