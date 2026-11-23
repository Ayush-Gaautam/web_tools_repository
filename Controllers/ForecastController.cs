using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web_ca_3.Data;

namespace web_ca_3.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ForecastController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ForecastController(ApplicationDbContext db) => _db = db;

    [HttpGet("forecast")]
    public async Task<IActionResult> Forecast([FromQuery] int? hallId, [FromQuery] string mealType = "Lunch")
    {
        var query = _db.MealAttendances.AsQueryable();
        if (hallId.HasValue) query = query.Where(x => x.DiningHallId == hallId);
        query = query.Where(x => x.MealType == mealType);

        var history = await query.OrderByDescending(x => x.ServiceDate).Take(14).Select(x => x.Count).ToListAsync();
        if (history.Count == 0)
            return Ok(new { mealType, forecast = 0, method = "No data", confidence = "Low" });

        var weights = Enumerable.Range(1, history.Count).Reverse();
        var weightedValues = history.Select((value, index) => value * (index + 1)).Sum();
        var forecast = (int)Math.Round((double)weightedValues / weights.Sum());
        var averageError = history.Skip(1).Take(7).DefaultIfEmpty(forecast).Average(x => Math.Abs(x - forecast));
        var confidence = history.Count >= 14 ? "High" : "Medium";

        return Ok(new
        {
            mealType,
            forecast,
            confidence,
            sampleDays = history.Count,
            averageAbsoluteError = Math.Round(averageError, 1)
        });
    }

    [HttpGet("waste")]
    [Authorize(Roles = "Admin,Manager,Kitchen")]
    public async Task<IActionResult> Waste()
    {
        var records = await _db.WasteRecords
            .Include(x => x.DiningHall)
            .OrderByDescending(x => x.RecordedAt)
            .Take(100)
            .ToListAsync();
        return Ok(records);
    }
}
