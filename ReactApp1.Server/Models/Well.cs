using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Well
{
    public long IdWell { get; set; }

    public string? Name { get; set; }

    public string? Longitude { get; set; }

    public string? Latitude { get; set; }

    public long? IdWorkshop { get; set; }

    public long? IdType { get; set; }

    public double? DrainageRadius { get; set; }

    public double? WellRadius { get; set; }

    public virtual ICollection<Horizont> Horizonts { get; set; } = new List<Horizont>();

    public virtual Type? IdTypeNavigation { get; set; }

    public virtual Workshop? IdWorkshopNavigation { get; set; }

    public virtual ICollection<Link> Links { get; set; } = new List<Link>();

    public virtual ICollection<Packer> Packers { get; set; } = new List<Packer>();

    public virtual ICollection<Point> Points { get; set; } = new List<Point>();

    public virtual ICollection<SkinFactor> SkinFactors { get; set; } = new List<SkinFactor>();

    public virtual ICollection<Stem> Stems { get; set; } = new List<Stem>();

    public virtual ICollection<WellDatum> WellData { get; set; } = new List<WellDatum>();

    public virtual ICollection<WellSlant> WellSlants { get; set; } = new List<WellSlant>();
}
