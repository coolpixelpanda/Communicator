import { useEffect, useRef } from "react";
import { api } from "../api";
import type { MessageDto } from "../types";

/**
 * Polls the server for new messages every `intervalMs` milliseconds.
 * Calls `onNewMessages` with any messages received since the last poll.
 */
export function usePolling(
  enabled: boolean,
  intervalMs: number,
  onNewMessages: (messages: MessageDto[]) => void
) {
  const sinceRef = useRef(new Date().toISOString());
  const callbackRef = useRef(onNewMessages);
  callbackRef.current = onNewMessages;

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const messages = await api.pollMessages(sinceRef.current);
        if (messages.length > 0) {
          sinceRef.current = messages[messages.length - 1].sentAt;
          callbackRef.current(messages);
        }
      } catch {
        // Silently fail during polling — will retry on next interval.
        // This handles transient network errors gracefully.
      }
    };

    const id = setInterval(poll, intervalMs);
    poll();
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
