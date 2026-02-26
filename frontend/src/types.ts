export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
}

export interface UserDto {
  id: string;
  username: string;
}

export interface MessageDto {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: string;
  clientId: string | null;
  isRead: boolean;
  replyToId: string | null;
}

export interface PendingMessage {
  clientId: string;
  recipientId: string;
  content: string;
  replyToId?: string | null;
  createdAt: string;
}

export interface UnreadCountDto {
  userId: string;
  count: number;
}
