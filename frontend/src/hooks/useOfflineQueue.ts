import { useEffect, useRef, useCallback } from "react";
import { api } from "../api";
import type { PendingMessage } from "../types";

const QUEUE_KEY = "offlineMessageQueue";

function loadQueue(): PendingMessage[] {
  try {
    return JSON.parse(sessionStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingMessage[]) {
  sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Manages an offline message queue in sessionStorage (per-tab).
 * When the browser comes back online, pending messages are flushed to the server.
 * Each message carries a clientId so the backend can deduplicate retries.
 */
export function useOfflineQueue(onFlushed?: () => void) {
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;

    try {
      const queue = loadQueue();
      const remaining: PendingMessage[] = [];

      for (const msg of queue) {
        try {
          await api.sendMessage(msg.recipientId, msg.content, msg.clientId, msg.replyToId);
        } catch {
          remaining.push(msg);
        }
      }

      saveQueue(remaining);
      if (remaining.length < queue.length) {
        onFlushed?.();
      }
    } finally {
      flushingRef.current = false;
    }
  }, [onFlushed]);

  useEffect(() => {
    window.addEventListener("online", flush);
    flush();
    return () => window.removeEventListener("online", flush);
  }, [flush]);

  const enqueue = useCallback((msg: Omit<PendingMessage, "createdAt">) => {
    const queue = loadQueue();
    queue.push({ ...msg, createdAt: new Date().toISOString() });
    saveQueue(queue);
  }, []);

  return { enqueue, flush, getPending: loadQueue };
}
