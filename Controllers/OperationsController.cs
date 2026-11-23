using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web_ca_3.Data;
using web_ca_3.Models;
using System.Security.Claims;

namespace web_ca_3.Controllers;

[Authorize]
public class OperationsController : Controller
{
    private readonly ApplicationDbContext _db;

    public OperationsController(ApplicationDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        ViewBag.Halls = await _db.DiningHalls.Where(x => x.IsActive).ToListAsync();
        ViewBag.Attendance = await _db.MealAttendances
            .Include(x => x.DiningHall)
            .OrderByDescending(x => x.ServiceDate)
            .Take(30)
            .ToListAsync();
        ViewBag.Waste = await _db.WasteRecords
            .Include(x => x.DiningHall)
            .OrderByDescending(x => x.RecordedAt)
            .Take(30)
            .ToListAsync();
        ViewBag.Menus = await _db.MealMenus
            .Include(x => x.DiningHall)
            .Where(x => x.ServiceDate == DateTime.UtcNow.Date)
            .ToListAsync();
        ViewBag.MyBookings = await _db.MealBookings
            .Include(x => x.DiningHall)
            .Where(x => x.StudentId == User.FindFirstValue(ClaimTypes.NameIdentifier))
            .OrderByDescending(x => x.MealDate)
            .ToListAsync();
        return View();
    }

    [Authorize(Roles = "Student,Admin")]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Book(int diningHallId, string mealType)
    {
        if (DateTime.UtcNow.TimeOfDay >= TimeSpan.FromHours(10) && mealType == "Lunch")
        {
            TempData["Error"] = "Lunch bookings close at 10:00.";
            return RedirectToAction(nameof(Index));
        }

        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var date = DateTime.UtcNow.Date;
        if (await _db.MealBookings.AnyAsync(x =>
            x.StudentId == studentId && x.DiningHallId == diningHallId &&
            x.MealDate == date && x.MealType == mealType && !x.IsCancelled))
        {
            TempData["Error"] = "You already have this meal booked.";
            return RedirectToAction(nameof(Index));
        }

        _db.MealBookings.Add(new MealBooking
        {
            StudentId = studentId,
            DiningHallId = diningHallId,
            MealDate = date,
            MealType = mealType
        });
        await _db.SaveChangesAsync();
        TempData["Success"] = "Meal booking confirmed.";
        return RedirectToAction(nameof(Index));
    }

    [Authorize(Roles = "Student,Admin")]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Cancel(int id)
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var booking = await _db.MealBookings.FindAsync(id);
        if (booking is null || (booking.StudentId != studentId && !User.IsInRole("Admin")))
            return Forbid();
        booking.IsCancelled = true;
        await _db.SaveChangesAsync();
        TempData["Success"] = "Booking cancelled.";
        return RedirectToAction(nameof(Index));
    }

    [Authorize(Roles = "Kitchen,Manager,Admin")]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Attendance(int diningHallId, string mealType, int count)
    {
        _db.MealAttendances.Add(new MealAttendance
        {
            DiningHallId = diningHallId,
            MealType = mealType,
            Count = count,
            ServiceDate = DateTime.UtcNow.Date
        });
        await _db.SaveChangesAsync();
        TempData["Success"] = "Attendance recorded.";
        return RedirectToAction(nameof(Index));
    }

    [Authorize(Roles = "Kitchen,Manager,Admin")]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Waste(int diningHallId, string mealType, string dishName, decimal quantityKg, decimal cost)
    {
        _db.WasteRecords.Add(new WasteRecord
        {
            DiningHallId = diningHallId,
            MealType = mealType,
            DishName = dishName,
            QuantityKg = quantityKg,
            Cost = cost,
            RecordedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        TempData["Success"] = "Waste record saved.";
        return RedirectToAction(nameof(Index));
    }
}
