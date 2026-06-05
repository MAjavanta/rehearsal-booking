namespace BookingSystem.API.Services;

public class AvailabilityService : IAvailabilityService
{
    public List<TimeOnly> GetTimeSlots(int roomId, DateOnly date)
    {
        TimeOnly openTime = new(10, 0);
        TimeOnly closeTime = new(22, 0);
        List<TimeOnly> timeSlots = [];
        for (var i = openTime.Hour; i < closeTime.Hour; ++i)
        {
            timeSlots.Add(new(i, 0));
        }
        return timeSlots;
    }
}