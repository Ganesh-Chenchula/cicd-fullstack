import { useCallback, useRef, useState } from "react";
import {
  ArrowUp,
  Paperclip,
  Smile,
  X,
  CornerUpLeft,
} from "lucide-react";
import EmojiPicker from "./EmojiPicker";

export default function MessageInput({
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  disabled = false,
}) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  const closeEmoji = useCallback(() => setShowEmoji(false), []);

  function insertEmoji(emoji) {
    setText((current) => current + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  function handleChange(event) {
    setText(event.target.value);
    onTyping?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const content = text.trim();
    if (!content || disabled) return;

    const success = await onSend(content);

    if (success !== false) {
      setText("");
      setShowEmoji(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="composer-area">
      {replyTo && (
        <div className="reply-composer-preview">
          <CornerUpLeft size={16} />
          <div>
            <strong>Replying to</strong>
            <span>{replyTo.content || replyTo.text || "Message"}</span>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={onCancelReply}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <form className="message-composer" onSubmit={handleSubmit}>
        <div className="composer-tools">
          <button
            type="button"
            className="icon-button"
            title="Attachments"
            aria-label="Attachments"
            onClick={() => window.alert("File attachments are not enabled yet.")}
          >
            <Paperclip size={19} />
          </button>
        </div>

        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          placeholder="Write a message…"
          aria-label="Write a message"
          rows={1}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />

        <div className="composer-tools emoji-tool-wrap">
          <button
            type="button"
            className={`icon-button ${showEmoji ? "tool-active" : ""}`}
            title="Choose emoji"
            aria-label="Choose emoji"
            onClick={() => setShowEmoji((value) => !value)}
          >
            <Smile size={20} />
          </button>

          {showEmoji && (
            <EmojiPicker onSelect={insertEmoji} onClose={closeEmoji} />
          )}
        </div>

        <button
          className="send-button"
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          title="Send message"
        >
          <ArrowUp size={20} />
        </button>
      </form>

      <p className="composer-hint">
        Press Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}