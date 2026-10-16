namespace LaptopTracking.Api.Models.Entities;

public class ActualInventoryUpload
{
    public int BatchId { get; set; }
    public DateOnly SnapshotDate { get; set; }
    public string FileName { get; set; } = string.Empty;
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<ActualInventoryRow> Rows { get; set; } = new List<ActualInventoryRow>();
}
