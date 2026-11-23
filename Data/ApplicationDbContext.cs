using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using web_ca_3.Models;

namespace web_ca_3.Data;

public class ApplicationDbContext : IdentityDbContext<IdentityUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<DiningHall> DiningHalls => Set<DiningHall>();
    public DbSet<MealMenu> MealMenus => Set<MealMenu>();
    public DbSet<MealBooking> MealBookings => Set<MealBooking>();
    public DbSet<MealAttendance> MealAttendances => Set<MealAttendance>();
    public DbSet<WasteRecord> WasteRecords => Set<WasteRecord>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<MealBooking>()
            .HasIndex(x => new { x.StudentId, x.DiningHallId, x.MealDate, x.MealType })
            .IsUnique();

        builder.Entity<MealMenu>()
            .HasIndex(x => new { x.DiningHallId, x.ServiceDate, x.MealType })
            .IsUnique();
    }
}
