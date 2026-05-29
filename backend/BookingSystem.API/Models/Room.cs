namespace BookingSystem.API.Models;

public class Room
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public decimal HourlyRate { get; set; }
}