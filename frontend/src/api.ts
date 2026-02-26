import type { AuthResponse, MessageDto, UnreadCountDto, UserDto } from "./types";

const BASE = (import.meta.env.VITE_API_URL as string) || "/api";

/**
 * In-memory token used by all API calls. Set via setApiToken() from AuthContext.
 * This avoids reading from storage on every request and ensures each tab
 * (which has its own React tree) uses its own token — critical for
 * testing multiple accounts in parallel browser tabs.
 */
let currentToken: string | null = null;

export function setApiToken(token: string | null) {
  currentToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  register: (username: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getUsers: () => request<UserDto[]>("/users"),

  sendMessage: (recipientId: string, content: string, clientId: string, replyToId?: string | null) =>
    request<MessageDto>("/messages", {
      method: "POST",
      body: JSON.stringify({ recipientId, content, clientId, replyToId: replyToId ?? null }),
    }),

  getConversation: (contactId: string) =>
    request<MessageDto[]>(`/messages/conversation/${contactId}`),

  pollMessages: (since: string) =>
    request<MessageDto[]>(`/messages/poll?since=${encodeURIComponent(since)}`),

  markAsRead: (contactId: string) =>
    request<{ markedRead: number }>(`/messages/read/${contactId}`, {
      method: "PUT",
    }),

  getUnreadCounts: () => request<UnreadCountDto[]>("/messages/unread-counts"),
};
