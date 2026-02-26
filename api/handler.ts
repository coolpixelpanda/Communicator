import { createHash, randomBytes, pbkdf2Sync } from "crypto";
import jwt from "jsonwebtoken";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const JWT_SECRET = process.env.JWT_SECRET || "ThisIsA32CharSecretKeyForDevOnly!";
const JWT_ISSUER = "Communicator";

// In-memory store (shared within same serverless instance; may reset on cold start)
const users = new Map<string, { id: string; username: string; passwordHash: string }>();
const usernameToId = new Map<string, string>();
const messages: Array<{
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: string;
  clientId: string | null;
  isRead: boolean;
  replyToId: string | null;
}> = [];
const clientIds = new Set<string>();

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256");
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

function verifyPassword(passwordHash: string, password: string): boolean {
  const [saltB64, storedB64] = passwordHash.split(":");
  if (!saltB64 || !storedB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256");
  return hash.toString("base64") === storedB64;
}

function createToken(userId: string, username: string): string {
  return jwt.sign(
    { sub: userId, unique_name: username, jti: uuid() },
    JWT_SECRET,
    { issuer: JWT_ISSUER, audience: JWT_ISSUER, expiresIn: "12h" }
  );
}

function getUserId(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_ISSUER,
    }) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function cors(req: VercelRequest, res: VercelResponse) {
  const origin = process.env.ALLOWED_ORIGINS || req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const path = (req.query.path as string) || "";
  const segments = path.split("/").filter(Boolean);

  try {
    // POST /api/auth/register
    if (req.method === "POST" && segments[0] === "auth" && segments[1] === "register") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { username, password } = body || {};
      if (!username || typeof username !== "string" || username.trim().length < 3)
        return res.status(400).json({ error: "Username must be at least 3 characters." });
      if (!password || typeof password !== "string" || password.length < 6)
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      const name = username.trim();
      const key = name.toLowerCase();
      if (usernameToId.has(key)) return res.status(409).json({ error: "Username already taken." });
      const id = uuid();
      users.set(id, { id, username: name, passwordHash: hashPassword(password) });
      usernameToId.set(key, id);
      const token = createToken(id, name);
      return res.status(200).json({ token, userId: id, username: name });
    }

    // POST /api/auth/login
    if (req.method === "POST" && segments[0] === "auth" && segments[1] === "login") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { username, password } = body || {};
      const key = (username || "").toString().trim().toLowerCase();
      const id = usernameToId.get(key);
      const user = id ? users.get(id) : null;
      if (!user || !verifyPassword(user.passwordHash, password || ""))
        return res.status(401).json({ error: "Invalid username or password." });
      const token = createToken(user.id, user.username);
      return res.status(200).json({ token, userId: user.id, username: user.username });
    }

    // GET /api/users (auth required)
    if (req.method === "GET" && segments[0] === "users" && segments.length === 1) {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const list = Array.from(users.values())
        .filter((u) => u.id !== userId)
        .map((u) => ({ id: u.id, username: u.username }))
        .sort((a, b) => a.username.localeCompare(b.username));
      return res.status(200).json(list);
    }

    // POST /api/messages
    if (req.method === "POST" && segments[0] === "messages" && segments.length === 1) {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { recipientId, content, clientId, replyToId } = body || {};
      if (!recipientId || recipientId === userId)
        return res.status(400).json({ error: "Cannot send a message to yourself." });
      if (!users.has(recipientId)) return res.status(404).json({ error: "Recipient not found." });
      const text = (content || "").toString().trim();
      if (!text) return res.status(400).json({ error: "Message content cannot be empty." });
      if (clientId && clientIds.has(clientId)) {
        const existing = messages.find((m) => m.clientId === clientId);
        if (existing)
          return res.status(200).json({
            id: existing.id,
            senderId: existing.senderId,
            recipientId: existing.recipientId,
            content: existing.content,
            sentAt: existing.sentAt,
            clientId: existing.clientId,
            isRead: existing.isRead,
            replyToId: existing.replyToId,
          });
      }
      if (clientId) clientIds.add(clientId);
      const msg = {
        id: uuid(),
        senderId: userId,
        recipientId,
        content: text,
        sentAt: new Date().toISOString(),
        clientId: clientId || null,
        isRead: false,
        replyToId: replyToId || null,
      };
      messages.push(msg);
      return res.status(200).json(msg);
    }

    // GET /api/messages/conversation/:contactId
    if (req.method === "GET" && segments[0] === "messages" && segments[1] === "conversation") {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const contactId = segments[2];
      if (!contactId) return res.status(400).json({ error: "Missing contactId" });
      const list = messages
        .filter(
          (m) =>
            (m.senderId === userId && m.recipientId === contactId) ||
            (m.senderId === contactId && m.recipientId === userId)
        )
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      return res.status(200).json(list);
    }

    // GET /api/messages/poll?since=
    if (req.method === "GET" && segments[0] === "messages" && segments[1] === "poll") {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const since = req.query.since ? new Date(req.query.since as string).getTime() : 0;
      const list = messages
        .filter((m) => m.recipientId === userId && new Date(m.sentAt).getTime() > since)
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      return res.status(200).json(list);
    }

    // PUT /api/messages/read/:contactId
    if (req.method === "PUT" && segments[0] === "messages" && segments[1] === "read") {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const contactId = segments[2];
      if (!contactId) return res.status(400).json({ error: "Missing contactId" });
      let count = 0;
      for (const m of messages) {
        if (m.senderId === contactId && m.recipientId === userId && !m.isRead) {
          m.isRead = true;
          count++;
        }
      }
      return res.status(200).json({ markedRead: count });
    }

    // GET /api/messages/unread-counts
    if (req.method === "GET" && segments[0] === "messages" && segments[1] === "unread-counts") {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const counts: Record<string, number> = {};
      for (const m of messages) {
        if (m.recipientId === userId && !m.isRead) {
          counts[m.senderId] = (counts[m.senderId] || 0) + 1;
        }
      }
      const list = Object.entries(counts).map(([userId, count]) => ({ userId, count }));
      return res.status(200).json(list);
    }

    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
