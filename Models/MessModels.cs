using System.ComponentModel.DataAnnotations;

namespace web_ca_3.Models;

public class DiningHall
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = "";

    [Range(1, 10000)]
    public int Capacity { get; set; }

    public bool IsActive { get; set; } = true;
}

public class MealMenu
{
    public int Id { get; set; }

    [Range(1, int.MaxValue)]
    public int DiningHallId { get; set; }
    public DiningHall? DiningHall { get; set; }

    [Required, MaxLength(20)]
    public string MealType { get; set; } = "Lunch";

    [Required, MaxLength(200)]
    public string DishName { get; set; } = "";

    public DateTime ServiceDate { get; set; }

    [Range(1, 1000)]
    public int PreparedQuantity { get; set; }

    [Range(0, 100000)]
    public decimal EstimatedCost { get; set; }
}

public class MealBooking
{
    public int Id { get; set; }

    [Required]
    public string StudentId { get; set; } = "";

    [Range(1, int.MaxValue)]
    public int DiningHallId { get; set; }
    public DiningHall? DiningHall { get; set; }

    public DateTime MealDate { get; set; }

    [Required, MaxLength(20)]
    public string MealType { get; set; } = "Lunch";

    public bool IsCancelled { get; set; }
}

public class MealAttendance
{
    public int Id { get; set; }

    [Range(1, int.MaxValue)]
    public int DiningHallId { get; set; }
    public DiningHall? DiningHall { get; set; }

    public DateTime ServiceDate { get; set; }

    [Required, MaxLength(20)]
    public string MealType { get; set; } = "Lunch";

    [Range(0, 10000)]
    public int Count { get; set; }
}

public class WasteRecord
{
    public int Id { get; set; }

    [Range(1, int.MaxValue)]
    public int DiningHallId { get; set; }
    public DiningHall? DiningHall { get; set; }

    [Required, MaxLength(20)]
    public string MealType { get; set; } = "Lunch";

    [Required, MaxLength(200)]
    public string DishName { get; set; } = "";

    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    [Range(0, 10000)]
    public decimal QuantityKg { get; set; }

    [Range(0, 100000)]
    public decimal Cost { get; set; }
}
