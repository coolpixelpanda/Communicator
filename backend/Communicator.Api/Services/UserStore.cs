using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Communicator.Api.Models;

namespace Communicator.Api.Services;

/// <summary>
/// Thread-safe user store backed by a JSON file on disk.
/// Data is loaded on startup and saved after every registration.
/// </summary>
public class UserStore
{
    private static readonly string DataDir = Path.Combine(AppContext.BaseDirectory, "data");
    private static readonly string FilePath = Path.Combine(DataDir, "users.json");
    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true };

    private readonly ConcurrentDictionary<Guid, User> _users = new();
    private readonly ConcurrentDictionary<string, Guid> _usernameIndex = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _saveLock = new();

    public UserStore()
    {
        Load();
    }

    public User? FindByUsername(string username)
    {
        return _usernameIndex.TryGetValue(username, out var id)
            ? _users.GetValueOrDefault(id)
            : null;
    }

    public User? FindById(Guid id) => _users.GetValueOrDefault(id);

    public IEnumerable<User> GetAll() => _users.Values;

    public User? Register(string username, string password)
    {
        var id = Guid.NewGuid();

        if (!_usernameIndex.TryAdd(username, id))
            return null;

        var user = new User
        {
            Id = id,
            Username = username,
            PasswordHash = HashPassword(password),
            CreatedAt = DateTime.UtcNow
        };

        _users[id] = user;
        Save();
        return user;
    }

    public bool VerifyPassword(User user, string password)
    {
        var parts = user.PasswordHash.Split(':');
        var salt = Convert.FromBase64String(parts[0]);
        var storedHash = parts[1];
        var hash = Convert.ToBase64String(
            KeyDerivation.Pbkdf2(password, salt, KeyDerivationPrf.HMACSHA256, 100_000, 32));
        return storedHash == hash;
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Convert.ToBase64String(
            KeyDerivation.Pbkdf2(password, salt, KeyDerivationPrf.HMACSHA256, 100_000, 32));
        return $"{Convert.ToBase64String(salt)}:{hash}";
    }

    private void Load()
    {
        if (!File.Exists(FilePath)) return;

        try
        {
            var json = File.ReadAllText(FilePath);
            var users = JsonSerializer.Deserialize<List<User>>(json);
            if (users is null) return;

            foreach (var user in users)
            {
                _users[user.Id] = user;
                _usernameIndex[user.Username] = user.Id;
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
            var json = JsonSerializer.Serialize(_users.Values.ToList(), JsonOpts);
            File.WriteAllText(FilePath, json);
        }
    }
}
