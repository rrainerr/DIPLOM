using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Stem
{
    public long IdStem { get; set; }

    public double? Depth { get; set; }

    public long? IdWell { get; set; }

    public long? IdHorizont { get; set; }

    public long? Work { get; set; }

    public string? Name { get; set; }

    public long? IdTypeStems { get; set; }

    public virtual Horizont? IdHorizontNavigation { get; set; }

    public virtual TypeStem? IdTypeStemsNavigation { get; set; }

    public virtual Well? IdWellNavigation { get; set; }

    public virtual ICollection<Point> Points { get; set; } = new List<Point>();
}
