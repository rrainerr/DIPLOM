using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Type
{
    public long IdType { get; set; }

    public string? Name { get; set; }

    public virtual ICollection<Well> Wells { get; set; } = new List<Well>();

    public virtual ICollection<Workshop> Workshops { get; set; } = new List<Workshop>();
}
