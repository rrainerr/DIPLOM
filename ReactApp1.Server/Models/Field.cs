using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Field
{
    public long IdField { get; set; }

    public string? Name { get; set; }

    public virtual ICollection<Horizont> Horizonts { get; set; } = new List<Horizont>();
}
