import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Search,
  Video,
} from "lucide-react";
import {
  getAvatarLetter,
  getConversationName,
} from "../utils/messageUtils";

export default function ChatHeader({
  conversation,
  currentUser,
  onBack,
  onSearch,
}) {
  if (!conversation) {
    return (
      <header className="chat-header">
        <span className="header-placeholder">Select a conversation</span>
      </header>
    );
  }

  const name = getConversationName(conversation, currentUser);
  const type = conversation.kind || conversation.type || "direct";

  const memberCount =
    conversation.members?.length ??
    conversation.participants?.length;

  return (
    <header className="chat-header">
      <button
        type="button"
        className="icon-button mobile-back-button"
        onClick={onBack}
        aria-label="Back to conversations"
      >
        <ArrowLeft size={20} />
      </button>

      <span className="avatar header-avatar">
        {conversation.avatar_url
          ? <img src={conversation.avatar_url} alt="" />
          : getAvatarLetter(name)}
      </span>

      <div className="chat-header-info">
        <h2>{name}</h2>
        <p>
          {type === "group"
            ? `${memberCount ?? "Group"} members`
            : type === "channel"
              ? "Channel"
              : conversation.is_online
                ? "Online"
                : "Direct conversation"}
        </p>
      </div>

      <div className="chat-header-actions">
        <button
          className="icon-button"
          type="button"
          aria-label="Search conversation"
          title="Search conversation"
          onClick={onSearch}
        >
          <Search size={19} />
        </button>

        <button
          className="icon-button optional-action"
          type="button"
          aria-label="Voice call"
          title="Voice calling is not configured"
          onClick={() => window.alert("Voice calling is not configured yet.")}
        >
          <Phone size={19} />
        </button>

        <button
          className="icon-button optional-action"
          type="button"
          aria-label="Video call"
          title="Video calling is not configured"
          onClick={() => window.alert("Video calling is not configured yet.")}
        >
          <Video size={20} />
        </button>

        <button
          className="icon-button"
          type="button"
          aria-label="More conversation options"
          title="More options"
          onClick={() => window.alert("More conversation options can be added here.")}
        >
          <MoreVertical size={20} />
        </button>
      </div>
    </header>
  );
}