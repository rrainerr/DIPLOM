using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class WellDatum
{
    public long IdWellData { get; set; }

    public long? IdWell { get; set; }

    public double? Rate { get; set; }

    public double? BottomholePressure { get; set; }

    public long? Year { get; set; }

    public long? Month { get; set; }

    public virtual Well? IdWellNavigation { get; set; }
}
