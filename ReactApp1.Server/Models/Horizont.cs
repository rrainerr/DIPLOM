using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ReactApp1.Server.Models;

public partial class Horizont
{
    public long IdHorizont { get; set; }

    public long IdField { get; set; }

    public double? Roof { get; set; }

    public double? Sole { get; set; }

    public string Name { get; set; } = null!;

    public double? Porosity { get; set; }

    public double? Thickness { get; set; }

    public double? Viscosity { get; set; }

    public double? Permeability { get; set; }

    public double? Compressibility { get; set; }

    public long IdWell { get; set; }

    public long? SostPl { get; set; }

    public virtual Field? IdFieldNavigation { get; set; }

    public virtual Well? IdWellNavigation { get; set; }

    public virtual ICollection<Stem> Stems { get; set; } = new List<Stem>();
}