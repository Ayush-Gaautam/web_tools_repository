using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web_ca_3.Data;
using web_ca_3.Models;

namespace web_ca_3.Controllers;

[Authorize(Roles = "Admin,Manager")]
public class AdminController : Controller
{
    private readonly ApplicationDbContext _db;

    public AdminController(ApplicationDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        ViewBag.Halls = await _db.DiningHalls.ToListAsync();
        ViewBag.Menus = await _db.MealMenus.Include(x => x.DiningHall).OrderByDescending(x => x.ServiceDate).Take(40).ToListAsync();
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Hall(string name, int capacity)
    {
        if (string.IsNullOrWhiteSpace(name) || capacity < 1)
        {
            TempData["Error"] = "Enter a hall name and positive capacity.";
            return RedirectToAction(nameof(Index));
        }
        _db.DiningHalls.Add(new DiningHall { Name = name.Trim(), Capacity = capacity });
        await _db.SaveChangesAsync();
        TempData["Success"] = "Dining hall added.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Menu(int diningHallId, string mealType, string dishName, int preparedQuantity, decimal estimatedCost)
    {
        var date = DateTime.UtcNow.Date;
        var existing = await _db.MealMenus.FirstOrDefaultAsync(x =>
            x.DiningHallId == diningHallId && x.ServiceDate == date && x.MealType == mealType);
        if (existing is null)
            _db.MealMenus.Add(new MealMenu
            {
                DiningHallId = diningHallId,
                MealType = mealType,
                DishName = dishName,
                ServiceDate = date,
                PreparedQuantity = preparedQuantity,
                EstimatedCost = estimatedCost
            });
        else
        {
            existing.DishName = dishName;
            existing.PreparedQuantity = preparedQuantity;
            existing.EstimatedCost = estimatedCost;
        }
        await _db.SaveChangesAsync();
        TempData["Success"] = "Menu saved.";
        return RedirectToAction(nameof(Index));
    }
}
