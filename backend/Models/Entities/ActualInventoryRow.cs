namespace LaptopTracking.Api.Models.Entities;

public class ActualInventoryRow
{
    public int Id { get; set; }
    public int BatchId { get; set; }
    public DateOnly SnapshotDate { get; set; }
    public string FbrId { get; set; } = string.Empty;
    public string PoNumber { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public int SystemStockFromFile { get; set; }
    public int ActualStock { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
    public ActualInventoryUpload Upload { get; set; } = null!;
}
