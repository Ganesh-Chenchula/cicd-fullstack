import { useEffect, useRef } from "react";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "🥹", "😂", "🤣",
  "😊", "😍", "🥰", "😘", "😎", "🤔", "🙌", "👏",
  "👍", "👎", "❤️", "🧡", "💛", "💚", "💙", "💜",
  "🔥", "🎉", "✨", "💯", "🙏", "🤝", "👀", "🚀",
  "😢", "😭", "😡", "🤗", "🤩", "🥳", "💪", "☕",
];

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose?.();
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [onClose]);

  return (
    <div className="emoji-picker" ref={ref} role="dialog" aria-label="Emoji picker">
      <div className="emoji-picker-heading">Choose an emoji</div>
      <div className="emoji-grid">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            aria-label={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}