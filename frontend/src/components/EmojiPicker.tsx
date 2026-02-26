const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀", "😂", "🙂", "😊", "😍", "🥰", "😘", "😜", "🤔", "😴", "🙄", "😎", "🥳", "😢", "😤", "😡", "🤯", "🥲", "😇", "🤗"],
  },
  {
    label: "Gestures",
    emojis: ["👋", "👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "💪", "🫡", "🙏", "☝️", "👀", "🫶", "🤙", "✋", "🖐️", "🤘", "👊", "✊"],
  },
  {
    label: "Hearts & Symbols",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💯", "🔥", "⭐", "✨", "🎉", "🎊", "✅", "❌", "⚡", "💡", "🚀", "💬"],
  },
  {
    label: "Objects",
    emojis: ["☕", "🍕", "🍔", "🎂", "🍺", "🎵", "📎", "📌", "💻", "📱", "🔔", "📅", "🗂️", "📝", "🔑", "🏠", "⏰", "📊", "🎯", "🏆"],
  },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <span className="text-sm font-bold text-gray-700">Emoji</span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.label} className="mb-2">
            <p className="mb-1 px-1 text-[11px] font-semibold text-gray-400 uppercase">{cat.label}</p>
            <div className="grid grid-cols-10 gap-0.5">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-gray-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
