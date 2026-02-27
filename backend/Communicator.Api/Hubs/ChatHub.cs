using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Communicator.Api.Models;
using Communicator.Api.Services;

namespace Communicator.Api.Hubs;

[Authorize]
public class ChatHub(MessageStore messages, UserStore users) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
        if (!string.IsNullOrEmpty(userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Send a message; saved to store and pushed to recipient over socket.
    /// </summary>
    public async Task<MessageDto> SendMessage(string recipientIdStr, string content, string? clientId, string? replyToIdStr)
    {
        var senderIdStr = Context.User?.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
        if (string.IsNullOrEmpty(senderIdStr) || !Guid.TryParse(senderIdStr, out var senderId))
            throw new HubException("Unauthorized");

        if (!Guid.TryParse(recipientIdStr, out var recipientId))
            throw new HubException("Invalid recipient.");
        if (senderId == recipientId)
            throw new HubException("Cannot send a message to yourself.");
        if (users.FindById(recipientId) is null)
            throw new HubException("Recipient not found.");
        if (string.IsNullOrWhiteSpace(content))
            throw new HubException("Message content cannot be empty.");

        Guid? replyToId = null;
        if (!string.IsNullOrEmpty(replyToIdStr) && Guid.TryParse(replyToIdStr, out var r))
            replyToId = r;

        var msg = messages.Add(senderId, recipientId, content.Trim(), clientId, replyToId);
        if (msg is null)
            throw new HubException("Duplicate message.");

        var dto = ToDto(msg);
        await Clients.User(recipientIdStr).SendAsync("NewMessage", dto);
        return dto;
    }

    private static MessageDto ToDto(Message m) =>
        new(m.Id, m.SenderId, m.RecipientId, m.Content, m.SentAt, m.ClientId, m.IsRead, m.ReplyToId);
}
