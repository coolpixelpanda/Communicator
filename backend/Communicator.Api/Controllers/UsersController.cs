using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Communicator.Api.Models;
using Communicator.Api.Services;

namespace Communicator.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(UserStore users) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll()
    {
        var currentUserId = Guid.Parse(User.FindFirstValue("sub")!);
        var result = users.GetAll()
            .Where(u => u.Id != currentUserId)
            .Select(u => new UserDto(u.Id, u.Username))
            .OrderBy(u => u.Username);

        return Ok(result);
    }
}
