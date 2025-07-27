using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Link
{
    public long IdLink { get; set; }

    public long? IdWell { get; set; }

    public long? WellLink { get; set; }

    public double? Lastratio { get; set; }

    public long? Status { get; set; }

    public virtual Well? IdWellNavigation { get; set; }

    public virtual ICollection<Measuring> Measurings { get; set; } = new List<Measuring>();
}
