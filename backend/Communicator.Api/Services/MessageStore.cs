using System.Collections.Concurrent;
using System.Text.Json;
using Communicator.Api.Models;

namespace Communicator.Api.Services;

/// <summary>
/// Thread-safe message store backed by a JSON file on disk.
/// Data is loaded on startup and saved after every mutation.
/// </summary>
public class MessageStore
{
    private static readonly string DataDir = Path.Combine(AppContext.BaseDirectory, "data");
    private static readonly string FilePath = Path.Combine(DataDir, "messages.json");
    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true };

    private readonly ConcurrentBag<Message> _messages = [];
    private readonly ConcurrentDictionary<string, bool> _clientIds = new();
    private readonly object _saveLock = new();

    public MessageStore()
    {
        Load();
    }

    public Message? Add(Guid senderId, Guid recipientId, string content, string? clientId, Guid? replyToId = null)
    {
        if (clientId != null && !_clientIds.TryAdd(clientId, true))
            return _messages.FirstOrDefault(m => m.ClientId == clientId);

        var message = new Message
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            RecipientId = recipientId,
            Content = content,
            SentAt = DateTime.UtcNow,
            IsRead = false,
            ClientId = clientId,
            ReplyToId = replyToId
        };

        _messages.Add(message);
        Save();
        return message;
    }

    public IEnumerable<Message> GetConversation(Guid userA, Guid userB)
    {
        return _messages
            .Where(m => (m.SenderId == userA && m.RecipientId == userB)
                     || (m.SenderId == userB && m.RecipientId == userA))
            .OrderBy(m => m.SentAt);
    }

    public IEnumerable<Message> GetNewMessages(Guid recipientId, DateTime since)
    {
        return _messages
            .Where(m => m.RecipientId == recipientId && m.SentAt > since)
            .OrderBy(m => m.SentAt);
    }

    public int MarkAsRead(Guid recipientId, Guid senderId)
    {
        var count = 0;
        foreach (var msg in _messages)
        {
            if (msg.SenderId == senderId && msg.RecipientId == recipientId && !msg.IsRead)
            {
                msg.IsRead = true;
                count++;
            }
        }
        if (count > 0) Save();
        return count;
    }

    public Dictionary<Guid, int> GetUnreadCounts(Guid recipientId)
    {
        return _messages
            .Where(m => m.RecipientId == recipientId && !m.IsRead)
            .GroupBy(m => m.SenderId)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    private void Load()
    {
        if (!File.Exists(FilePath)) return;

        try
        {
            var json = File.ReadAllText(FilePath);
            var messages = JsonSerializer.Deserialize<List<Message>>(json);
            if (messages is null) return;

            foreach (var msg in messages)
            {
                _messages.Add(msg);
                if (msg.ClientId != null)
                    _clientIds.TryAdd(msg.ClientId, true);
            }
        }
        catch
        {
            // Corrupted file — start fresh
        }
    }

    private void Save()
    {
        lock (_saveLock)
        {
            Directory.CreateDirectory(DataDir);
            var json = JsonSerializer.Serialize(_messages.ToList(), JsonOpts);
            File.WriteAllText(FilePath, json);
        }
    }
}
