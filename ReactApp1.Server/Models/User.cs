using System;
using System.Collections.Generic;

namespace ReactApp1.Server.Models;

public partial class User
{
    public long IdUsers { get; set; }

    public string Email { get; set; } = null!;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? Surname { get; set; }

    public string Password { get; set; } = null!;

    public long IdRole { get; set; }

    public long? IdWorkshop { get; set; }

    public virtual Role IdRoleNavigation { get; set; } = null!;

    public virtual Workshop? IdWorkshopNavigation { get; set; }

    public virtual ICollection<Measuring> Measurings { get; set; } = new List<Measuring>();
}
