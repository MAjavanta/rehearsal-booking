using BookingSystem.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BookingSystem.API.Controllers;

public class AvailabilityController(
    IAvailabilityService _availabilityService) : BaseApiController
{
    [HttpGet]
    public IActionResult GetAvailability([FromQuery] int id, [FromQuery] DateOnly date)
    {
        var timeSlots = _availabilityService.GetTimeSlots(id, date);
        return Ok(timeSlots);
    }
}