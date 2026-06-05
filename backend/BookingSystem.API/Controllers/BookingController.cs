using BookingSystem.API.DTOs;
using BookingSystem.API.Enums;
using BookingSystem.API.Models;
using Microsoft.AspNetCore.Mvc;

namespace BookingSystem.API.Controllers;

public class BookingController : BaseApiController
{
    private static readonly List<Bookings> _bookings = [];

    [HttpPost]
    public IActionResult CreateBookingRequest([FromBody] CreateBookingRequestDTO bookingRequestDTO)
    {
        var id = _bookings.Any() ? _bookings.Max(booking => booking.Id) + 1 : 1;
        Bookings newBooking = new()
        {
            Id = id,
            RoomId = bookingRequestDTO.RoomId,
            CustomerName = bookingRequestDTO.CustomerName,
            CustomerEmail = bookingRequestDTO.CustomerEmail,
            CustomerPhone = bookingRequestDTO.CustomerPhone,
            StartTime = bookingRequestDTO.StartTime,
            EndTime = bookingRequestDTO.EndTime,
            BookingDate = bookingRequestDTO.BookingDate,
            Status = BookingStatus.Pending
        };
        _bookings.Add(newBooking);
        return Created($"/api/booking/{id}", newBooking);
    }

    [HttpGet]
    public IActionResult GetBookings()
    {
        return Ok(_bookings);
    }
}