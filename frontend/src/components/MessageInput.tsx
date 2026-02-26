import { useState, useRef, useCallback, useEffect } from "react";
import { ListOrdered, List } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import MentionDropdown from "./MentionDropdown";
import type { UserDto } from "../types";

interface Props {
  contactName: string;
  users: UserDto[];
  online: boolean;
  onSend: (content: string) => void;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  insertOrderedList: boolean;
  insertUnorderedList: boolean;
}

const INITIAL_FORMAT: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertOrderedList: false,
  insertUnorderedList: false,
};

function ToolbarBtn({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`rounded p-1 transition-colors ${
        active
          ? "bg-[#1264a3]/10 text-[#1264a3]"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function insertAtCursor(el: HTMLElement, node: Node) {
  el.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    el.appendChild(node);
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  const newRange = document.createRange();
  newRange.setStartAfter(node);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function getHtmlContent(el: HTMLElement): string {
  const html = el.innerHTML;
  if (!html || html === "<br>" || html === "<div><br></div>") return "";
  return html;
}

export default function MessageInput({ contactName, users, online, onSend }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [formatState, setFormatState] = useState<FormatState>(INITIAL_FORMAT);
  const [activeBlock, setActiveBlock] = useState<string>("");
  const [mentionState, setMentionState] = useState<{
    active: boolean;
    filter: string;
    activeIndex: number;
  }>({ active: false, filter: "", activeIndex: 0 });

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(mentionState.filter.toLowerCase())
  );

  const checkEmpty = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent?.trim() ?? "";
    setIsEmpty(text.length === 0);
  }, []);

  const updateFormatState = useCallback(() => {
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
    });
    const block = document.queryCommandValue("formatBlock");
    setActiveBlock(block);
  }, []);

  const handleSend = useCallback(() => {
    if (!editorRef.current) return;
    const html = getHtmlContent(editorRef.current);
    if (!html) return;
    onSend(html);
    editorRef.current.innerHTML = "";
    setIsEmpty(true);
    setShowEmoji(false);
    setFormatState(INITIAL_FORMAT);
    setActiveBlock("");
    setMentionState({ active: false, filter: "", activeIndex: 0 });
  }, [onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionState.active) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionState((s) => ({
          ...s,
          activeIndex: Math.min(s.activeIndex + 1, filteredUsers.length - 1),
        }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionState((s) => ({
          ...s,
          activeIndex: Math.max(s.activeIndex - 1, 0),
        }));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const user = filteredUsers[mentionState.activeIndex];
        if (user) insertMention(user);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionState({ active: false, filter: "", activeIndex: 0 });
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    checkEmpty();
    updateFormatState();

    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) {
      if (mentionState.active)
        setMentionState({ active: false, filter: "", activeIndex: 0 });
      return;
    }

    const text = textNode.textContent ?? "";
    const cursorPos = range.startOffset;
    const beforeCursor = text.slice(0, cursorPos);

    const atMatch = beforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionState({ active: true, filter: atMatch[1], activeIndex: 0 });
    } else if (mentionState.active) {
      setMentionState({ active: false, filter: "", activeIndex: 0 });
    }
  };

  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current.contains(sel.anchorNode)
    ) {
      updateFormatState();
    }
  }, [updateFormatState]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  const insertMention = (user: UserDto) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return;

    const text = textNode.textContent ?? "";
    const cursorPos = range.startOffset;
    const beforeCursor = text.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const start = cursorPos - atMatch[0].length;
      const before = text.slice(0, start);
      const after = text.slice(cursorPos);

      const pill = document.createElement("span");
      pill.contentEditable = "false";
      pill.dataset.mentionUser = user.username;
      pill.className = "mention-pill";
      pill.textContent = `@${user.username}`;

      const parent = textNode.parentNode!;
      const beforeNode = document.createTextNode(before);
      const spacer = document.createTextNode("\u00A0");
      const afterNode = document.createTextNode(after);

      parent.replaceChild(afterNode, textNode);
      parent.insertBefore(spacer, afterNode);
      parent.insertBefore(pill, spacer);
      parent.insertBefore(beforeNode, pill);

      const newRange = document.createRange();
      newRange.setStartAfter(spacer);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    setMentionState({ active: false, filter: "", activeIndex: 0 });
    checkEmpty();
  };

  const insertEmoji = (emoji: string) => {
    if (!editorRef.current) return;
    insertAtCursor(editorRef.current, document.createTextNode(emoji));
    checkEmpty();
    setShowEmoji(false);
  };

  const openMentionManually = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    insertAtCursor(editorRef.current, document.createTextNode("@"));
    setMentionState({ active: true, filter: "", activeIndex: 0 });
    checkEmpty();
  };

  const execFormat = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    updateFormatState();
  };

  const toggleBlock = (tag: string) => {
    editorRef.current?.focus();
    const current = document.queryCommandValue("formatBlock");
    if (current.toLowerCase() === tag.toLowerCase()) {
      document.execCommand("formatBlock", false, "div");
    } else {
      document.execCommand("formatBlock", false, tag);
    }
    updateFormatState();
  };

  useEffect(() => {
    if (!showEmoji) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-emoji-picker]")) setShowEmoji(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showEmoji]);

  return (
    <div className="border-t border-gray-200 px-5 py-3">
      <div className="relative rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:shadow-sm">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-0.5 border-b border-gray-100 px-2 py-1">
          <ToolbarBtn title="Bold (Ctrl+B)" active={formatState.bold} onClick={() => execFormat("bold")}>
            <span className="text-sm font-bold">B</span>
          </ToolbarBtn>
          <ToolbarBtn title="Italic (Ctrl+I)" active={formatState.italic} onClick={() => execFormat("italic")}>
            <span className="text-sm italic font-medium">I</span>
          </ToolbarBtn>
          <ToolbarBtn title="Underline (Ctrl+U)" active={formatState.underline} onClick={() => execFormat("underline")}>
            <span className="text-sm underline">U</span>
          </ToolbarBtn>
          <ToolbarBtn title="Strikethrough" active={formatState.strikeThrough} onClick={() => execFormat("strikeThrough")}>
            <span className="text-sm line-through">S</span>
          </ToolbarBtn>

          <div className="mx-1 h-4 w-px bg-gray-200" />

          <ToolbarBtn title="Link" onClick={() => {
            const url = prompt("Enter URL:");
            if (url) execFormat("createLink", url);
          }}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </ToolbarBtn>

          <ToolbarBtn title="Numbered list (line by line as 1. 2. 3.)" active={formatState.insertOrderedList} onClick={() => execFormat("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Bulleted List" active={formatState.insertUnorderedList} onClick={() => execFormat("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </ToolbarBtn>

          <div className="mx-1 h-4 w-px bg-gray-200" />

          <ToolbarBtn title="Blockquote" active={activeBlock === "blockquote"} onClick={() => toggleBlock("blockquote")}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="4" x2="3" y2="20" strokeWidth="3" strokeLinecap="round" />
              <path d="M9 8h12M9 12h10M9 16h8" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn title="Code Block" active={activeBlock === "pre"} onClick={() => toggleBlock("pre")}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn title="Inline Code" onClick={() => {
            const sel = window.getSelection();
            if (sel && sel.toString()) {
              execFormat("insertHTML", `<code>${sel.toString()}</code>`);
            }
          }}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" />
            </svg>
          </ToolbarBtn>
        </div>

        {/* Editable Area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={updateFormatState}
          data-placeholder={online ? `Message ${contactName}` : "Offline — message will be queued"}
          className="msg-editor min-h-[40px] max-h-32 overflow-y-auto px-3 py-2 text-[15px] text-gray-900 outline-none"
        />

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-0.5">
            <div data-emoji-picker className="relative">
              <ToolbarBtn title="Emoji" onClick={() => setShowEmoji(!showEmoji)}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                </svg>
              </ToolbarBtn>
              {showEmoji && (
                <EmojiPicker
                  onSelect={insertEmoji}
                  onClose={() => setShowEmoji(false)}
                />
              )}
            </div>
            <ToolbarBtn title="Mention someone" onClick={openMentionManually}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" />
                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
              </svg>
            </ToolbarBtn>
          </div>

          <div className="flex items-center">
            <button
              onClick={handleSend}
              disabled={isEmpty}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                isEmpty
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-[#007a5a] text-white hover:bg-[#148567]"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
            {!isEmpty && (
              <button className="ml-0.5 rounded-r-lg border-l border-[#005e47] bg-[#007a5a] px-1.5 py-1.5 text-white hover:bg-[#148567]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {mentionState.active && (
          <MentionDropdown
            users={users}
            filter={mentionState.filter}
            activeIndex={mentionState.activeIndex}
            onSelect={insertMention}
            onClose={() =>
              setMentionState({ active: false, filter: "", activeIndex: 0 })
            }
          />
        )}
      </div>

      {!online && (
        <p className="mt-1.5 text-center text-xs text-amber-600">
          You are currently offline. Messages will be sent automatically when you reconnect.
        </p>
      )}
    </div>
  );
}
