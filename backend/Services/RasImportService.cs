using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ClosedXML.Excel;
using LaptopTracking.Api.Data;
using LaptopTracking.Api.Models.DTOs;
using LaptopTracking.Api.Models.Entities;
using LaptopTracking.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace LaptopTracking.Api.Services;

public class RasImportService
{
    private static readonly IReadOnlyDictionary<string, string[]> ColumnAliases = new Dictionary<string, string[]>(StringComparer.Ordinal)
    {
        ["EmployeeCode"] = ["Employee Code", "EmployeeCode", "Emp Code", "EmpCode", "SAP ID", "SAPID", "SAP", "Employee ID", "EmployeeID", "Emp ID", "EmpID", "User ID"],
        ["EmployeeName"] = ["Employee Name", "EmployeeName", "Emp Name", "EmpName", "Resource Name", "ResourceName", "Full Name", "FullName", "Employee", "Name"],
        ["LastWorkingDay"] = ["LastWorkingDay", "Last Working Day", "Last Working Date", "LWD"],
        ["PSA"] = ["PSA"],
        ["StartDate"] = ["Start Date", "StartDate"],
        ["EndDate"] = ["End Date", "EndDate"],
        ["ProjectCode"] = ["Project Code", "ProjectCode"],
        ["ProjectName"] = ["Project Name", "ProjectName"],
        ["WBSLevel"] = ["WBS Level", "WBSLevel"],
        ["Allocation"] = ["Allocation"],
        ["Role"] = ["Role"],
        ["RoleName"] = ["RoleName", "Role Name"],
        ["CustomerCode"] = ["Customer Code", "CustomerCode"],
        ["CustomerName"] = ["Customer Name", "CustomerName"],
        ["ProjectSuperLOBCode"] = ["ProjectSuperLOBCode", "Project Super LOB Code"],
        ["ProjectSuperLOBName"] = ["ProjectSuperLOBName", "Project Super LOB Name"],
        ["ProjectLOBCode"] = ["ProjectLOBCode", "Project LOB Code"],
        ["ProjectLOBName"] = ["ProjectLOBName", "Project LOB Name"],
        ["ProjectSDUCode"] = ["ProjectSDUCode", "Project SDU Code"],
        ["ProjectSDUName"] = ["ProjectSDUName", "Project SDU Name"],
        ["ProjectDUCode"] = ["ProjectDUCode", "Project DU Code"],
        ["ProjectDUName"] = ["ProjectDUName", "Project DU Name"],
        ["ProjectManagerCode"] = ["ProjectManagerCode", "Project Manager Code"],
        ["ProjectManagerName"] = ["ProjectManagerName", "Project Manager Name"],
        ["ProjectTypeCode"] = ["Project Type Code", "ProjectTypeCode"],
        ["ProjectTypeName"] = ["Project Type Name", "ProjectTypeName"],
        ["ProjectStatus"] = ["Project Status", "ProjectStatus"],
        ["ProjectCategory"] = ["Project Category", "ProjectCategory"],
        ["ProjectCategoryName"] = ["ProjectCategoryName", "Project Category Name"],
        ["WBSType"] = ["WBS Type", "WBSType"],
        ["CompanyCode"] = ["Company Code", "CompanyCode"],
        ["CompanyName"] = ["Company Name", "CompanyName"],
        ["WBSPlantCode"] = ["WBS Plant Code", "WBSPlantCode"],
        ["WBSPlantName"] = ["WBS Plant Name", "WBSPlantName"],
        ["WBSCode"] = ["wbs Code", "WBS Code", "WBSCode"],
        ["BillingStatus"] = ["BillingStatus", "Billing Status"],
        ["EmployeeSuperLOBCode"] = ["EmployeeSuperLOBCode", "Employee Super LOB Code"],
        ["EmployeeSuperLOBName"] = ["EmployeeSuperLOBName", "Employee Super LOB Name"],
        ["EmployeeLOBCode"] = ["EmployeeLOBCode", "Employee LOB Code"],
        ["EmployeeLOBName"] = ["EmployeeLOBName", "Employee LOB Name"],
        ["EmployeeSDUCode"] = ["EmployeeSDUCode", "Employee SDU Code"],
        ["EmployeeSDUName"] = ["EmployeeSDUName", "Employee SDU Name"],
        ["EmployeeDUCode"] = ["EmployeeDUCode", "Employee DU Code"],
        ["EmployeeDUName"] = ["EmployeeDUName", "Employee DU Name"],
        ["Band"] = ["Band"],
        ["SubBand"] = ["SubBand", "Sub Band"],
        ["Designation"] = ["Designation"],
        ["EmployeeStatus"] = ["EmployeeStatus", "Employee Status"],
        ["ReportingManagerCode"] = ["ReportingManagerCode", "Reporting Manager Code"],
        ["ReportingManagerName"] = ["ReportingManagerName", "Reporting Manager Name"],
        ["JoiningDate"] = ["JoiningDate", "Joining Date", "DOJ"],
        ["EmployeePlantCode"] = ["Employee Plant Code", "EmployeePlantCode"],
        ["EmployeePlantName"] = ["Employee Plant Name", "EmployeePlantName"],
        ["CWLCode"] = ["CWL Code", "CWLCode"],
        ["CWLName"] = ["CWLName", "CWL Name"],
        ["JobName"] = ["Job Name", "JobName"],
        ["JobFamilyName"] = ["Job Family Name", "JobFamilyName"],
        ["RequestedBy"] = ["Requested By", "RequestedBy"],
        ["RequestedDate"] = ["Requested Date", "RequestedDate"],
        ["StateName"] = ["State Name", "StateName"],
        ["CityName"] = ["City Name", "CityName"],
        ["ZipCode"] = ["ZipCode", "Zip Code"],
        ["WorkSiteAddress1"] = ["Work Site Address 1", "WorkSiteAddress1"],
        ["WorkSiteAddress2"] = ["Work Site Address 2", "WorkSiteAddress2"],
        ["ProjectElementDescription"] = ["Project Element Description", "ProjectElementDescription"],
        ["ProgramCode"] = ["Program Code", "ProgramCode"],
        ["DepartmentCode"] = ["Department Code", "DepartmentCode"],
        ["BillingSystem"] = ["Billing System", "BillingSystem"]
    };

