using Microsoft.AspNetCore.Mvc;
using BookingSystem.API.Models;
using Microsoft.AspNetCore.Mvc.ActionConstraints;

namespace BookingSystem.API.Controllers;

public class RoomController : BaseApiController
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

    [HttpGet("{id}")]
    public IActionResult GetRoomById(int id)
    {
        var room = _rooms.Find(room => room.Id == id);
        if (room is null)
        {
            return NotFound();
        }
        return Ok(room);
    }

}