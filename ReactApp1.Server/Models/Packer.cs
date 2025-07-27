using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Packer
{
    public long IdPacker { get; set; }

    public long? IdWell { get; set; }

    public double? Depth { get; set; }

    public string? Name { get; set; }

    public virtual Well? IdWellNavigation { get; set; }
}
