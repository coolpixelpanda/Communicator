import { useRef, useEffect, useState, useCallback } from "react";
import Avatar from "./Avatar";
import MessageInput from "./MessageInput";
import { sanitizeHtml } from "../utils/sanitize";
import type { UserDto, MessageDto } from "../types";

interface Props {
  contact: UserDto;
  messages: MessageDto[];
  currentUserId: string;
  currentUsername: string;
  users: UserDto[];
  onSend: (content: string, replyToId?: string | null) => void;
  online: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDayDivider(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function MessageContent({ html }: { html: string }) {
  const safe = sanitizeHtml(html);
  return (
    <div
      className="msg-content text-[15px] leading-relaxed text-gray-800"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() ?? "";
}

function ReplyPreview({
  msg,
  senderName,
  onClick,
}: {
  msg: MessageDto;
  senderName: string;
  onClick?: () => void;
}) {
  const plainText = stripHtml(msg.content);
  const preview = plainText.length > 80 ? plainText.slice(0, 80) + "..." : plainText;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-left"
    >
      <div className="h-full w-0.5 shrink-0 self-stretch rounded-full bg-[#1264a3]" />
      <Avatar username={senderName} size="xs" />
      <span className="text-xs font-semibold text-[#1264a3]">{senderName}</span>
      <span className="truncate text-xs text-gray-500">{preview}</span>
    </button>
  );
}

export default function ChatWindow({
  contact,
  messages,
  currentUserId,
  currentUsername,
  users,
  onSend,
  online,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<MessageDto | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resolveUsername = useCallback(
    (senderId: string) => {
      if (senderId === currentUserId) return currentUsername;
      const u = users.find((u) => u.id === senderId) ?? null;
      return u?.username ?? contact.username;
    },
    [currentUserId, currentUsername, users, contact.username]
  );

  const handleSend = useCallback(
    (content: string) => {
      onSend(content, replyTo?.id ?? null);
      setReplyTo(null);
    },
    [onSend, replyTo]
  );

  const msgMap = new Map(messages.map((m) => [m.id, m]));

  let lastDate = "";

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
        <Avatar username={contact.username} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-gray-900">
            {contact.username}
          </h3>
        </div>
        {!online && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Offline — messages queued
          </span>
        )}
        <div className="flex gap-0.5">
          <button
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Search"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <Avatar username={contact.username} size="lg" />
            <p className="mt-3 text-lg font-bold text-gray-900">
              {contact.username}
            </p>
            <p className="mt-1 text-sm">
              This is the very beginning of your direct message history with{" "}
              <strong className="text-gray-600">{contact.username}</strong>.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isSelf = msg.senderId === currentUserId;
          const senderName = isSelf ? currentUsername : contact.username;
          const msgDate = new Date(msg.sentAt).toDateString();
          let showDivider = false;
          if (msgDate !== lastDate) {
            showDivider = true;
            lastDate = msgDate;
          }

          const repliedMsg = msg.replyToId ? msgMap.get(msg.replyToId) : null;
          const repliedSender = repliedMsg
            ? resolveUsername(repliedMsg.senderId)
            : null;

          return (
            <div key={msg.id}>
              {showDivider && (
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="rounded-full border border-gray-200 px-3 py-0.5 text-xs font-bold text-gray-500">
                    {formatDayDivider(msg.sentAt)}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              )}
              <div className="group relative flex gap-2.5 px-1 py-1 hover:bg-gray-50">
                {/* Hover actions */}
                <div className="absolute -top-3 right-2 hidden rounded-md border border-gray-200 bg-white shadow-sm group-hover:flex">
                  <button
                    className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="React"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Reply"
                    onClick={() => setReplyTo(msg)}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 10h10a5 5 0 0 1 5 5v6M3 10l6 6M3 10l6-6" />
                    </svg>
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="More actions"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                    </svg>
                  </button>
                </div>

                <div className="mt-0.5 flex-shrink-0">
                  <Avatar username={senderName} size="md" />
                </div>
                <div className="min-w-0 flex-1">
                  {/* Reply context (Discord-style) */}
                  {repliedMsg && repliedSender && (
                    <div className="mb-0.5 flex items-center gap-1.5 pl-0.5">
                      <svg className="h-3 w-3 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 17l-5-5 5-5" /><path d="M4 12h12a4 4 0 0 1 4 4v1" />
                      </svg>
                      <Avatar username={repliedSender} size="xs" />
                      <span className="text-xs font-semibold text-[#1264a3]">
                        {repliedSender}
                      </span>
                      <span className="truncate text-xs text-gray-500">
                        {stripHtml(repliedMsg.content).slice(0, 60)}
                        {stripHtml(repliedMsg.content).length > 60 ? "..." : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-bold text-gray-900">
                      {senderName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(msg.sentAt)}
                    </span>
                  </div>
                  <MessageContent html={msg.content} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar + Message Input */}
      <div>
        {replyTo && (
          <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-5 py-2">
            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 17l-5-5 5-5" /><path d="M4 12h12a4 4 0 0 1 4 4v1" />
            </svg>
            <span className="text-xs text-gray-500">Replying to</span>
            <span className="text-xs font-semibold text-[#1264a3]">
              {resolveUsername(replyTo.senderId)}
            </span>
            <span className="truncate text-xs text-gray-500">
              {stripHtml(replyTo.content).slice(0, 80)}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              title="Cancel reply"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <MessageInput
          contactName={contact.username}
          users={users}
          online={online}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
