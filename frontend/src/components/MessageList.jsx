import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { getDayLabel, isSameDay } from "../utils/dateUtils";
import { getMessageDate, getMessageId } from "../utils/messageUtils";

export default function MessageList({
  messages,
  currentUser,
  onReply,
  onReact,
  onDelete,
  typingUsers = [],
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingUsers.length]);

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="chat-empty-state">
          <div className="empty-chat-icon">💬</div>
          <h3>Your conversation starts here</h3>
          <p>Send a message to get things going.</p>
        </div>
      )}

      {messages.map((message, index) => {
        const date = getMessageDate(message);
        const previous = messages[index - 1];
        const previousDate = getMessageDate(previous);
        const showDate = date && (
          index === 0 || !isSameDay(date, previousDate)
        );

        const senderId =
          message.sender?.id ??
          message.sender_id ??
          message.user_id;

        const mine = String(senderId) === String(currentUser?.id);

        return (
          <div key={getMessageId(message) ?? `message-${index}`}>
            {showDate && (
              <div className="date-separator">
                <span>{getDayLabel(date)}</span>
              </div>
            )}

            <MessageBubble
              message={message}
              isMine={mine}
              onReply={onReply}
              onReact={onReact}
              onDelete={onDelete}
            />
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <span className="typing-dots"><i /><i /><i /></span>
          <span>
            {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}