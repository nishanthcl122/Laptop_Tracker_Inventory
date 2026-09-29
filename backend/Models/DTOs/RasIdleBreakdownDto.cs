using System.Collections.Generic;

namespace LaptopTracking.Api.Models.DTOs;

public class RasIdleBreakdownDto
{
    public int Total { get; set; }
    public RasIdleOffshoreBreakdownDto Offshore { get; set; } = new();
    public int Onsite { get; set; }
    public int Nearshore { get; set; }
    public int Unknown { get; set; }
}

public class RasIdleOffshoreBreakdownDto
{
    public int Total { get; set; }
    public int Billable { get; set; }
    public int Unbillable { get; set; }
    public List<RasIdlePsaCountDto> BillableByPsa { get; set; } = [];
}

public class RasIdlePsaCountDto
{
    public string Psa { get; set; } = string.Empty;
    public int Count { get; set; }
}
