using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class SkinFactor
{
    public long IdSkinFactor { get; set; }

    public double? SkinFactor1 { get; set; }

    public DateTime? Date { get; set; }

    public long? IdWell { get; set; }

    public virtual Well? IdWellNavigation { get; set; }
}