    private readonly LaptopDbContext _db;
    private readonly RasReconciliationService _reconciliation;

    public RasImportService(LaptopDbContext db, RasReconciliationService reconciliation)
    {
        _db = db;
        _reconciliation = reconciliation;
    }

    public async Task<RasPreviewDto> PreviewRasAsync(IFormFile file, DateOnly snapshotDate, CancellationToken cancellationToken)
    {
        var result = new RasPreviewDto
        {
            SnapshotDate = snapshotDate,
            FileName = Path.GetFileName(file.FileName)
        };

        // 1. Detect Dual-Mode: INITIAL vs RECONCILIATION
        bool previousBaselineExists = await _db.ImportBatches.AnyAsync(b => b.BatchType == ImportBatchTypes.Ras && (b.Status == ImportBatchStatuses.Committed || b.Status == ImportBatchStatuses.Confirmed), cancellationToken)
                                      || await _db.RASCurrents.AnyAsync(cancellationToken);

        string mode = previousBaselineExists ? "RECONCILIATION" : "INITIAL";
        result.Mode = mode;
        result.PreviousBaselineExists = previousBaselineExists;

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);

        // 2. Identify the active worksheet with data
        IXLWorksheet? worksheet = null;
        foreach (var ws in workbook.Worksheets)
        {
            if (ws.FirstRowUsed() != null && ws.LastRowUsed() != null && ws.LastRowUsed()!.RowNumber() >= ws.FirstRowUsed()!.RowNumber())
            {
                worksheet = ws;
                break;
            }
        }

        if (worksheet == null)
        {
            result.Errors.Add(new ValidationErrorDto { Row = 1, Field = "File", Message = "Workbook contains no sheets with readable data." });
            return result;
        }

        // 3. Robust Header Row Detection (scan first 15 rows for highest header score)
        int firstRow = worksheet.FirstRowUsed()!.RowNumber();
        int lastRow = worksheet.LastRowUsed()!.RowNumber();

