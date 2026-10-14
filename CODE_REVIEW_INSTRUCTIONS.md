# Code Review Instructions

## Purpose

Review this repository for correctness, security, maintainability, performance, reliability, coding standards, and user experience.

The application is a laptop inventory and RAS workforce reconciliation system with:

- An ASP.NET Core Web API backend targeting .NET 10.
- Entity Framework Core with SQL Server.
- Excel and CSV import workflows.
- Laptop inventory comparison and audit history.
- RAS baseline and reconciliation processing.
- A React 19 frontend built with Vite.
- Axios-based API communication.
- Tailwind CSS, Recharts, and Lucide React.

The review should focus on actionable findings that improve the code without unnecessarily changing the existing business behavior.

---

## Repository Structure

```text
backend/
  Program.cs
  Controllers/
  Data/
  Helpers/
  Models/
    Entities/
    DTOs/
  Services/
  appsettings.json

frontend/
  src/
    App.jsx
    components/
    pages/
    services/
    utils/
  package.json
  vite.config.js
```

Important backend areas:

- `backend/Program.cs`
- `backend/Controllers/`
- `backend/Data/LaptopDbContext.cs`
- `backend/Services/`
- `backend/Models/Entities/`
- `backend/Models/DTOs/`
- `backend/Helpers/FileUploadValidator.cs`

Important frontend areas:

- `frontend/src/App.jsx`
- `frontend/src/pages/`
- `frontend/src/components/`
- `frontend/src/services/api.js`
- `frontend/src/utils/`
- `frontend/src/main.jsx`

---

## Review Priorities

Review findings in the following order:

1. Functional correctness and data integrity.
2. Security vulnerabilities.
3. Transaction and concurrency problems.
4. Import and reconciliation correctness.
5. Performance and scalability.
6. Error handling and observability.
7. Maintainability and code structure.
8. Coding standards and syntax.
9. Frontend usability and state management.
10. Test coverage and deployment readiness.

Do not report formatting-only issues unless they materially affect readability or violate project conventions.

---

## Finding Severity

Use one of these severity levels:

### Critical

A vulnerability, data corruption risk, or production failure that must be addressed before release.

Examples:

- Unauthorized access to sensitive data.
- SQL injection or unsafe file processing.
- Import confirmation that can corrupt inventory data.
- A transaction that can partially commit business-critical changes.

### High

A serious correctness, security, performance, or reliability concern.

Examples:

- Incorrect RAS reconciliation.
- Race conditions during batch confirmation.
- Unbounded spreadsheet processing.
- Production-wide CORS exposure.
- EF Core queries that cannot be translated correctly.

### Medium

A maintainability or operational issue that could cause defects or make future changes risky.

Examples:

- Duplicated business rules.
- Inconsistent status normalization.
- Missing error handling.
- Large services with too many responsibilities.
- Missing cancellation support.

### Low

A minor improvement or coding-standard issue.

Examples:

- Naming inconsistencies.
- Unnecessary comments.
- Small refactoring opportunities.
- Minor frontend state-management improvements.

---

## Required Review Process

### 1. Understand the business workflow

Trace the complete workflow before reporting findings:

```text
Frontend upload
  -> API preview endpoint
  -> file validation
  -> spreadsheet parsing
  -> row validation
  -> staged import batch
  -> comparison/reconciliation
  -> preview response
  -> confirmation request
  -> database transaction
  -> current inventory/RAS update
  -> audit history
  -> dashboard refresh
```

Review both laptop and RAS workflows.

Pay particular attention to the difference between:

- Initial baseline imports.
- Subsequent reconciliation imports.
- Manual laptop updates.
- Missing laptop records.
- Missing or exited RAS employees.
- Laptops transitioning to `In Stock`.
- Audit-history creation.

---

## Backend Review Checklist

### Controllers

Review the controllers for:

