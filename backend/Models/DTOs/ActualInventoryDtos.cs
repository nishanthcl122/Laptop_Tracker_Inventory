namespace LaptopTracking.Api.Models.DTOs;

public class ActualInventoryLocationSummaryDto
{
    public string Location { get; set; } = string.Empty;
    public int ActualStock { get; set; }
}

public class ActualInventoryItemDto
{
    public string FbrId { get; set; } = string.Empty;
    public int SystemStock { get; set; }
    public int ActualStock { get; set; }
    public int Difference { get; set; }
}

public class ActualInventoryLocationDto
{
    public string Location { get; set; } = string.Empty;
    public int SystemStock { get; set; }
    public int ActualStock { get; set; }
    public int Variance { get; set; }
    public List<ActualInventoryItemDto> Items { get; set; } = [];
}

public class ActualInventoryUploadResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int BatchId { get; set; }
    public DateOnly SnapshotDate { get; set; }
    public int RecordCount { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
}
