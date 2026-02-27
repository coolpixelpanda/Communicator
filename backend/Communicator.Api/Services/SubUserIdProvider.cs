using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace Communicator.Api.Services;

/// <summary>
/// Uses the "sub" claim as SignalR user id so Clients.User(userId) works with our JWT.
/// </summary>
public class SubUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User?.Claims.FirstOrDefault(c => c.Type == "sub")?.Value
        ?? connection.User?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
}
