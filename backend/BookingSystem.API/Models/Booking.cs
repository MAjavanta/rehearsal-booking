using BookingSystem.API.Enums;

namespace BookingSystem.API.Models;

public class Booking
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public required string CustomerName { get; set; }
    public required string CustomerEmail { get; set; }
    public string CustomerPhone { get; set; } = string.Empty;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public DateOnly BookingDate { get; set; }
    public BookingStatus Status { get; set; }
}