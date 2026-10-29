import { MessageCircle, Users, Hash } from "lucide-react";
import {
  getAvatarLetter,
  getConversationName,
  getConversationId,
} from "../utils/messageUtils";
import { formatMessageTime } from "../utils/dateUtils";

export default function ConversationList({
  conversations,
  currentUser,
  activeId,
  onSelect,
}) {
  if (!conversations.length) {
    return (
      <div className="empty-list">
        <MessageCircle size={28} />
        <strong>No conversations yet</strong>
        <span>Start a conversation with someone.</span>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {conversations.map((conversation) => {
        const id = getConversationId(conversation);
        const name = getConversationName(conversation, currentUser);
        const kind = conversation.kind || conversation.type || "direct";
        const latest =
          conversation.last_message ||
          conversation.latest_message ||
          conversation.lastMessage;

        const unread =
          Number(conversation.unread_count ?? conversation.unreadCount ?? 0);

        return (
          <button
            type="button"
            key={id}
            className={`conversation-item ${String(activeId) === String(id) ? "active" : ""}`}
            onClick={() => onSelect(conversation)}
          >
            <span className="avatar conversation-avatar">
              {conversation.avatar_url
                ? <img src={conversation.avatar_url} alt="" />
                : getAvatarLetter(name)}
              <span className={`avatar-kind ${kind === "group" ? "group-kind" : ""}`}>
                {kind === "group"
                  ? <Users size={11} />
                  : kind === "channel"
                    ? <Hash size={11} />
                    : null}
              </span>
            </span>

            <span className="conversation-copy">
              <span className="conversation-title">{name}</span>
              <span className="conversation-preview">
                {latest?.content || latest?.text || "Start chatting"}
              </span>
            </span>

            <span className="conversation-meta">
              {latest?.created_at && (
                <time>{formatMessageTime(latest.created_at)}</time>
              )}
              {unread > 0 && (
                <span className="unread-badge">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}