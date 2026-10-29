
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ArrowLeft,
  MessageCircle,
  Paperclip,
  Send,
  Smile,
  MoreVertical,
  Wifi,
  WifiOff,
} from "lucide-react";

import { api, getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { connectConversation } from "../services/websocket";
import ConversationSidebar from "./ConversationSidebar";
import MessageBubble from "./MessageBubble";

function formatDay(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() !== today.getFullYear()
        ? "numeric"
        : undefined,
  });
}

function sortMessages(items) {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();

    return timeA - timeB || Number(a.id) - Number(b.id);
  });
}

function mergeMessage(items, incoming) {
  if (!incoming?.id) return items;

  const exists = items.some(
    (item) => Number(item.id) === Number(incoming.id)
  );

  if (exists) {
    return sortMessages(
      items.map((item) =>
        Number(item.id) === Number(incoming.id)
          ? { ...item, ...incoming }
          : item
      )
    );
  }

  return sortMessages([...items, incoming]);
}

export default function ChatPage() {
  const { user } = useAuth();

  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [error, setError] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);

  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const draftRef = useRef(null);
  const activeConversationIdRef = useRef(null);

  // These paths match the provided backend/chat/urls.py.
  const messageUrl = useCallback(
    (conversationId) =>
      `/chat/conversations/${conversationId}/messages/`,
    []
  );

  const messageActionUrl = useCallback(
    (messageId) => `/chat/messages/${messageId}/`,
    []
  );

  // Django route uses "reactions/" (plural).
  const reactionUrl = useCallback(
    (messageId) => `/chat/messages/${messageId}/reactions/`,
    []
  );

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  const loadMessages = useCallback(
    async (conversationId) => {
      setLoadingMessages(true);
      setError("");

      try {
        const response = await api.get(messageUrl(conversationId));
        const data = response.data;
        const list = Array.isArray(data)
          ? data
          : data?.results ?? [];

        if (
          Number(activeConversationIdRef.current) ===
          Number(conversationId)
        ) {
          setMessages(sortMessages(list));
        }
      } catch (err) {
        setError(getErrorMessage(err));
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [messageUrl]
  );

  useEffect(() => {
    const conversationId = activeConversation?.id ?? null;
    activeConversationIdRef.current = conversationId;

    if (!conversationId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setMessages([]);
    loadMessages(conversationId);
  }, [activeConversation?.id, loadMessages]);

  // Conversation WebSocket.
  useEffect(() => {
    const conversationId = activeConversation?.id;

    if (!conversationId) {
      setSocketStatus("disconnected");
      return undefined;
    }

    let mounted = true;

    setSocketStatus("connecting");

    const connection = connectConversation(conversationId, {
      onOpen: () => {
        if (mounted) setSocketStatus("connected");
      },

      onClose: () => {
        if (mounted) setSocketStatus("disconnected");
      },

      onError: () => {
        if (mounted) setSocketStatus("disconnected");
      },

      onEvent: (event) => {
        if (!mounted) return;

        const type = event.type || event.event;

        if (type === "message_event" || type === "message") {
          const incoming =
            event.message ||
            event.data?.message ||
            event.data;

          if (
            incoming?.id &&
            Number(event.conversation_id ?? activeConversationIdRef.current) ===
              Number(activeConversationIdRef.current)
          ) {
            setMessages((current) => mergeMessage(current, incoming));
          } else if (
            Number(event.conversation_id) ===
            Number(activeConversationIdRef.current)
          ) {
            loadMessages(activeConversationIdRef.current);
          }
        }

        if (type === "typing_event" || type === "typing") {
          const username = event.username || event.user;

          if (username && username !== user?.username) {
            setTypingUser(username);

            clearTimeout(typingTimerRef.current);

            typingTimerRef.current = setTimeout(() => {
              if (mounted) setTypingUser("");
            }, 2200);
          }
        }

        if (type === "presence_event") {
          // Presence can be connected to a user-status indicator
          // once the backend supplies the corresponding user data.
        }

        if (type === "read_event") {
          // Conversation-level read events do not automatically
          // provide per-message read receipts.
        }
      },
    });

    socketRef.current = connection;

    return () => {
      mounted = false;

      clearTimeout(typingTimerRef.current);
      connection.close();

      if (socketRef.current === connection) {
        socketRef.current = null;
      }

      setTypingUser("");
    };
  }, [activeConversation?.id, user?.username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function selectConversation(conversation) {
    setActiveConversation(conversation);
    setMobileChatOpen(true);
    setError("");
    setDraft("");
    setEditingMessage(null);
  }

  function handleConversationCreated(conversation) {
    setActiveConversation(conversation);
    setMobileChatOpen(true);
    setMessages([]);
    setDraft("");
    setError("");
    setEditingMessage(null);
  }

  function sendTypingEvent() {
    socketRef.current?.send({
      type: "typing",
      username: user?.username,
    });
  }

  async function sendMessage(event) {
    event?.preventDefault();

    const conversationId = activeConversation?.id;
    const content = draft.trim();

    if (!conversationId || !content || sending) return;

    setError("");
    setSending(true);

    try {
      if (editingMessage) {
        const response = await api.patch(
          messageActionUrl(editingMessage.id),
          { content }
        );

        setMessages((current) =>
          mergeMessage(current, response.data)
        );

        setEditingMessage(null);
        setDraft("");
        return;
      }

      const response = await api.post(
        messageUrl(conversationId),
        { content }
      );

      setMessages((current) =>
        mergeMessage(current, response.data)
      );

      setDraft("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
      draftRef.current?.focus();
    }
  }

  async function reactToMessage(messageId, emoji) {
    if (!activeConversation?.id) return;

    setError("");

    try {
      const response = await api.post(
        reactionUrl(messageId),
        { emoji }
      );

      const result = response.data;

      // The backend response should include the updated reactions.
      // Reload the message if the endpoint only returns toggle status.
      if (Array.isArray(result?.reactions)) {
        setMessages((current) =>
          current.map((message) =>
            Number(message.id) === Number(messageId)
              ? {
                  ...message,
                  reactions: result.reactions,
                }
              : message
          )
        );
      } else {
        await loadMessages(activeConversation.id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteMessage(message) {
    if (!activeConversation?.id) return;

    const confirmed = window.confirm(
      "Delete this message? This action cannot be undone."
    );

    if (!confirmed) return;

    setError("");

    try {
      await api.delete(messageActionUrl(message.id));

      setMessages((current) =>
        current.map((item) =>
          Number(item.id) === Number(message.id)
            ? {
                ...item,
                content: "",
                is_deleted: true,
                deleted_at: new Date().toISOString(),
              }
            : item
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function editMessage(message) {
    if (!message || message.is_deleted || message.deleted_at) return;

    setEditingMessage(message);
    setDraft(message.content || "");

    requestAnimationFrame(() => {
      draftRef.current?.focus();
    });
  }

  function cancelEditing() {
    setEditingMessage(null);
    setDraft("");
    draftRef.current?.focus();
  }

  const conversationTitle =
    activeConversation?.name ||
    activeConversation?.members?.find((member) => {
      const id =
        typeof member === "object" ? member.id : member;

      return Number(id) !== Number(user?.id);
    })?.username ||
    "Conversation";

  let lastDay = "";

  return (
    <main
      className={`chat-layout ${
        mobileChatOpen ? "mobile-chat-open" : ""
      }`}
    >
      <ConversationSidebar
        activeId={activeConversation?.id}
        onSelect={selectConversation}
        onConversationCreated={handleConversationCreated}
      />

      <section className="chat-main">
        {!activeConversation ? (
          <div className="welcome-panel">
            <div className="welcome-illustration">
              <MessageCircle size={36} />
            </div>

            <span className="eyebrow">
              YOUR MESSAGES, YOUR SPACE
            </span>

            <h1>Make room for a good conversation.</h1>

            <p>
              Choose a conversation or start a new one to connect.
            </p>
          </div>
        ) : (
          <>
            <header className="chat-header">
              <button
                type="button"
                className="icon-button mobile-back"
                onClick={() => setMobileChatOpen(false)}
                aria-label="Back to conversations"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="avatar chat-header-avatar">
                {conversationTitle.slice(0, 1).toUpperCase()}
              </div>

              <div className="chat-header-info">
                <h2>{conversationTitle}</h2>

                <span className="connection-status">
                  <span
                    className={`status-dot ${socketStatus}`}
                  />

                  {socketStatus === "connected"
                    ? "Connected"
                    : socketStatus === "connecting"
                    ? "Connecting…"
                    : "Live updates disconnected"}
                </span>
              </div>

              <div className="chat-header-actions">
                {socketStatus === "connected" ? (
                  <Wifi size={17} />
                ) : (
                  <WifiOff size={17} />
                )}

                <button
                  type="button"
                  className="icon-button"
                  title="Conversation options"
                  aria-label="Conversation options"
                >
                  <MoreVertical size={19} />
                </button>
              </div>
            </header>

            <div className="messages-scroll">
              <div className="message-intro">
                <span className="avatar large-avatar">
                  {conversationTitle.slice(0, 1).toUpperCase()}
                </span>

                <h3>{conversationTitle}</h3>

                <p>
                  This is the beginning of your conversation.
                </p>
              </div>

              {loadingMessages && (
                <p className="center-hint">
                  Loading messages…
                </p>
              )}

              {error && (
                <div
                  className="error-message chat-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!loadingMessages && messages.length === 0 && !error && (
                <p className="center-hint">
                  No messages yet. Send the first message!
                </p>
              )}

              {messages.map((message) => {
                const day = formatDay(message.created_at);
                const showDay = day !== lastDay;

                lastDay = day;

                return (
                  <div key={message.id}>
                    {showDay && (
                      <div className="date-divider">
                        <span>{day}</span>
                      </div>
                    )}

                    <MessageBubble
                      message={message}
                      currentUserId={user?.id}
                      onReact={reactToMessage}
                      onEdit={editMessage}
                      onDelete={deleteMessage}
                    />
                  </div>
                );
              })}

              {typingUser && (
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                  {typingUser} is typing…
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form className="composer" onSubmit={sendMessage}>
              {editingMessage && (
                <div className="editing-banner">
                  <span>Editing message</span>

                  <button
                    type="button"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="composer-box">
                <button
                  type="button"
                  className="icon-button composer-tool"
                  title="React to messages using the smile icon beside each message"
                  aria-label="Emoji reactions are available on messages"
                >
                  <Smile size={20} />
                </button>

                <textarea
                  ref={draftRef}
                  value={draft}
                  rows={1}
                  maxLength={5000}
                  placeholder={
                    editingMessage
                      ? "Edit your message…"
                      : "Write a message…"
                  }
                  onChange={(event) => {
                    setDraft(event.target.value);
                    sendTypingEvent();
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      sendMessage();
                    }

                    if (event.key === "Escape" && editingMessage) {
                      cancelEditing();
                    }
                  }}
                  disabled={sending}
                />

                <button
                  type="button"
                  className="icon-button composer-tool attachment-button"
                  title="Attachments are not enabled yet"
                  aria-label="Attachments not enabled"
                  disabled
                >
                  <Paperclip size={19} />
                </button>

                <button
                  type="submit"
                  className="send-button"
                  disabled={!draft.trim() || sending}
                  aria-label={
                    editingMessage ? "Save edit" : "Send message"
                  }
                >
                  {editingMessage ? (
                    <Check size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>

              <span className="composer-hint">
                Enter to send · Shift + Enter for a new line
              </span>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
