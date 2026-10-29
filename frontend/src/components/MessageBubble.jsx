
import { useState } from "react";
import {
  Check,
  CheckCheck,
  MoreHorizontal,
  Smile,
  Trash2,
  Pencil,
} from "lucide-react";

const EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "🔥", "😮", "😢"];

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSenderId(message) {
  return message?.sender_id ?? message?.sender?.id ?? null;
}

function getSenderName(message) {
  const sender = message?.sender;

  return (
    message?.sender_profile?.display_name ||
    message?.sender_profile?.username ||
    (typeof sender === "string" ? sender : sender?.username) ||
    "User"
  );
}

function getReactionSummary(reactions = [], currentUserId) {
  if (!Array.isArray(reactions)) return [];

  const groups = new Map();

  for (const reaction of reactions) {
    if (!reaction?.emoji) continue;

    const emoji = reaction.emoji;

    if (!groups.has(emoji)) {
      groups.set(emoji, {
        emoji,
        count: 0,
        mine: false,
      });
    }

    const group = groups.get(emoji);
    group.count += 1;

    const reactionUserId =
      reaction.user_id ??
      reaction.user?.id ??
      null;

    if (
      reaction.is_mine === true ||
      (
        currentUserId != null &&
        reactionUserId != null &&
        String(reactionUserId) === String(currentUserId)
      )
    ) {
      group.mine = true;
    }
  }

  return Array.from(groups.values());
}

export default function MessageBubble({
  message,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  if (!message) return null;

  const senderId = getSenderId(message);

  const mine =
    currentUserId != null &&
    senderId != null &&
    String(senderId) === String(currentUserId);

  const deleted = Boolean(
    message.is_deleted || message.deleted_at
  );

  const senderName = getSenderName(message);

  const reactions = getReactionSummary(
    message.reactions,
    currentUserId
  );

  // read_at must be provided by the backend for accurate read receipts.
  const isRead = Boolean(message.read_at);

  function handleReact(emoji) {
    onReact?.(message.id, emoji);
    setEmojiOpen(false);
  }

  function handleEdit() {
    onEdit?.(message);
    setMenuOpen(false);
  }

  function handleDelete() {
    onDelete?.(message);
    setMenuOpen(false);
  }

  return (
    <article
      className={`message-row ${mine ? "mine" : "theirs"}`}
      data-message-id={message.id}
    >
      {!mine && (
        <div className="avatar message-avatar" aria-hidden="true">
          {senderName.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="message-stack">
        {!mine && (
          <span className="message-sender">
            {senderName}
          </span>
        )}

        <div
          className={`message-bubble ${
            mine ? "outgoing" : "incoming"
          }`}
        >
          {message.reply_to && (
            <div className="reply-preview">
              <span>Replying to a message</span>
            </div>
          )}

          <p className={deleted ? "deleted-message" : ""}>
            {deleted
              ? "This message was deleted."
              : message.content || ""}
          </p>

          <div className="message-meta">
            {message.edited_at && !deleted && (
              <span>Edited</span>
            )}

            <time dateTime={message.created_at || undefined}>
              {formatTime(message.created_at)}
            </time>

            {mine && (
              <span
                className="message-status"
                title={isRead ? "Read" : "Sent"}
                aria-label={isRead ? "Read" : "Sent"}
              >
                {isRead ? (
                  <CheckCheck size={14} />
                ) : (
                  <Check size={14} />
                )}
              </span>
            )}
          </div>
        </div>

        {!deleted && (
          <>
            {reactions.length > 0 && (
              <div className="reaction-list">
                {reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    type="button"
                    className={`reaction-chip ${
                      reaction.mine ? "selected" : ""
                    }`}
                    onClick={() =>
                      handleReact(reaction.emoji)
                    }
                    title={`${reaction.count} reaction${
                      reaction.count === 1 ? "" : "s"
                    }`}
                    aria-label={`${reaction.emoji}, ${reaction.count} reactions`}
                  >
                    {reaction.emoji}
                    <span>{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="message-actions">
              <button
                type="button"
                className="tiny-action"
                aria-label="React to message"
                aria-expanded={emojiOpen}
                onClick={() => {
                  setEmojiOpen((value) => !value);
                  setMenuOpen(false);
                }}
              >
                <Smile size={15} />
              </button>

              {mine && (
                <button
                  type="button"
                  className="tiny-action"
                  aria-label="Message options"
                  aria-expanded={menuOpen}
                  onClick={() => {
                    setMenuOpen((value) => !value);
                    setEmojiOpen(false);
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>
              )}

              {emojiOpen && (
                <div
                  className="emoji-popover"
                  role="group"
                  aria-label="Choose a reaction"
                >
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`React with ${emoji}`}
                      onClick={() => handleReact(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {menuOpen && mine && (
                <div className="message-menu">
                  <button
                    type="button"
                    onClick={handleEdit}
                  >
                    <Pencil size={14} />
                    Edit message
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} />
                    Delete message
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
