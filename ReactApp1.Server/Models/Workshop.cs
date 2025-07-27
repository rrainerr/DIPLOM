using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class Workshop
{
    public string? Name { get; set; }

    public long? IdNgdu { get; set; }

    public long IdWorkshop { get; set; }

    public long? IdType { get; set; }

    public virtual Ngdu? IdNgduNavigation { get; set; }

    public virtual Type? IdTypeNavigation { get; set; }

    public virtual ICollection<User> Users { get; set; } = new List<User>();

    public virtual ICollection<Well> Wells { get; set; } = new List<Well>();
}
