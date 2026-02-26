using Microsoft.AspNetCore.Mvc;
using Communicator.Api.Models;
using Communicator.Api.Services;

namespace Communicator.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(UserStore users, TokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length < 3)
            return BadRequest(new { error = "Username must be at least 3 characters." });

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        var user = users.Register(request.Username.Trim(), request.Password);
        if (user is null)
            return Conflict(new { error = "Username already taken." });

        var token = tokens.CreateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Username));
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var user = users.FindByUsername(request.Username);
        if (user is null || !users.VerifyPassword(user, request.Password))
            return Unauthorized(new { error = "Invalid username or password." });

        var token = tokens.CreateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Username));
    }
}
