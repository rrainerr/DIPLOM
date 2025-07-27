using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Ngdu
{
    public long IdNgdu { get; set; }

    public string? Name { get; set; }

    public virtual ICollection<Workshop> Workshops { get; set; } = new List<Workshop>();
}
