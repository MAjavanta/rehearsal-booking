using Microsoft.AspNetCore.Mvc;
using BookingSystem.API.Models;

namespace BookingSystem.API.Controllers;

public class RoomsController : BaseApiController
{
    private static readonly List<Room> _rooms =
    [
        new() { Id = 1, Name = "Room 1", HourlyRate = 12 },
        new() { Id = 2, Name = "Room 2", HourlyRate = 8 }
    ];

    [HttpGet]
    public IActionResult GetRooms()
    {
        return Ok(_rooms);
    }

}