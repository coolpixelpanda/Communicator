using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Communicator.Api.Models;
using Communicator.Api.Services;

namespace Communicator.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController(MessageStore messages, UserStore users) : ControllerBase
{
    [HttpPost]
    public IActionResult Send([FromBody] SendMessageRequest request)
    {
        var senderId = Guid.Parse(User.FindFirstValue("sub")!);

        if (request.RecipientId == senderId)
            return BadRequest(new { error = "Cannot send a message to yourself." });

        if (users.FindById(request.RecipientId) is null)
            return NotFound(new { error = "Recipient not found." });

        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { error = "Message content cannot be empty." });

        var msg = messages.Add(senderId, request.RecipientId, request.Content.Trim(), request.ClientId, request.ReplyToId);
        return Ok(ToDto(msg!));
    }

    [HttpGet("conversation/{contactId:guid}")]
    public IActionResult GetConversation(Guid contactId)
    {
        var currentUserId = Guid.Parse(User.FindFirstValue("sub")!);
        var result = messages.GetConversation(currentUserId, contactId).Select(ToDto);
        return Ok(result);
    }

    [HttpGet("poll")]
    public IActionResult Poll([FromQuery] DateTime since)
    {
        var currentUserId = Guid.Parse(User.FindFirstValue("sub")!);
        var result = messages.GetNewMessages(currentUserId, since.ToUniversalTime()).Select(ToDto);
        return Ok(result);
    }

    /// <summary>
    /// Mark all messages from a contact as read.
    /// Called when the user opens a conversation.
    /// </summary>
    [HttpPut("read/{contactId:guid}")]
    public IActionResult MarkAsRead(Guid contactId)
    {
        var currentUserId = Guid.Parse(User.FindFirstValue("sub")!);
        var count = messages.MarkAsRead(recipientId: currentUserId, senderId: contactId);
        return Ok(new { markedRead = count });
    }

    /// <summary>
    /// Returns unread message counts grouped by sender.
    /// Used by the sidebar to show badge numbers.
    /// </summary>
    [HttpGet("unread-counts")]
    public IActionResult GetUnreadCounts()
    {
        var currentUserId = Guid.Parse(User.FindFirstValue("sub")!);
        var counts = messages.GetUnreadCounts(currentUserId)
            .Select(kv => new UnreadCountDto(kv.Key, kv.Value));
        return Ok(counts);
    }

    private static MessageDto ToDto(Message m) =>
        new(m.Id, m.SenderId, m.RecipientId, m.Content, m.SentAt, m.ClientId, m.IsRead, m.ReplyToId);
}
