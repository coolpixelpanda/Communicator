import { useEffect, useRef } from "react";
import Avatar from "./Avatar";
import type { UserDto } from "../types";

interface Props {
  users: UserDto[];
  filter: string;
  onSelect: (user: UserDto) => void;
  onClose: () => void;
  activeIndex: number;
}

export default function MentionDropdown({ users, filter, onSelect, onClose, activeIndex }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    if (listRef.current && activeIndex >= 0) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border border-gray-200 bg-white py-3 text-center text-sm text-gray-400 shadow-xl">
        No users found
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl">
      <div className="max-h-64 overflow-y-auto py-1" ref={listRef}>
        {filtered.map((user, i) => (
          <button
            key={user.id}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(user);
            }}
            className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
              i === activeIndex ? "bg-[#1264a3] text-white" : "text-gray-800 hover:bg-gray-100"
            }`}
          >
            <Avatar username={user.username} size="md" />
            <div className="min-w-0 flex-1">
              <span className={`text-sm font-bold ${i === activeIndex ? "text-white" : "text-gray-900"}`}>
                {user.username}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-gray-100 px-4 py-1.5">
        <span className="text-[11px] text-gray-400">
          <kbd className="rounded border border-gray-200 bg-gray-50 px-1 text-[10px]">↑↓</kbd> navigate
          {" · "}
          <kbd className="rounded border border-gray-200 bg-gray-50 px-1 text-[10px]">Enter</kbd> select
          {" · "}
          <kbd className="rounded border border-gray-200 bg-gray-50 px-1 text-[10px]">Esc</kbd> dismiss
        </span>
      </div>
    </div>
  );
}
