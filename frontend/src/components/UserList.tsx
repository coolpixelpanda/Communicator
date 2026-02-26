import { useState, useRef, useEffect } from "react";
import Avatar from "./Avatar";
import type { UserDto } from "../types";

interface Props {
  users: UserDto[];
  selectedId: string | null;
  unreadCounts: Record<string, number>;
  onSelect: (user: UserDto) => void;
}

export default function UserList({ users, selectedId, unreadCounts, onSelect }: Props) {
  const [contextMenu, setContextMenu] = useState<{ user: UserDto; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, user: UserDto) => {
    e.preventDefault();
    setContextMenu({ user, x: e.clientX, y: e.clientY });
  };

  if (users.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-500">
        No other users online yet.
        <br />
        <span className="text-xs text-gray-600">Open another tab and register a second account.</span>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-0.5 px-2 py-1">
        {users.map((user) => {
          const active = user.id === selectedId;
          const unread = unreadCounts[user.id] ?? 0;
          const hasUnread = unread > 0;

          return (
            <li
              key={user.id}
              onClick={() => onSelect(user)}
              onContextMenu={(e) => handleContextMenu(e, user)}
              className={`group flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors ${
                active
                  ? "bg-[#1264a3] text-white"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <Avatar username={user.username} size="sm" />
              <span
                className={`min-w-0 flex-1 truncate text-[15px] ${
                  hasUnread && !active ? "font-bold text-white" : ""
                }`}
              >
                {user.username}
              </span>
              {hasUnread && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    active
                      ? "bg-white/25 text-white"
                      : "bg-[#e01e5a] text-white"
                  }`}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-52 rounded-lg border border-gray-700 bg-[#222529] py-1 shadow-xl"
        >
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-200 hover:bg-[#1264a3] hover:text-white"
            onClick={() => {
              onSelect(contextMenu.user);
              setContextMenu(null);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Open conversation
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-200 hover:bg-[#1264a3] hover:text-white"
            onClick={() => setContextMenu(null)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            View profile
          </button>
          <div className="my-1 border-t border-gray-700" />
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-400 hover:bg-white/5"
            onClick={() => setContextMenu(null)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            Mute notifications
          </button>
        </div>
      )}
    </>
  );
}
