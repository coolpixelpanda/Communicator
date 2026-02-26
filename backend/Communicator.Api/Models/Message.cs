namespace Communicator.Api.Models;

public class Message
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public bool IsRead { get; set; }
    public Guid? ReplyToId { get; set; }

    /// <summary>
    /// Client-generated ID used for deduplication when resending queued offline messages.
    /// </summary>
    public string? ClientId { get; set; }
}