- Correct HTTP status codes.
- Consistent response models.
- Correct route naming.
- Proper validation of query, route, form, and body parameters.
- No business logic that belongs in services.
- No duplicated endpoints.
- No raw exception messages returned to clients.
- Consistent error response format.
- Proper cancellation-token support.
- Correct handling of missing records.
- Protection against excessively large `pageSize` values.
- Correct content type handling for file uploads.

Important controllers include:

- `LaptopController`
- `ImportController`
- `RasController`
- `DashboardController`

### Dependency Injection and Application Startup

Review `backend/Program.cs` for:

- Correct service lifetimes.
- Safe database initialization.
- Production-safe CORS configuration.
- Proper exception handling middleware.
- Correct JSON configuration.
- Health checks.
- Logging configuration.
- Environment-specific behavior.
- Database migration strategy.

Do not recommend `EnsureCreated()` as the long-term production migration strategy. Prefer EF Core migrations.

### Entity Framework Core and Database

Review `LaptopDbContext` and entity classes for:

- Correct primary keys.
- Required and optional fields.
- Appropriate string lengths.
- Appropriate indexes.
- Foreign-key relationships.
- Delete behavior.
- Unique constraints.
- Concurrency protection.
- Use of `AsNoTracking()` for read-only queries.
- Query translation compatibility.
- Accidental use of `[NotMapped]` properties inside LINQ-to-Entities queries.
- N+1 queries.
- Excessive materialization with `ToListAsync()`.
- Missing deterministic ordering before pagination.
- Missing maximum page-size limits.

Do not use compatibility proxy properties marked with `[NotMapped]` in database queries. Use the mapped entity property instead.

For example, if `SAPId` is a `[NotMapped]` proxy for `EmployeeCode`, query `EmployeeCode` directly.

### Import and Spreadsheet Processing

Review:

- `ExcelParserService`
- `RasImportService`
- `ImportService`
- `ComparisonEngine`
- `FileUploadValidator`

Check for:

- Maximum upload size.
- Maximum row and column limits.
- Memory usage.
- File-type validation.
- File signature validation.
- Correct support for `.xlsx`, `.xls`, and `.csv`.
- Empty workbook handling.
- Empty worksheet handling.
- Header detection.
- Duplicate headers.
- Ambiguous header matches.
- Duplicate rows.
- Duplicate serial numbers.
- Duplicate SAP/employee IDs.
- Invalid required fields.
- Invalid dates.
- Culture-dependent date parsing.
- Silent conversion of invalid values to `null`.
- Consistent whitespace and casing normalization.
- Correct handling of blank values.
- Correct batch status transitions.
- Correct error reporting by row and column.
- Safe processing of malformed workbooks.
- Cancellation support for large imports.

Invalid dates should not silently become `null` if the column contains a value. Distinguish between:

- Blank date.
- Valid date.
- Invalid date.

Fuzzy header matching must not silently select an arbitrary column when multiple columns could match. Ambiguous matches should produce a validation error.

### Import Confirmation and Transactions

Review confirmation methods for:

- Confirmation of only valid staged batches.
- Protection against confirming failed batches.
- Protection against confirming an already-confirmed batch.
- Idempotency.
- Concurrent confirmation requests.
- Atomic updates.
- Correct rollback behavior.
- Audit creation before data changes.
- Consistency between batch statistics and persisted rows.
- Correct handling of missing inventory records.
- Correct handling of new, changed, unchanged, and missing rows.
- Correct handling of initial and subsequent RAS baselines.
- Proper logging of failures.
- Avoiding persistence of failure status through a corrupted or invalid `DbContext`.

Batch state transitions should be explicit and validated. Recommended states include:

```text
STAGED
PROCESSING
CONFIRMED
FAILED
```

A concurrent request must not be able to confirm the same batch twice.

### Business Rules and Status Values

Look for repeated string literals such as:

```text
Allocated
In Stock
ACTIVE
INACTIVE
UNKNOWN
LOST
STAGED
CONFIRMED
FAILED
```

Recommend enums or centralized constants where appropriate.

Status normalization must be consistent across:

- Spreadsheet parsing.
- Search filters.
- Manual updates.
- Laptop imports.
- RAS reconciliation.
- Dashboard calculations.
- Export behavior.

