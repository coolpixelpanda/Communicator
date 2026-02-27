import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import type { MessageDto } from "../types";

function toMessageDto(raw: Record<string, unknown>): MessageDto | null {
  const id = (raw.id ?? raw.Id) as string | undefined;
  const senderId = (raw.senderId ?? raw.SenderId) as string | undefined;
  const recipientId = (raw.recipientId ?? raw.RecipientId) as string | undefined;
  const content = (raw.content ?? raw.Content) as string | undefined;
  const sentAt = (raw.sentAt ?? raw.SentAt) as string | undefined;
  if (!id || !senderId || !recipientId || content == null || !sentAt) return null;
  return {
    id: String(id),
    senderId: String(senderId),
    recipientId: String(recipientId),
    content: String(content),
    sentAt: String(sentAt),
    clientId: (raw.clientId ?? raw.ClientId) as string | null ?? null,
    isRead: Boolean(raw.isRead ?? raw.IsRead),
    replyToId: (raw.replyToId ?? raw.ReplyToId) as string | null ?? null,
  };
}

export interface UseChatSocketOptions {
  wsUrl: string | null;
  token: string | null;
  onNewMessage: (message: MessageDto) => void;
}

export interface UseChatSocketResult {
  isConnected: boolean;
  sendMessage: (
    recipientId: string,
    content: string,
    clientId: string,
    replyToId?: string | null
  ) => Promise<MessageDto | null>;
}

export function useChatSocket({
  wsUrl,
  token,
  onNewMessage,
}: UseChatSocketOptions): UseChatSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    if (!wsUrl || !token?.trim()) {
      setIsConnected(false);
      return;
    }

    const url = wsUrl.includes("?")
      ? `${wsUrl}&access_token=${encodeURIComponent(token)}`
      : `${wsUrl}?access_token=${encodeURIComponent(token)}`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on("NewMessage", (raw: Record<string, unknown>) => {
      const msg = toMessageDto(raw);
      if (msg) onNewMessageRef.current(msg);
    });

    connection
      .start()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    connection.onclose(() => setIsConnected(false));
    connection.onreconnected(() => setIsConnected(true));

    connectionRef.current = connection;

    return () => {
      connectionRef.current = null;
      connection.stop().catch(() => {});
      setIsConnected(false);
    };
  }, [wsUrl, token]);

  const sendMessage = useCallback(
    async (
      recipientId: string,
      content: string,
      clientId: string,
      replyToId?: string | null
    ): Promise<MessageDto | null> => {
      const conn = connectionRef.current;
      if (!conn || conn.state !== signalR.HubConnectionState.Connected)
        return null;
      try {
        const result = await conn.invoke<Record<string, unknown>>("SendMessage", recipientId, content, clientId, replyToId ?? null);
        return result ? toMessageDto(result) : null;
      } catch {
        return null;
      }
    },
    []
  );

  return { isConnected, sendMessage };
}
