namespace BookingSystem.API.Services;

public interface IAvailabilityService
{
    public List<TimeOnly> GetTimeSlots(int roomId, DateOnly date);
}