Do not report the use of strings alone as a problem if the current design intentionally stores strings in the database. Instead, recommend centralizing the values and configuring enum-to-string conversion where suitable.

### Services and Design

Review services for:

- Single-responsibility violations.
- Excessively large methods.
- Duplicated spreadsheet logic.
- Duplicated filtering logic.
- Duplicated status rules.
- Difficult-to-test static methods.
- Direct coupling between parsing, persistence, and business rules.
- Missing interfaces where abstraction improves testability.
- Excessive use of anonymous response objects.

Potential areas for separation include:

```text
LaptopQueryService
LaptopUpdateService
LaptopExportService
LaptopAuditService
LaptopImportService
RasImportService
RasReconciliationService
SpreadsheetHeaderMapper
SpreadsheetDateParser
```

Only recommend splitting services when there is a clear maintainability or testability benefit.

### Logging and Error Handling

Check that:

- `ILogger<T>` is used for server-side errors.
- Exceptions are logged with useful contextual properties.
- Raw exception messages are not returned to clients.
- Sensitive data is not written to logs.
- Import batch IDs are included in logs.
- User-visible errors are meaningful but not overly technical.
- A centralized exception handler is used where practical.
- Expected validation errors are not logged as server errors.
- Cancellation exceptions are handled correctly.

---

## Frontend Review Checklist

### React Components

Review:

- Component responsibilities.
- State ownership.
- Repeated UI logic.
- Correct use of `useEffect`, `useMemo`, and `useCallback`.
- Unnecessary remounting through changing `key` values.
- Stale closures.
- Missing effect dependencies.
- Loading state behavior.
- Error state behavior.
- Empty state behavior.
- Modal cleanup.
- Accessibility of buttons, dialogs, tables, and forms.

Important pages include:

- `DashboardPage.jsx`
- `LaptopDetailsPage.jsx`
- `ImportPage.jsx`
- `RasDataPage.jsx`
- `BatchMasterPage.jsx`

### API Client

Review `frontend/src/services/api.js` for:

- Consistent API methods.
- Consistent error handling.
- Correct URL encoding.
- Correct multipart form handling.
- Support for request cancellation.
- Consistent response shapes.
- Avoidance of duplicated endpoint definitions.
- Centralized Axios interceptors where appropriate.

### Async Data Loading

Check that pages:

- Display visible errors instead of only using `console.error`.
- Prevent stale responses from overwriting newer results.
- Cancel requests when components unmount.
- Prevent duplicate requests.
- Handle loading transitions correctly.
- Reset pagination when filters change.
- Handle empty results.
- Handle expired or unavailable backend services.

### Import UI

Review the import workflow for:

- Client-side file validation.
- Server-side validation.
- Clear preview and confirmation states.
- Prevention of duplicate submissions.
- Disabled buttons while requests are running.
- Accurate display of row counts.
- Accurate display of validation errors.
- Clear distinction between preview and commit.
- Clear distinction between initial RAS baseline and reconciliation.
- Safe handling of large preview responses.
- Consistent reset behavior after success or failure.

### Navigation and Routing

The application currently uses manual tab state. Consider whether route-based navigation is needed for:

- Deep linking.
- Browser navigation.
- Bookmarkable pages.
- Route-level authorization.
- Refreshing a specific page.

Do not require React Router unless the application requirements justify it.

### Styling and Accessibility

Review:

- Keyboard accessibility.
- Focus management for modals.
- Appropriate semantic HTML.
- Visible focus states.
- Color contrast.
- Table accessibility.
- Error-message accessibility.
- Responsive behavior.
- Consistent Tailwind class usage.

---

## Performance Review Checklist

Look for:

- Loading all database rows into memory unnecessarily.
- `ToListAsync()` before filtering or pagination.
- Missing `AsNoTracking()` for read-only queries.
- Repeated database queries inside loops.
- Large `Contains()` collections.
- Unbounded exports.
- Unbounded spreadsheet processing.
- Expensive global `Contains()` searches.
- Missing indexes for common filters.
- Repeated parsing of the same spreadsheet values.
- Excessive JSON serialization.
- Large raw row payloads returned to the frontend.
- Missing response pagination.
- Expensive dashboard calculations on every request.

