using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web_ca_3.Data;

namespace web_ca_3.Controllers;

[Authorize]
public class HomeController : Controller
{
    private readonly ApplicationDbContext _db;

    public HomeController(ApplicationDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        ViewBag.Today = DateTime.UtcNow.Date;
        ViewBag.Halls = await _db.DiningHalls.CountAsync(x => x.IsActive);
        ViewBag.TodayBookings = await _db.MealBookings.CountAsync(x =>
            x.MealDate == DateTime.UtcNow.Date && !x.IsCancelled);
        ViewBag.TodayWaste = await _db.WasteRecords
            .Where(x => x.RecordedAt.Date == DateTime.UtcNow.Date)
            .SumAsync(x => (decimal?)x.QuantityKg) ?? 0;
        ViewBag.Menus = await _db.MealMenus
            .Include(x => x.DiningHall)
            .Where(x => x.ServiceDate == DateTime.UtcNow.Date)
            .ToListAsync();

        if (User.IsInRole("Student")) ViewBag.RoleDashboard = "Student";
        else if (User.IsInRole("Kitchen")) ViewBag.RoleDashboard = "Kitchen";
        else if (User.IsInRole("Manager")) ViewBag.RoleDashboard = "Manager";
        else if (User.IsInRole("Admin")) ViewBag.RoleDashboard = "Admin";

        return View();
    }

    [AllowAnonymous]
    public IActionResult Error() => View();
}
