using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace ReactApp1.Server.Models;

public partial class PostgresContext : DbContext
{
    public PostgresContext()
    {
    }

    public PostgresContext(DbContextOptions<PostgresContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Field> Fields { get; set; }

    public virtual DbSet<Horizont> Horizonts { get; set; }

    public virtual DbSet<Link> Links { get; set; }

    public virtual DbSet<Measuring> Measurings { get; set; }

    public virtual DbSet<Ngdu> Ngdus { get; set; }

    public virtual DbSet<Packer> Packers { get; set; }

    public virtual DbSet<Point> Points { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<SkinFactor> SkinFactors { get; set; }

    public virtual DbSet<Stem> Stems { get; set; }

    public virtual DbSet<Type> Types { get; set; }

    public virtual DbSet<TypeStem> TypeStems { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Well> Wells { get; set; }

    public virtual DbSet<WellDatum> WellData { get; set; }

    public virtual DbSet<WellSlant> WellSlants { get; set; }

    public virtual DbSet<Workshop> Workshops { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=root");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Field>(entity =>
        {
            entity.HasKey(e => e.IdField).HasName("field_pk");

            entity.ToTable("field");

            entity.Property(e => e.IdField)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_field");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
        });

        modelBuilder.Entity<Horizont>(entity =>
        {
            entity.HasKey(e => e.IdHorizont).HasName("horizont_pk");

            entity.ToTable("horizont");

            entity.Property(e => e.IdHorizont)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_horizont");
            entity.Property(e => e.Compressibility)
                .HasDefaultValueSql("0.0001")
                .HasColumnName("compressibility");
            entity.Property(e => e.IdField).HasColumnName("id_field");
            entity.Property(e => e.IdWell).HasColumnName("id_well");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.Permeability)
                .HasDefaultValueSql("50")
                .HasColumnName("permeability");
            entity.Property(e => e.Porosity)
                .HasDefaultValueSql("0.2")
                .HasColumnName("porosity");
            entity.Property(e => e.Roof).HasColumnName("roof");
            entity.Property(e => e.Sole).HasColumnName("sole");
            entity.Property(e => e.SostPl).HasColumnName("sost_pl");
            entity.Property(e => e.Thickness)
                .HasDefaultValueSql("10")
                .HasColumnName("thickness");
            entity.Property(e => e.Viscosity)
                .HasDefaultValueSql("1")
                .HasColumnName("viscosity");

            entity.HasOne(d => d.IdFieldNavigation).WithMany(p => p.Horizonts)
                .HasForeignKey(d => d.IdField)
                .HasConstraintName("horizont_field_fk");

            entity.HasOne(d => d.IdWellNavigation).WithMany(p => p.Horizonts)
                .HasForeignKey(d => d.IdWell)
                .HasConstraintName("horizont_well_fk");
        });

        modelBuilder.Entity<Link>(entity =>
        {
            entity.HasKey(e => e.IdLink).HasName("link_pk");

            entity.ToTable("link");

            entity.Property(e => e.IdLink)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_link");
            entity.Property(e => e.IdWell).HasColumnName("id_well");
            entity.Property(e => e.Lastratio).HasColumnName("lastratio");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.WellLink).HasColumnName("well_link");

            entity.HasOne(d => d.IdWellNavigation).WithMany(p => p.Links)
                .HasForeignKey(d => d.IdWell)
                .HasConstraintName("link_well_fk");
        });

        modelBuilder.Entity<Measuring>(entity =>
        {
            entity.HasKey(e => e.IdMeasuring).HasName("measuring_pk");

            entity.ToTable("measuring");

            entity.Property(e => e.IdMeasuring)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_measuring");
            entity.Property(e => e.DateReading)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("date_reading");
            entity.Property(e => e.IdLink).HasColumnName("id_link");
            entity.Property(e => e.IdUsers).HasColumnName("id_users");
            entity.Property(e => e.Ratio).HasColumnName("ratio");

            entity.HasOne(d => d.IdLinkNavigation).WithMany(p => p.Measurings)
                .HasForeignKey(d => d.IdLink)
                .HasConstraintName("measuring_link_fk");

            entity.HasOne(d => d.IdUsersNavigation).WithMany(p => p.Measurings)
                .HasForeignKey(d => d.IdUsers)
                .HasConstraintName("measuring_users_fk");
        });

        modelBuilder.Entity<Ngdu>(entity =>
        {
            entity.HasKey(e => e.IdNgdu).HasName("ngdu_pk");

            entity.ToTable("ngdu");

            entity.Property(e => e.IdNgdu)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_ngdu");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
        });

        modelBuilder.Entity<Packer>(entity =>
        {
            entity.HasKey(e => e.IdPacker).HasName("packer_pk");

            entity.ToTable("packer");

            entity.Property(e => e.IdPacker)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_packer");
            entity.Property(e => e.Depth).HasColumnName("depth");
            entity.Property(e => e.IdWell).HasColumnName("id_well");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");

            entity.HasOne(d => d.IdWellNavigation).WithMany(p => p.Packers)
                .HasForeignKey(d => d.IdWell)
                .HasConstraintName("packer_well_fk");
        });

        modelBuilder.Entity<Point>(entity =>
        {
            entity.HasKey(e => e.IdPoint).HasName("point_pk");

            entity.ToTable("point");

            entity.Property(e => e.IdPoint)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_point");
            entity.Property(e => e.Depth).HasColumnName("depth");
            entity.Property(e => e.IdStem).HasColumnName("id_stem");
            entity.Property(e => e.IdWell).HasColumnName("id_well");

            entity.HasOne(d => d.IdStemNavigation).WithMany(p => p.Points)
                .HasForeignKey(d => d.IdStem)
                .HasConstraintName("point_stem_fk");

            entity.HasOne(d => d.IdWellNavigation).WithMany(p => p.Points)
                .HasForeignKey(d => d.IdWell)
                .HasConstraintName("point_well_fk");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.IdRole).HasName("role_pk");

            entity.ToTable("role");

            entity.Property(e => e.IdRole)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_role");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
        });