The laptop export should not silently truncate results at an arbitrary limit without communicating that limitation to the user.

---

## Security Review Checklist

Check for:

- Unrestricted CORS.
- Missing authentication or authorization requirements.
- Unrestricted file upload.
- File extension validation without content validation.
- File size exhaustion.
- Spreadsheet formula or content risks.
- Sensitive information in logs.
- Raw exception messages.
- SQL injection.
- Unsafe dynamic sorting.
- Unsafe dynamic filtering.
- Insecure database connection configuration.
- Secrets committed to source control.
- Missing HTTPS enforcement in production.
- Missing security headers.
- Excessive API data exposure.
- Missing rate limiting for expensive import endpoints.

Do not assume this internal application is safe because it is intended for internal users.

---

## Testing Expectations

Check whether tests exist for:

### Backend

- File extension validation.
- File signature validation.
- Header matching.
- Missing required headers.
- Duplicate serial numbers.
- Duplicate employee IDs.
- Invalid dates.
- Date culture handling.
- Status normalization.
- Initial laptop baseline import.
- Changed laptop import.
- Missing laptop handling.
- Initial RAS baseline.
- RAS reconciliation.
- Exited employee detection.
- Laptop transition to `In Stock`.
- Manual laptop update.
- Audit-history creation.
- Batch confirmation.
- Concurrent batch confirmation.
- Pagination and filtering.
- Export behavior.

### Frontend

- Import preview flow.
- Confirmation flow.
- Error display.
- Filter reset.
- Pagination reset.
- Modal open and close behavior.
- Dashboard interactions.
- Empty states.
- Loading states.

If tests are missing, report the highest-value test gaps rather than simply stating that test coverage is low.

---

## Review Output Format

For every finding, use this format:

```text
[SEVERITY] Short title

File: path/to/file
Lines: approximate line range

Problem:
Explain the issue and why it matters.

Recommendation:
Describe the preferred improvement.

Suggested implementation:
Include a concise code example only when useful.
```

Example:

```text
[HIGH] Query uses an unmapped EF Core property

File: backend/Services/RasImportService.cs
Lines: 376-379

Problem:
The query selects RASCurrent.SAPId, but SAPId is marked [NotMapped] and is only a compatibility proxy for EmployeeCode. EF Core may fail to translate this query.

Recommendation:
Query the mapped EmployeeCode property directly.

Suggested implementation:

var previousSaps = await _db.RASCurrents
    .Select(r => r.EmployeeCode)
    .Distinct()
    .ToListAsync(cancellationToken);
```

---

## Review Rules

1. Report only findings supported by the code.
2. Do not invent runtime behavior that cannot be inferred from the repository.
3. Separate correctness issues from style preferences.
4. Prefer concrete recommendations over general advice.
5. Include the file path and approximate line range.
6. Explain the business or technical impact.
7. Avoid reporting the same issue multiple times.
8. Group related findings when they share the same root cause.
9. Distinguish confirmed defects from improvement suggestions.
10. Prioritize findings that could cause data loss, security exposure, or production failure.
11. Consider both backend and frontend behavior.
12. Review the complete workflow before judging an individual method.
13. Do not recommend large architectural changes without explaining the benefit.
14. Preserve existing business behavior unless the behavior is clearly incorrect or unsafe.
15. Mention when a recommendation requires a database migration, API contract change, or frontend change.

---

## Final Review Summary

End the review with:

```text
## Summary

### Findings by severity
- Critical: X
- High: X
- Medium: X
- Low: X

### Main risks
- ...

### Recommended next steps
1. ...
2. ...
3. ...

### Positive observations
- Mention useful patterns, good separation, validation, transaction use, or user-friendly workflow already present.
```

The review should be constructive, specific, and suitable for sharing directly with the developer.