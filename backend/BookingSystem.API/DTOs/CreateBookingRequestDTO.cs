namespace BookingSystem.API.DTOs;

public record CreateBookingRequestDTO(
    int RoomId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    TimeOnly StartTime,
    TimeOnly EndTime,
    DateOnly BookingDate
);