        const int MaxRows = 5000;
        if (lastRow > MaxRows)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = 1,
                Field = "File",
                Message = $"Worksheet exceeds maximum supported row count ({MaxRows})."
            });

            return result;
        }
        IXLRow? headerRow = null;
        int maxHeaderScore = -1;

        for (int r = firstRow; r <= Math.Min(firstRow + 15, lastRow); r++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var row = worksheet.Row(r);
            if (row.IsEmpty()) continue;

            int score = 0;
            foreach (var cell in row.CellsUsed())
            {
                string text = cell.GetString().Trim().ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(text)) continue;

                if (text.Contains("employee") || text.Contains("emp") || text.Contains("code") || text.Contains("sap") ||
                    text.Contains("name") || text.Contains("location") || text.Contains("psa") || text.Contains("subarea") ||
                    text.Contains("project") || text.Contains("wbs") ||
                    text.Contains("lwd") || text.Contains("date") || text.Contains("status") || text.Contains("role"))
                {
                    score++;
                }
            }

            if (score > maxHeaderScore)
            {
                maxHeaderScore = score;
                headerRow = row;
            }
        }

        headerRow ??= worksheet.FirstRowUsed();
        if (headerRow == null)
        {
            result.Errors.Add(new ValidationErrorDto { Row = 1, Field = "File", Message = "Could not identify header row in the worksheet." });
            return result;
        }

        // 4. Extract and preserve ALL actual headers
        var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var detectedHeaders = new List<string>();
        var duplicateHeaders = new List<string>();
        var normalizedHeaders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var cell in headerRow.CellsUsed())
        {
            string headerText = cell.GetString().Trim();
            if (!string.IsNullOrEmpty(headerText))
            {
                detectedHeaders.Add(headerText);
                if (!colMap.TryAdd(headerText, cell.Address.ColumnNumber) || !normalizedHeaders.Add(NormalizeHeader(headerText)))
                {
                    duplicateHeaders.Add(headerText);
                }
            }
        }
        result.ColumnsDetected = detectedHeaders;
        result.ColumnCount = detectedHeaders.Count;

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

        const int MaxColumns = 68;

        if (detectedHeaders.Count > MaxColumns)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = headerRow.RowNumber(),
                Field = "File",
                Message = $"Worksheet exceeds maximum supported column count ({MaxColumns})."
            });

            return result;
        }


        // 5. Identify key columns with comprehensive candidate lists
        var selectedHeaders = new Dictionary<string, string>(StringComparer.Ordinal);
        var selectedColumns = new Dictionary<string, int>(StringComparer.Ordinal);
        var ambiguousHeaders = new List<(string Field, List<string> Matches)>();
        foreach (var (field, aliases) in ColumnAliases)
        {
            int column = FindColumn(colMap, aliases, out string? matchedHeader, out var matches);
            if (matches.Count > 1)
            {
                ambiguousHeaders.Add((field, matches));
                continue;
            }
            if (column > 0 && matchedHeader != null)
            {
                selectedHeaders[field] = matchedHeader;
                selectedColumns[field] = column;
            }
        }

        foreach (var (field, matches) in ambiguousHeaders)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = headerRow.RowNumber(),
                Field = "Header",
                Message = $"Multiple columns match '{field}': {string.Join(", ", matches)}. Keep only one matching header."
            });
        }

        var detectedKeyColumns = new (string Label, string Field)[]
        {
            ("SAP ID / Employee Code", "EmployeeCode"),
            ("Employee Name", "EmployeeName"),
            ("Location", "PSA"),
            ("Last Working Day", "LastWorkingDay")
        };
        foreach (var (label, field) in detectedKeyColumns)
        {
            if (selectedHeaders.TryGetValue(field, out var header)) result.DetectedKeyColumns[label] = header;
        }

        var reusedColumns = selectedColumns
            .GroupBy(mapping => mapping.Value)
            .Where(group => group.Count() > 1)
            .ToList();
        foreach (var group in reusedColumns)
        {
            string header = colMap.First(pair => pair.Value == group.Key).Key;
            result.Errors.Add(new ValidationErrorDto
            {
                Row = headerRow.RowNumber(),
                Field = "Header",
                Message = $"Column '{header}' matches multiple fields: {string.Join(", ", group.Select(mapping => mapping.Key))}."
            });
        }
        if (ambiguousHeaders.Count > 0 || reusedColumns.Count > 0) return result;

        var missingRequiredHeaders = new List<string>();
        if (!selectedColumns.ContainsKey("EmployeeCode")) missingRequiredHeaders.Add("Employee Code");
        if (!selectedColumns.ContainsKey("PSA")) missingRequiredHeaders.Add("PSA");

        if (missingRequiredHeaders.Count > 0)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Row = headerRow.RowNumber(),
                Field = "Header",
                Message = $"Required column(s) not found: {string.Join(", ", missingRequiredHeaders)}. Detected headers: {string.Join(", ", detectedHeaders)}"
            });
            return result;
        }

        int sapCol = selectedColumns["EmployeeCode"];
        int nameCol = selectedColumns.GetValueOrDefault("EmployeeName", -1);
        int locCol = selectedColumns["PSA"];

        // 6. Create Staged ImportBatch record immediately so batchId is valid!
        var batch = new ImportBatch
        {
            BatchType = ImportBatchTypes.Ras,
            ImportMode = mode,
            SnapshotDate = snapshotDate,
            FileName = result.FileName,
            Status = ImportBatchStatuses.Staged,
            UploadedAt = DateTimeOffset.UtcNow
        };
        _db.ImportBatches.Add(batch);
        await _db.SaveChangesAsync(cancellationToken);
        result.BatchId = batch.BatchId;

        // 7. Parse and stage actual data rows
        var incomingRas = new List<RASHistorical>();
        var seenFingerprints = new HashSet<string>();
        var distinctSapIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int startRow = headerRow.RowNumber() + 1;
        int lastDataRow = worksheet.LastRowUsed()!.RowNumber();

        for (int rowNum = startRow; rowNum <= lastDataRow; rowNum++)
        {
            var row = worksheet.Row(rowNum);
            if (row.IsEmpty()) continue;

            // Check if all cells in this row are empty or whitespace
            bool hasData = false;
            foreach (var c in row.CellsUsed())
            {
                if (!string.IsNullOrWhiteSpace(c.GetString()))
                {
                    hasData = true;
                    break;
                }
            }
            if (!hasData) continue;

            // 1. Exact Full-Row Duplicate Check (Deterministic Row Fingerprint)
            string fingerprint = ComputeRowFingerprint(row, colMap);
            if (seenFingerprints.Contains(fingerprint))
            {
                result.ExactDuplicateRows++;
                if (result.Errors.Count < 20)
                {
                    result.Errors.Add(new ValidationErrorDto
                    {
                        Row = rowNum,
                        Field = "Row",
                        Message = $"Row {rowNum} is an exact full-row duplicate of an earlier record."
                    });
                }
                continue;
            }
            seenFingerprints.Add(fingerprint);

            // 2. SAP ID / Employee Code Validation
            string rawSap = GetCellString(row, sapCol);
            if (string.IsNullOrWhiteSpace(rawSap))
            {
                result.InvalidRows++;
                if (result.Errors.Count < 20)
                {
                    result.Errors.Add(new ValidationErrorDto
                    {
                        Row = rowNum,
                        Field = selectedHeaders["EmployeeCode"],
                        Message = $"Row {rowNum}: Employee Code / SAP ID is blank."
                    });
                }
                continue;
            }

            string sapId = rawSap.Trim().ToUpperInvariant();
            distinctSapIds.Add(sapId);

            string? empName = NormalizeSpaces(GetCellString(row, nameCol));
            string? location = string.IsNullOrWhiteSpace(GetCellString(row, locCol)) ? null : GetCellString(row, locCol).Trim();

            // Capture 100% of all detected columns dynamically
            var rowDataDict = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            foreach (var kvp in colMap)
            {
                rowDataDict[kvp.Key] = GetCellString(row, kvp.Value);
            }
            string rawJson = JsonSerializer.Serialize(rowDataDict);

            string? psaVal = location;
            DateOnly? startDate = GetDate(row, selectedColumns, rowDataDict, selectedHeaders, "StartDate");
            DateOnly? endDate = GetDate(row, selectedColumns, rowDataDict, selectedHeaders, "EndDate");
            DateOnly? lwd = GetDate(row, selectedColumns, rowDataDict, selectedHeaders, "LastWorkingDay");

            var historical = new RASHistorical
            {
                BatchId = batch.BatchId,
                SnapshotDate = snapshotDate,
                EmployeeCode = sapId,
                EmployeeName = empName,
                ProjectCode = GetMappedValue(rowDataDict, selectedHeaders, "ProjectCode"),
                ProjectName = GetMappedValue(rowDataDict, selectedHeaders, "ProjectName"),
                WBSLevel = GetMappedValue(rowDataDict, selectedHeaders, "WBSLevel"),
                StartDate = startDate,
                EndDate = endDate,
                Allocation = GetMappedValue(rowDataDict, selectedHeaders, "Allocation"),
                Role = GetMappedValue(rowDataDict, selectedHeaders, "Role"),
                RoleName = GetMappedValue(rowDataDict, selectedHeaders, "RoleName"),
                CustomerCode = GetMappedValue(rowDataDict, selectedHeaders, "CustomerCode"),
                CustomerName = GetMappedValue(rowDataDict, selectedHeaders, "CustomerName"),
                ProjectSuperLOBCode = GetMappedValue(rowDataDict, selectedHeaders, "ProjectSuperLOBCode"),
                ProjectSuperLOBName = GetMappedValue(rowDataDict, selectedHeaders, "ProjectSuperLOBName"),
                ProjectLOBCode = GetMappedValue(rowDataDict, selectedHeaders, "ProjectLOBCode"),
                ProjectLOBName = GetMappedValue(rowDataDict, selectedHeaders, "ProjectLOBName"),
                ProjectSDUCode = GetMappedValue(rowDataDict, selectedHeaders, "ProjectSDUCode"),
                ProjectSDUName = GetMappedValue(rowDataDict, selectedHeaders, "ProjectSDUName"),
                ProjectDUCode = GetMappedValue(rowDataDict, selectedHeaders, "ProjectDUCode"),
                ProjectDUName = GetMappedValue(rowDataDict, selectedHeaders, "ProjectDUName"),
                ProjectManagerCode = GetMappedValue(rowDataDict, selectedHeaders, "ProjectManagerCode"),
                ProjectManagerName = GetMappedValue(rowDataDict, selectedHeaders, "ProjectManagerName"),
                ProjectTypeCode = GetMappedValue(rowDataDict, selectedHeaders, "ProjectTypeCode"),
                ProjectTypeName = GetMappedValue(rowDataDict, selectedHeaders, "ProjectTypeName"),
                ProjectStatus = GetMappedValue(rowDataDict, selectedHeaders, "ProjectStatus"),
                ProjectCategory = GetMappedValue(rowDataDict, selectedHeaders, "ProjectCategory"),
                ProjectCategoryName = GetMappedValue(rowDataDict, selectedHeaders, "ProjectCategoryName"),
                WBSType = GetMappedValue(rowDataDict, selectedHeaders, "WBSType"),
                CompanyCode = GetMappedValue(rowDataDict, selectedHeaders, "CompanyCode"),
                CompanyName = GetMappedValue(rowDataDict, selectedHeaders, "CompanyName"),
                WBSPlantCode = GetMappedValue(rowDataDict, selectedHeaders, "WBSPlantCode"),
                WBSPlantName = GetMappedValue(rowDataDict, selectedHeaders, "WBSPlantName"),
                WBSCode = GetMappedValue(rowDataDict, selectedHeaders, "WBSCode"),
                BillingStatus = GetMappedValue(rowDataDict, selectedHeaders, "BillingStatus"),
                EmployeeSuperLOBCode = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeSuperLOBCode"),
                EmployeeSuperLOBName = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeSuperLOBName"),
                EmployeeLOBCode = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeLOBCode"),
                EmployeeLOBName = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeLOBName"),
                EmployeeSDUCode = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeSDUCode"),
                EmployeeSDUName = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeSDUName"),
                EmployeeDUCode = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeDUCode"),
                EmployeeDUName = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeDUName"),
                Band = GetMappedValue(rowDataDict, selectedHeaders, "Band"),
                SubBand = GetMappedValue(rowDataDict, selectedHeaders, "SubBand"),
                Designation = GetMappedValue(rowDataDict, selectedHeaders, "Designation"),
                EmployeeStatus = GetMappedValue(rowDataDict, selectedHeaders, "EmployeeStatus"),
                ReportingManagerCode = GetMappedValue(rowDataDict, selectedHeaders, "ReportingManagerCode"),
                ReportingManagerName = GetMappedValue(rowDataDict, selectedHeaders, "ReportingManagerName"),
                JoiningDate = GetDate(row, selectedColumns, rowDataDict, selectedHeaders, "JoiningDate"),
                PSA = psaVal,
                EmployeePlantCode = GetMappedValue(rowDataDict, selectedHeaders, "EmployeePlantCode"),
                EmployeePlantName = GetMappedValue(rowDataDict, selectedHeaders, "EmployeePlantName"),
                CWLCode = GetMappedValue(rowDataDict, selectedHeaders, "CWLCode"),
                CWLName = GetMappedValue(rowDataDict, selectedHeaders, "CWLName"),
                JobName = GetMappedValue(rowDataDict, selectedHeaders, "JobName"),
                JobFamilyName = GetMappedValue(rowDataDict, selectedHeaders, "JobFamilyName"),
                RequestedBy = GetMappedValue(rowDataDict, selectedHeaders, "RequestedBy"),
                RequestedDate = GetDateTime(row, selectedColumns, rowDataDict, selectedHeaders, "RequestedDate"),
                StateName = GetMappedValue(rowDataDict, selectedHeaders, "StateName"),
                CityName = GetMappedValue(rowDataDict, selectedHeaders, "CityName"),
                ZipCode = GetMappedValue(rowDataDict, selectedHeaders, "ZipCode"),
                WorkSiteAddress1 = GetMappedValue(rowDataDict, selectedHeaders, "WorkSiteAddress1"),
                WorkSiteAddress2 = GetMappedValue(rowDataDict, selectedHeaders, "WorkSiteAddress2"),
                ProjectElementDescription = GetMappedValue(rowDataDict, selectedHeaders, "ProjectElementDescription"),
                ProgramCode = GetMappedValue(rowDataDict, selectedHeaders, "ProgramCode"),
                DepartmentCode = GetMappedValue(rowDataDict, selectedHeaders, "DepartmentCode"),
                BillingSystem = GetMappedValue(rowDataDict, selectedHeaders, "BillingSystem"),
                LastWorkingDay = lwd,
                RowFingerprint = fingerprint,
                RawRecordJson = rawJson,
                CreatedAt = DateTimeOffset.UtcNow
            };
            incomingRas.Add(historical);

            // Add to PreviewRows (first 40 rows for interactive table)
            if (result.PreviewRows.Count < 40)
            {
                result.PreviewRows.Add(new RasRowPreviewItemDto
                {
                    RowNumber = rowNum,
                    SAPId = sapId,
                    EmployeeName = empName ?? "—",
                    Location = psaVal ?? "—",
                    StartDate = startDate,
                    EndDate = endDate,
                    LastWorkingDay = lwd,
                    RawDataJson = rawJson
                });
            }
        }

        result.ValidRows = incomingRas.Count;
        result.DistinctEmployees = distinctSapIds.Count;
        result.TotalRows = incomingRas.Count + result.ExactDuplicateRows + result.InvalidRows;
        result.TotalRecords = incomingRas.Count;
        batch.RecordCount = incomingRas.Count;
        batch.ErrorCount = result.InvalidRows + result.ExactDuplicateRows;

        // Persist staged historical rows
        await _db.RASHistoricals.AddRangeAsync(incomingRas, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        // 8. Dual-Mode Evaluation
        if (mode == "INITIAL")
        {
            result.BaselineEmployees = distinctSapIds.Count;
            result.NewEmployeesCount = distinctSapIds.Count;
            result.MissingEmployeesCount = 0;
            result.ExitedEmployees = 0;
            result.AffectedLaptopsCount = 0;
            result.LaptopsToInStock = 0;
            result.AffectedLaptops = [];

            batch.NewCount = distinctSapIds.Count;
            batch.MissingCount = 0;
            batch.ChangedCount = 0;
            batch.UnchangedCount = 0;
        }
        else
        {
            // RECONCILIATION Mode: compare distinct SAPs against previous accepted baseline
            var previousSaps = await _db.RASCurrents
                .Select(r => r.EmployeeCode)
                .Distinct()
                .ToListAsync(cancellationToken);
            var prevSapSet = new HashSet<string>(previousSaps, StringComparer.OrdinalIgnoreCase);
            var incomingSapSet = distinctSapIds;

            result.BaselineEmployees = incomingSapSet.Count;
            result.NewEmployeesCount = incomingSapSet.Count(s => !prevSapSet.Contains(s));
            result.MissingEmployeesCount = prevSapSet.Count(s => !incomingSapSet.Contains(s));
            result.ExitedEmployees = result.MissingEmployeesCount;

            batch.NewCount = result.NewEmployeesCount;
            batch.MissingCount = result.MissingEmployeesCount;
            batch.UnchangedCount = incomingSapSet.Count(s => prevSapSet.Contains(s));

            // Affected Allocated Laptops:
            // Only laptops whose assigned SAP was in previous RAS and is now absent from new RAS, and is not already Lost
            var prevRasLwds = await _db.RASCurrents
                .Where(r => r.LastWorkingDay.HasValue)
                .GroupBy(r => r.EmployeeCode)
                .ToDictionaryAsync(g => g.Key, g => g.Max(r => r.LastWorkingDay)!.Value, StringComparer.OrdinalIgnoreCase, cancellationToken);

            var incomingRasLwds = incomingRas
                .Where(r => r.LastWorkingDay.HasValue)
                .GroupBy(r => r.EmployeeCode)
                .ToDictionary(g => g.Key, g => g.Max(r => r.LastWorkingDay)!.Value, StringComparer.OrdinalIgnoreCase);

            var allocatedLaptops = await _db.LaptopCurrents
                .Where(l => (l.Status == LaptopStatuses.Allocated || l.Status == LaptopStatuses.AllocatedLegacy) && l.SAPId != null)
                .ToListAsync(cancellationToken);

            var affectedList = new List<AffectedLaptopDto>();
            foreach (var lap in allocatedLaptops)
            {
                if (lap.IsLost) continue;

                bool wasInPrevRas = prevSapSet.Contains(lap.SAPId!);
                bool inNewRas = incomingSapSet.Contains(lap.SAPId!);
                DateOnly? lapLwd = incomingRasLwds.TryGetValue(lap.SAPId!, out var incLwd) ? incLwd :
                                  prevRasLwds.TryGetValue(lap.SAPId!, out var pLwd) ? pLwd : null;

                if (wasInPrevRas && !inNewRas)
                {
                    affectedList.Add(new AffectedLaptopDto
                    {
                        SerialNumber = lap.SerialNumber,
                        FBRRequest = lap.FBRRequest,
                        Location = lap.Location,
                        SAPId = lap.SAPId,
                        UserName = lap.UserName,
                        ITSPOC = lap.ITSPOC,
                        LastWorkingDay = lapLwd,
                        TransitionReason = RasStatuses.NotInUhg
                    });
                }
            }

            result.AffectedLaptops = affectedList;
            result.AffectedLaptopsCount = affectedList.Count;
            result.LaptopsToInStock = 0;
            batch.ChangedCount = affectedList.Count;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return result;
    }

    public async Task<ImportResultDto> ConfirmRasAsync(int batchId, CancellationToken cancellationToken)
    {
        return await _reconciliation.ConfirmRasBatchAsync(batchId, cancellationToken);
    }

    private static int FindColumn(Dictionary<string, int> map, string[] candidates, out string? matchedHeader, out List<string> matchingHeaders)
    {
        matchedHeader = null;
        var normalizedCandidates = candidates
            .Select(NormalizeHeader)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var matches = map
            .Where(kvp => normalizedCandidates.Contains(NormalizeHeader(kvp.Key)))
            .ToList();

        matchingHeaders = matches.Select(match => match.Key).ToList();
        if (matches.Count != 1) return -1;

        matchedHeader = matches[0].Key;
        return matches[0].Value;
    }

    private static string NormalizeHeader(string header) => Regex.Replace(header, @"[^a-zA-Z0-9]", "");

    private static string GetCellString(IXLRow row, int colNumber)
    {
        if (colNumber <= 0) return string.Empty;
        var cell = row.Cell(colNumber);
        return cell.GetString().Trim();
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
            catch { }
        }

        string text = cell.GetString().Trim();
        if (string.IsNullOrWhiteSpace(text)) return null;

        string[] formats = ["yyyy-MM-dd", "dd-MMM-yyyy", "dd-MM-yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "d-MMM-yy", "d-MMM-yyyy", "yyyy-MM-dd HH:mm:ss", "MM/dd/yyyy HH:mm:ss"];
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

    private static string ComputeRowFingerprint(IXLRow row, Dictionary<string, int> colMap)
    {
        // Deterministic fingerprint of the COMPLETE normalized row
        // Sort columns by name for deterministic order across rows
        var sortedCols = colMap.OrderBy(c => c.Key, StringComparer.OrdinalIgnoreCase);
        var sb = new StringBuilder();

        foreach (var col in sortedCols)
        {
            int colIdx = col.Value;
            var cell = row.Cell(colIdx);
            string normVal = string.Empty;

            if (!cell.IsEmpty())
            {
                if (cell.DataType == XLDataType.DateTime)
                {
                    normVal = DateOnly.FromDateTime(cell.GetDateTime().Date).ToString("yyyy-MM-dd");
                }
                else if (cell.DataType == XLDataType.Number)
                {
                    double num = cell.GetDouble();
                    if (num > 20000 && num < 60000 && (col.Key.Contains("Date", StringComparison.OrdinalIgnoreCase) || col.Key.Contains("LWD", StringComparison.OrdinalIgnoreCase)))
                    {
                        try
                        {
                            normVal = DateOnly.FromDateTime(DateTime.FromOADate(num).Date).ToString("yyyy-MM-dd");
                        }
                        catch
                        {
                            normVal = num.ToString(CultureInfo.InvariantCulture);
                        }
                    }
                    else
                    {
                        normVal = num.ToString(CultureInfo.InvariantCulture);
                    }
                }
                else
                {
                    string rawText = cell.GetString().Trim();
                    if (DateTime.TryParse(rawText, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                    {
                        normVal = DateOnly.FromDateTime(dt.Date).ToString("yyyy-MM-dd");
                    }
                    else
                    {
                        normVal = Regex.Replace(rawText, @"\s+", " ").ToLowerInvariant();
                    }
                }
            }

            sb.Append(col.Key.ToLowerInvariant()).Append('=').Append(normVal).Append(';');
        }

        using var sha = System.Security.Cryptography.SHA256.Create();
        byte[] bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return Convert.ToHexString(sha.ComputeHash(bytes));
    }

    private static string? GetMappedValue(
        Dictionary<string, string?> dict,
        IReadOnlyDictionary<string, string> selectedHeaders,
        string field)
    {
        if (!selectedHeaders.TryGetValue(field, out var header) ||
            !dict.TryGetValue(header, out var value) ||
            string.IsNullOrWhiteSpace(value)) return null;

        return value.Trim();
    }

    private static DateOnly? GetDate(
        IXLRow row,
        IReadOnlyDictionary<string, int> selectedColumns,
        Dictionary<string, string?> dict,
        IReadOnlyDictionary<string, string> selectedHeaders,
        string field)
    {
        if (selectedColumns.TryGetValue(field, out int colIdx))
        {
            var d = ParseDateCell(row, colIdx);
            if (d.HasValue) return d;
        }

        var s = GetMappedValue(dict, selectedHeaders, field);
        if (!string.IsNullOrWhiteSpace(s))
        {
            string[] formats = ["yyyy-MM-dd", "dd-MMM-yyyy", "dd-MM-yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "d-MMM-yy", "d-MMM-yyyy"];
            if (DateTime.TryParseExact(s, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return DateOnly.FromDateTime(dt.Date);
            }
            if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt2))
            {
                return DateOnly.FromDateTime(dt2.Date);
            }
        }
        return null;
    }

    private static DateTimeOffset? GetDateTime(
        IXLRow row,
        IReadOnlyDictionary<string, int> selectedColumns,
        Dictionary<string, string?> dict,
        IReadOnlyDictionary<string, string> selectedHeaders,
        string field)
    {
        if (selectedColumns.TryGetValue(field, out int colIdx))
        {
            var cell = row.Cell(colIdx);
            if (!cell.IsEmpty() && cell.DataType == XLDataType.DateTime)
            {
                return new DateTimeOffset(cell.GetDateTime(), TimeSpan.Zero);
            }
        }

        var s = GetMappedValue(dict, selectedHeaders, field);
        if (!string.IsNullOrWhiteSpace(s))
        {
            if (DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dto))
            {
                return dto;
            }
            if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return new DateTimeOffset(dt, TimeSpan.Zero);
            }
        }
        return null;
    }
}

