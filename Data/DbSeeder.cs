using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using web_ca_3.Models;

namespace web_ca_3.Data;

public static class DbSeeder
{
    private static readonly (string Email, string Password, string Role)[] DemoUsers =
    {
        ("admin@mess.local", "Admin123!", "Admin"),
        ("manager@mess.local", "Manager123!", "Manager"),
        ("kitchen@mess.local", "Kitchen123!", "Kitchen"),
        ("student@mess.local", "Student123!", "Student")
    };

    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        await EnsureDomainSchemaAsync(db);
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<IdentityUser>>();

        foreach (var role in new[] { "Admin", "Manager", "Kitchen", "Student" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        foreach (var (email, password, role) in DemoUsers)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
                var created = await userManager.CreateAsync(user, password);
                if (!created.Succeeded)
                    throw new InvalidOperationException(string.Join("; ", created.Errors.Select(x => x.Description)));
            }
            if (!await userManager.IsInRoleAsync(user, role))
                await userManager.AddToRoleAsync(user, role);
        }

        if (!db.DiningHalls.Any())
        {
            db.DiningHalls.AddRange(
                new DiningHall { Name = "North Hall", Capacity = 500, IsActive = true },
                new DiningHall { Name = "South Hall", Capacity = 350, IsActive = true });
            await db.SaveChangesAsync();
        }

        if (!db.MealMenus.Any())
        {
            var halls = db.DiningHalls.ToList();
            var today = DateTime.UtcNow.Date;
            foreach (var hall in halls)
            {
                db.MealMenus.AddRange(
                    new MealMenu { DiningHallId = hall.Id, MealType = "Breakfast", DishName = "Poha, Tea & Fruit", ServiceDate = today, PreparedQuantity = 240, EstimatedCost = 4800 },
                    new MealMenu { DiningHallId = hall.Id, MealType = "Lunch", DishName = "Dal Tadka, Rice & Roti", ServiceDate = today, PreparedQuantity = 420, EstimatedCost = 8400 },
                    new MealMenu { DiningHallId = hall.Id, MealType = "Dinner", DishName = "Paneer Curry, Roti & Salad", ServiceDate = today, PreparedQuantity = 380, EstimatedCost = 7600 });
            }
            await db.SaveChangesAsync();
        }

        if (!db.MealAttendances.Any())
        {
            var halls = db.DiningHalls.ToList();
            var random = new Random(402);
            for (var offset = 29; offset >= 0; offset--)
            {
                var date = DateTime.UtcNow.Date.AddDays(-offset);
                foreach (var hall in halls)
                foreach (var meal in new[] { "Breakfast", "Lunch", "Dinner" })
                {
                    var baseCount = meal == "Lunch" ? 310 : meal == "Dinner" ? 280 : 190;
                    db.MealAttendances.Add(new MealAttendance
                    {
                        DiningHallId = hall.Id,
                        ServiceDate = date,
                        MealType = meal,
                        Count = baseCount + random.Next(-45, 55)
                    });
                }
            }
            await db.SaveChangesAsync();
        }

        if (!db.WasteRecords.Any())
        {
            var hallId = db.DiningHalls.First().Id;
            var today = DateTime.UtcNow.Date;
            db.WasteRecords.AddRange(
                new WasteRecord { DiningHallId = hallId, MealType = "Lunch", DishName = "Dal Tadka", RecordedAt = today, QuantityKg = 12.5m, Cost = 625 },
                new WasteRecord { DiningHallId = hallId, MealType = "Dinner", DishName = "Paneer Curry", RecordedAt = today.AddDays(-1), QuantityKg = 8.2m, Cost = 492 });
            await db.SaveChangesAsync();
        }
    }

    private static async Task EnsureDomainSchemaAsync(ApplicationDbContext db)
    {
        if (!db.Database.IsSqlite()) return;

        var statements = new[]
        {
            """
            CREATE TABLE IF NOT EXISTS "DiningHalls" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_DiningHalls" PRIMARY KEY AUTOINCREMENT,
                "Name" TEXT NOT NULL,
                "Capacity" INTEGER NOT NULL,
                "IsActive" INTEGER NOT NULL
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS "MealMenus" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_MealMenus" PRIMARY KEY AUTOINCREMENT,
                "DiningHallId" INTEGER NOT NULL,
                "MealType" TEXT NOT NULL,
                "DishName" TEXT NOT NULL,
                "ServiceDate" TEXT NOT NULL,
                "PreparedQuantity" INTEGER NOT NULL,
                "EstimatedCost" TEXT NOT NULL,
                CONSTRAINT "FK_MealMenus_DiningHalls_DiningHallId"
                    FOREIGN KEY ("DiningHallId") REFERENCES "DiningHalls" ("Id") ON DELETE CASCADE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS "MealBookings" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_MealBookings" PRIMARY KEY AUTOINCREMENT,
                "StudentId" TEXT NOT NULL,
                "DiningHallId" INTEGER NOT NULL,
                "MealDate" TEXT NOT NULL,
                "MealType" TEXT NOT NULL,
                "IsCancelled" INTEGER NOT NULL,
                CONSTRAINT "FK_MealBookings_DiningHalls_DiningHallId"
                    FOREIGN KEY ("DiningHallId") REFERENCES "DiningHalls" ("Id") ON DELETE CASCADE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS "MealAttendances" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_MealAttendances" PRIMARY KEY AUTOINCREMENT,
                "DiningHallId" INTEGER NOT NULL,
                "ServiceDate" TEXT NOT NULL,
                "MealType" TEXT NOT NULL,
                "Count" INTEGER NOT NULL,
                CONSTRAINT "FK_MealAttendances_DiningHalls_DiningHallId"
                    FOREIGN KEY ("DiningHallId") REFERENCES "DiningHalls" ("Id") ON DELETE CASCADE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS "WasteRecords" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_WasteRecords" PRIMARY KEY AUTOINCREMENT,
                "DiningHallId" INTEGER NOT NULL,
                "MealType" TEXT NOT NULL,
                "DishName" TEXT NOT NULL,
                "RecordedAt" TEXT NOT NULL,
                "QuantityKg" TEXT NOT NULL,
                "Cost" TEXT NOT NULL,
                CONSTRAINT "FK_WasteRecords_DiningHalls_DiningHallId"
                    FOREIGN KEY ("DiningHallId") REFERENCES "DiningHalls" ("Id") ON DELETE CASCADE
            );
            """,
        };

        foreach (var statement in statements)
            await db.Database.ExecuteSqlRawAsync(statement);
    }
}
