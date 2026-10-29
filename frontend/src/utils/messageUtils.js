export function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.users)) return data.users;
  return [];
}

export function getMessageId(message) {
  return message?.id ?? message?.message_id;
}

export function getMessageText(message) {
  return message?.content ?? message?.text ?? message?.body ?? "";
}

export function getMessageDate(message) {
  return (
    message?.created_at ??
    message?.timestamp ??
    message?.createdAt ??
    null
  );
}

export function getUsername(user) {
  if (!user) return "Unknown user";

  return (
    user.username ??
    user.user?.username ??
    user.sender?.username ??
    user.sender_username ??
    user.user_name ??
    user.email ??
    "Unknown user"
  );
}

export function getConversationId(conversation) {
  return conversation?.id ?? conversation?.conversation_id;
}

export function getConversationName(conversation, currentUser) {
  if (!conversation) return "Select a conversation";

  const kind = String(
    conversation.kind ?? conversation.type ?? "direct"
  ).toLowerCase();

  if (kind === "group" || kind === "channel") {
    return (
      conversation.name ??
      conversation.title ??
      (kind === "channel" ? "Unnamed channel" : "Unnamed group")
    );
  }

  // Use explicit direct-message participant fields when available.
  const otherUsername =
    conversation.other_username ??
    conversation.recipient?.username ??
    conversation.other_user?.username;

  if (otherUsername) return otherUsername;

  const members = conversation.members ?? conversation.participants ?? [];

  const other = members.find((member) => {
    const memberUser = member.user ?? member;
    const memberId = memberUser.id ?? member.user_id;

    return String(memberId) !== String(currentUser?.id);
  });

  if (other) {
    return getUsername(other.user ?? other);
  }

  return conversation.name ?? conversation.title ?? "Direct chat";
}

export function getAvatarLetter(value) {
  return String(value || "?").trim().charAt(0).toUpperCase() || "?";
}