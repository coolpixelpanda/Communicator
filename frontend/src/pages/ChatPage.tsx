import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { usePolling } from "../hooks/usePolling";
import { useOfflineQueue } from "../hooks/useOfflineQueue";
import { useNotifications } from "../hooks/useNotifications";
import { stripHtmlToText } from "../utils/sanitize";
import Avatar from "../components/Avatar";
import UserList from "../components/UserList";
import ChatWindow from "../components/ChatWindow";
import type { UserDto, MessageDto } from "../types";

const USER_POLL_MS = 5000;
const MSG_POLL_MS = 3000;
const UNREAD_POLL_MS = 4000;

export default function ChatPage() {
  const { auth, logout } = useAuth();
  const { notify } = useNotifications();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const selectedUserRef = useRef<UserDto | null>(null);
  const usersRef = useRef<UserDto[]>([]);

  selectedUserRef.current = selectedUser;
  usersRef.current = users;

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  // Page title with unread count
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Communicator` : "Communicator";
  }, [totalUnread]);

  // Online/offline tracking
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Real-time user list polling (only when logged in)
  useEffect(() => {
    if (!auth) return;
    const fetchUsers = () => {
      api.getUsers().then(setUsers).catch(() => {});
    };
    fetchUsers();
    const id = setInterval(fetchUsers, USER_POLL_MS);
    return () => clearInterval(id);
  }, [auth]);

  // Unread counts polling (only when logged in)
  useEffect(() => {
    if (!auth) return;
    const fetchUnread = () => {
      api
        .getUnreadCounts()
        .then((counts) => {
          const map: Record<string, number> = {};
          for (const c of counts) map[c.userId] = c.count;
          setUnreadCounts(map);
        })
        .catch(() => {});
    };
    fetchUnread();
    const id = setInterval(fetchUnread, UNREAD_POLL_MS);
    return () => clearInterval(id);
  }, [auth]);

  // Load conversation + mark as read on user select
  useEffect(() => {
    if (!selectedUser) return;
    api.getConversation(selectedUser.id).then(setMessages).catch(() => {});
    api.markAsRead(selectedUser.id).then(() => {
      setUnreadCounts((prev) => {
        if (!prev[selectedUser.id]) return prev;
        const next = { ...prev };
        delete next[selectedUser.id];
        return next;
      });
    }).catch(() => {});
  }, [selectedUser]);

  // Message polling + notifications
  const handleNewMessages = useCallback(
    (incoming: MessageDto[]) => {
      const current = selectedUserRef.current;

      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const fresh = incoming
          .filter((m) => !ids.has(m.id))
          .filter(
            (m) =>
              !current ||
              m.senderId === current.id ||
              m.recipientId === current.id
          );
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });

      for (const msg of incoming) {
        const fromCurrentConversation = current && msg.senderId === current.id;
        if (fromCurrentConversation) {
          api.markAsRead(current!.id).then(() => {
            setUnreadCounts((prev) => {
              if (!prev[current!.id]) return prev;
              const next = { ...prev };
              delete next[current!.id];
              return next;
            });
          }).catch(() => {});
        } else {
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.senderId]: (prev[msg.senderId] ?? 0) + 1,
          }));
          const sender = usersRef.current.find((u) => u.id === msg.senderId);
          const senderName = sender?.username ?? "Someone";
          const plain = stripHtmlToText(msg.content);
          const preview = plain.length > 60 ? plain.slice(0, 60) + "..." : plain;
          notify(`New message from ${senderName}`, preview);
        }
      }
    },
    []
  );

  usePolling(!!auth, MSG_POLL_MS, handleNewMessages);

  // Offline queue
  const { enqueue, flush } = useOfflineQueue(() => {
    if (selectedUser) {
      api.getConversation(selectedUser.id).then(setMessages).catch(() => {});
    }
  });

  const handleSend = async (content: string, replyToId?: string | null) => {
    if (!selectedUser || !auth) return;

    const clientId = crypto.randomUUID();

    const optimistic: MessageDto = {
      id: clientId,
      senderId: auth.userId,
      recipientId: selectedUser.id,
      content,
      sentAt: new Date().toISOString(),
      clientId,
      isRead: false,
      replyToId: replyToId ?? null,
    };
    setMessages((prev) => [...prev, optimistic]);

    if (!navigator.onLine) {
      enqueue({ clientId, recipientId: selectedUser.id, content, replyToId });
      return;
    }

    try {
      const saved = await api.sendMessage(selectedUser.id, content, clientId, replyToId);
      setMessages((prev) =>
        prev.map((m) => (m.clientId === clientId ? saved : m))
      );
    } catch {
      enqueue({ clientId, recipientId: selectedUser.id, content, replyToId });
    }
  };

  useEffect(() => {
    if (online) flush();
  }, [online, flush]);

  return (
    <div className="flex h-screen">
      {/* Slack-style sidebar */}
      <aside className="flex w-[260px] flex-col bg-[#1a1d21]">
        {/* Workspace header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#007a5a] text-xs font-bold text-white">
              C
            </div>
            <h1 className="text-[17px] font-bold text-white">Communicator</h1>
          </div>
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white" title="New message">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="space-y-0.5 px-2 py-2">
          <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-1 text-[15px] text-gray-300 hover:bg-white/10">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Activity
            {totalUnread > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e01e5a] px-1.5 text-[11px] font-bold text-white">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>
        </nav>

        {/* DM section label */}
        <div className="mt-2 flex items-center justify-between px-4 py-1.5">
          <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Direct Messages</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">
            {users.length}
          </span>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          <UserList
            users={users}
            selectedId={selectedUser?.id ?? null}
            unreadCounts={unreadCounts}
            onSelect={setSelectedUser}
          />
        </div>

        {/* Current user footer */}
        <div className="border-t border-white/10 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar username={auth?.username ?? ""} size="md" showStatus online={online} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{auth?.username}</p>
              <p className="text-xs text-gray-400">{online ? "Active" : "Away"}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-white/10 hover:text-gray-300"
              title="Sign out"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col">
        {selectedUser ? (
          <ChatWindow
            contact={selectedUser}
            messages={messages}
            currentUserId={auth!.userId}
            currentUsername={auth!.username}
            users={users}
            onSend={handleSend}
            online={online}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-white text-gray-400">
            <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-lg font-semibold text-gray-500">No conversation selected</p>
            <p className="mt-1 text-sm">Pick a person from the sidebar to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
}
