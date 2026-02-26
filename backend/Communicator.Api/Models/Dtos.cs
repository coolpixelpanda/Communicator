namespace Communicator.Api.Models;

public record RegisterRequest(string Username, string Password);
public record LoginRequest(string Username, string Password);
public record AuthResponse(string Token, Guid UserId, string Username);
public record SendMessageRequest(Guid RecipientId, string Content, string? ClientId, Guid? ReplyToId);
public record UserDto(Guid Id, string Username);
public record MessageDto(Guid Id, Guid SenderId, Guid RecipientId, string Content, DateTime SentAt, string? ClientId, bool IsRead, Guid? ReplyToId);
public record UnreadCountDto(Guid UserId, int Count);
