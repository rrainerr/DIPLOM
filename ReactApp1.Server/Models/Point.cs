using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Point
{
    public long IdPoint { get; set; }

    public double? Depth { get; set; }

    public long? IdWell { get; set; }

    public long? IdStem { get; set; }

    public virtual Stem? IdStemNavigation { get; set; }

    public virtual Well? IdWellNavigation { get; set; }
}
