using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class WellSlant
{
    public long IdWellSlant { get; set; }

    public double? Height { get; set; }

    public long? IdWell { get; set; }

    public double? Slant { get; set; }

    public double? Azimuth { get; set; }

    public virtual Well? IdWellNavigation { get; set; }
}
