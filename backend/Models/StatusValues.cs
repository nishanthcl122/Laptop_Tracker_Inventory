namespace LaptopTracking.Api.Models;

public static class LaptopStatuses
{
    public const string Allocated = "Allocated";
    public const string AllocatedLegacy = "ALLOCATED";
    public const string InStock = "In Stock";
    public const string InStockLegacy = "IN_STOCK";
}

public static class RasStatuses
{
    public const string Active = "ACTIVE";
    public const string Inactive = "INACTIVE";
    public const string Lost = "LOST";
    public const string NotInUhg = "NOT_IN_UHG";
    public const string Unknown = "UNKNOWN";
}

public static class ImportBatchStatuses
{
    public const string Staged = "STAGED";
    public const string Confirmed = "CONFIRMED";
    public const string Committed = "COMMITTED";
    public const string Failed = "FAILED";
}

public static class ImportBatchTypes
{
    public const string Laptop = "LAPTOP";
    public const string Ras = "RAS";
}

public static class ImportRowValidationStatuses
{
    public const string Valid = "VALID";
    public const string Invalid = "INVALID";
}