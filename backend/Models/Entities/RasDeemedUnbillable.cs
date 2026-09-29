using System;

namespace LaptopTracking.Api.Models.Entities;

public class RasDeemedUnbillable
{
    public long DeemedUnbillableId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
}
