using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Measuring
{
    public long IdMeasuring { get; set; }

    public double? Ratio { get; set; }

    public DateTime? DateReading { get; set; }

    public long? IdLink { get; set; }

    public long? IdUsers { get; set; }

    public virtual Link? IdLinkNavigation { get; set; }

    public virtual User? IdUsersNavigation { get; set; }
}
