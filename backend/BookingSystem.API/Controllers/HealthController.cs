using Microsoft.AspNetCore.Mvc;

namespace BookingSystem.API.Controllers;

public class HealthController : BaseApiController
{

    [HttpGet]
    public IActionResult GetHealthCheck()
    {
        return Ok(new { status = "healthy" });
    }
}