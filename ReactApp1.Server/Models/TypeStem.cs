using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class TypeStem
{
    public long IdTypeStems { get; set; }

    public string? Name { get; set; }

    public virtual ICollection<Stem> Stems { get; set; } = new List<Stem>();
}