        modelBuilder.Entity<SkinFactor>(entity =>
        {
            entity.HasKey(e => e.IdSkinFactor).HasName("skin_factor_pk");

            entity.ToTable("skin_factor");

            entity.Property(e => e.IdSkinFactor)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_skin_factor");
            entity.Property(e => e.Date)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("date");
            entity.Property(e => e.IdWell).HasColumnName("id_well");
            entity.Property(e => e.SkinFactor1).HasColumnName("skin_factor");

            entity.HasOne(d => d.IdWellNavigation).WithMany(p => p.SkinFactors)
                .HasForeignKey(d => d.IdWell)
                .HasConstraintName("skin_factor_well_fk");
        });

        modelBuilder.Entity<Stem>(entity =>
        {
            entity.HasKey(e => e.IdStem).HasName("stem_pk");

            entity.ToTable("stem");

            entity.Property(e => e.IdStem)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_stem");
            entity.Property(e => e.Depth).HasColumnName("depth");
            entity.Property(e => e.IdHorizont).HasColumnName("id_horizont");
            entity.Property(e => e.IdTypeStems).HasColumnName("id_type_stems");
            entity.Property(e => e.IdWell).HasColumnName("id_well");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.Work).HasColumnName("work");

            entity.HasOne(d => d.IdHorizontNavigation).WithMany(p => p.Stems)
                .HasForeignKey(d => d.IdHorizont)
                .HasConstraintName("stem_horizont_fk");

            entity.HasOne(d => d.IdTypeStemsNavigation).WithMany(p => p.Stems)
                .HasForeignKey(d => d.IdTypeStems)
                .HasConstraintName("stem_type_stems_fk");

            entity.HasOne(d => d.IdWellNavigation).WithMany(p => p.Stems)
                .HasForeignKey(d => d.IdWell)
                .HasConstraintName("stem_well_fk");
        });

        modelBuilder.Entity<Type>(entity =>
        {
            entity.HasKey(e => e.IdType).HasName("type_pk");

            entity.ToTable("type");

            entity.Property(e => e.IdType)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_type");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
        });

        modelBuilder.Entity<TypeStem>(entity =>
        {
            entity.HasKey(e => e.IdTypeStems).HasName("type_stems_pk");

            entity.ToTable("type_stems");

            entity.Property(e => e.IdTypeStems)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_type_stems");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.IdUsers).HasName("users_pk");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "users_unique").IsUnique();

            entity.Property(e => e.IdUsers)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_users");
            entity.Property(e => e.Email)
                .HasColumnType("character varying")
                .HasColumnName("email");
            entity.Property(e => e.FirstName)
                .HasColumnType("character varying")
                .HasColumnName("first_name");
            entity.Property(e => e.IdRole).HasColumnName("id_role");
            entity.Property(e => e.IdWorkshop).HasColumnName("id_workshop");
            entity.Property(e => e.LastName)
                .HasColumnType("character varying")
                .HasColumnName("last_name");
            entity.Property(e => e.Password)
                .HasColumnType("character varying")
                .HasColumnName("password");
            entity.Property(e => e.Surname)
                .HasColumnType("character varying")
                .HasColumnName("surname");

            entity.HasOne(d => d.IdRoleNavigation).WithMany(p => p.Users)
                .HasForeignKey(d => d.IdRole)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("users_role_fk");

            entity.HasOne(d => d.IdWorkshopNavigation).WithMany(p => p.Users)
                .HasForeignKey(d => d.IdWorkshop)
                .HasConstraintName("users_workshop_fk");
        });

        modelBuilder.Entity<Well>(entity =>
        {
            entity.HasKey(e => e.IdWell).HasName("well_pk");

            entity.ToTable("well");

            entity.Property(e => e.IdWell)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_well");
            entity.Property(e => e.DrainageRadius).HasColumnName("drainage_radius");
            entity.Property(e => e.IdType).HasColumnName("id_type");
            entity.Property(e => e.IdWorkshop).HasColumnName("id_workshop");
            entity.Property(e => e.Latitude)
                .HasColumnType("character varying")
                .HasColumnName("latitude");
            entity.Property(e => e.Longitude)
                .HasColumnType("character varying")
                .HasColumnName("longitude");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.WellRadius).HasColumnName("well_radius");

            entity.HasOne(d => d.IdTypeNavigation).WithMany(p => p.Wells)
                .HasForeignKey(d => d.IdType)
                .HasConstraintName("well_type_fk");

            entity.HasOne(d => d.IdWorkshopNavigation).WithMany(p => p.Wells)
                .HasForeignKey(d => d.IdWorkshop)
                .HasConstraintName("well_workshop_fk");
        });

        modelBuilder.Entity<WellDatum>(entity =>
        {
            entity.HasKey(e => e.IdWellData).HasName("well_data_pk");

            entity.ToTable("well_data");

            entity.Property(e => e.IdWellData)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_well_data");
            entity.Property(e => e.BottomholePressure).HasColumnName("bottomhole_pressure");
            entity.Property(e => e.IdWell).HasColumnName("id_well");
            entity.Property(e => e.Month).HasColumnName("month");
            entity.Property(e => e.Rate).HasColumnName("rate");
            entity.Property(e => e.Year).HasColumnName("year");

            entity.HasOne(d => d.IdWellNavigation).WithMany(p => p.WellData)
                .HasForeignKey(d => d.IdWell)
                .HasConstraintName("well_data_well_fk");
        });

        modelBuilder.Entity<WellSlant>(entity =>
        {
            entity.HasKey(e => e.IdWellSlant).HasName("well_slant_pk");

            entity.ToTable("well_slant");

            entity.Property(e => e.IdWellSlant)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_well_slant");
            entity.Property(e => e.Azimuth).HasColumnName("azimuth");
            entity.Property(e => e.Height).HasColumnName("height");
            entity.Property(e => e.IdWell).HasColumnName("id_well");
            entity.Property(e => e.Slant).HasColumnName("slant");

            entity.HasOne(d => d.IdWellNavigation).WithMany(p => p.WellSlants)
                .HasForeignKey(d => d.IdWell)
                .HasConstraintName("well_slant_well_fk");
        });

        modelBuilder.Entity<Workshop>(entity =>
        {
            entity.HasKey(e => e.IdWorkshop).HasName("workshop_pk");

            entity.ToTable("workshop");

            entity.Property(e => e.IdWorkshop)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id_workshop");
            entity.Property(e => e.IdNgdu).HasColumnName("id_ngdu");
            entity.Property(e => e.IdType).HasColumnName("id_type");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");

            entity.HasOne(d => d.IdNgduNavigation).WithMany(p => p.Workshops)
                .HasForeignKey(d => d.IdNgdu)
                .HasConstraintName("workshop_ngdu_fk");

            entity.HasOne(d => d.IdTypeNavigation).WithMany(p => p.Workshops)
                .HasForeignKey(d => d.IdType)
                .HasConstraintName("workshop_type_fk");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
