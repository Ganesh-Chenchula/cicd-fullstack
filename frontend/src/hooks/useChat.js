import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation,
  getConversations,
  getMessages,
  getUsers,
  sendMessage,
  api,
} from "../services/api";
import { createChatSocket } from "../services/websocket";
import {
  getConversationId,
  getMessageId,
  normalizeList,
} from "../utils/messageUtils";

export default function useChat(user) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const conversationsRef = useRef([]);
  const activeIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeIdRef.current = getConversationId(activeConversation);
  }, [activeConversation]);

  const refreshConversations = useCallback(async () => {
    const result = await getConversations();
    const list = normalizeList(result);

    setConversations(list);
    return list;
  }, []);

  const refreshUsers = useCallback(async () => {
    const result = await getUsers();
    setUsers(normalizeList(result));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        setError("");

        const [conversationResult, userResult] = await Promise.all([
          getConversations(),
          getUsers(),
        ]);

        if (cancelled) return;

        const conversationList = normalizeList(conversationResult);
        setConversations(conversationList);
        setUsers(normalizeList(userResult));

        if (conversationList.length > 0) {
          setActiveConversation((current) => {
            if (current) {
              const match = conversationList.find(
                (item) =>
                  String(getConversationId(item)) ===
                  String(getConversationId(current))
              );

              return match || current;
            }

            return conversationList[0];
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load chat data.");
      }
    }

    if (user) loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [user, refreshConversations, refreshUsers]);

  useEffect(() => {
    const id = getConversationId(activeConversation);

    if (!id) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    setMessages([]);
    setError("");

    async function loadMessages() {
      try {
        const result = await getMessages(id);
        if (!cancelled) setMessages(normalizeList(result));
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load messages.");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [activeConversation]);

  const handleSocketEvent = useCallback((event) => {
    const type = event?.type || event?.event;
    const payload = event?.message || event?.data || event;

    if (type === "message" || type === "new_message" || type === "chat.message") {
      const incoming = payload?.message || payload;
      if (!incoming || !getMessageId(incoming)) return;

      setMessages((current) => {
        const id = getMessageId(incoming);
        const exists = current.some(
          (message) => String(getMessageId(message)) === String(id)
        );

        if (exists) {
          return current.map((message) =>
            String(getMessageId(message)) === String(id)
              ? { ...message, ...incoming }
              : message
          );
        }

        return [...current, incoming];
      });

      const conversationId =
        event.conversation_id ??
        incoming.conversation_id ??
        getConversationId(activeConversation);

      setConversations((current) =>
        current.map((conversation) => {
          if (
            String(getConversationId(conversation)) !==
            String(conversationId)
          ) return conversation;

          return {
            ...conversation,
            last_message: incoming,
          };
        })
      );
    }

    if (type === "typing") {
      const username =
        event.username ||
        event.user?.username ||
        payload?.username;

      if (!username || username === user?.username) return;

      setTypingUsers((current) =>
        current.includes(username) ? current : [...current, username]
      );

      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        setTypingUsers((current) =>
          current.filter((name) => name !== username)
        );
      }, 2500);
    }

    if (type === "read") {
      const ids = event.message_ids || [];
      const readerId = event.user_id;

      setMessages((current) =>
        current.map((message) => {
          const selected = ids.length
            ? ids.some((id) => String(id) === String(getMessageId(message)))
            : String(message.id) === String(event.message_id);

          if (!selected) return message;

          return {
            ...message,
            is_read: true,
            status: "read",
            read_by: readerId,
          };
        })
      );
    }

    if (type === "presence") {
      const personId = event.user_id;
      const online = event.is_online ?? event.online;

      setUsers((current) =>
        current.map((person) =>
          String(person.id) === String(personId)
            ? { ...person, is_online: Boolean(online) }
            : person
        )
      );
    }
  }, [activeConversation, user]);

  useEffect(() => {
    const id = getConversationId(activeConversation);
    if (!id) return undefined;

    const connection = createChatSocket(id, {
      onEvent: handleSocketEvent,
      onError: () => {
        // REST remains available if the real-time connection fails.
      },
    });

    socketRef.current = connection;

    return () => {
      connection.close();

      if (socketRef.current === connection) {
        socketRef.current = null;
      }

      window.clearTimeout(typingTimeoutRef.current);
    };
  }, [activeConversation, handleSocketEvent]);

  const send = useCallback(async (content, replyTo = null) => {
    const conversationId = getConversationId(activeConversation);
    if (!conversationId || !content.trim()) return false;

    const payload = {
      content: content.trim(),
      ...(replyTo ? { reply_to: getMessageId(replyTo) } : {}),
    };

    try {
      const result = await sendMessage(conversationId, payload);
      const message = result?.message ?? result;

      if (message && getMessageId(message)) {
        setMessages((current) => {
          const exists = current.some(
            (item) =>
              String(getMessageId(item)) === String(getMessageId(message))
          );

          return exists
            ? current.map((item) =>
                String(getMessageId(item)) === String(getMessageId(message))
                  ? { ...item, ...message }
                  : item
              )
            : [...current, message];
        });
      } else {
        const refreshed = await getMessages(conversationId);
        setMessages(normalizeList(refreshed));
      }

      refreshConversations().catch(() => {});
      return true;
    } catch (err) {
      setError(err.message || "Message could not be sent.");
      return false;
    }
  }, [activeConversation, refreshConversations]);

  const notifyTyping = useCallback(() => {
    socketRef.current?.send({
      type: "typing",
      username: user?.username,
    });
  }, [user]);

  const reactToMessage = useCallback(async (message, emoji) => {
    const id = getMessageId(message);

    try {
      const result = await api(`/chat/messages/${id}/reactions/`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });

      const updated = result?.message;
      if (updated) {
        setMessages((current) =>
          current.map((item) =>
            String(getMessageId(item)) === String(id)
              ? { ...item, ...updated }
              : item
          )
        );
      } else {
        const conversationId = getConversationId(activeConversation);
        const refreshed = await getMessages(conversationId);
        setMessages(normalizeList(refreshed));
      }
    } catch (err) {
      setError(err.message || "Unable to add reaction.");
    }
  }, [activeConversation]);

  const deleteMessage = useCallback(async (message) => {
    const id = getMessageId(message);

    try {
      const result = await api(`/chat/messages/${id}/`, {
        method: "DELETE",
      });

      setMessages((current) =>
        current.map((item) =>
          String(getMessageId(item)) === String(id)
            ? { ...item, is_deleted: true, content: "" }
            : item
        )
      );

      return result;
    } catch (err) {
      setError(err.message || "Unable to delete message.");
      return null;
    }
  }, []);

  const startDirect = useCallback(async (person) => {
    const existing = conversationsRef.current.find((conversation) => {
      const type = conversation.kind || conversation.type || "direct";
      const members = conversation.members || conversation.participants || [];

      return type === "direct" && members.some((member) => {
        const memberId =
          member.user?.id ?? member.id ?? member.user_id;

        return String(memberId) === String(person.id);
      });
    });

    if (existing) {
      setActiveConversation(existing);
      return;
    }

    try {
      const result = await createConversation({
        kind: "direct",
        type: "direct",
        participant_ids: [person.id],
        member_ids: [person.id],
      });

      const conversation = result?.conversation ?? result;

      if (getConversationId(conversation)) {
        setConversations((current) => [
          conversation,
          ...current.filter(
            (item) =>
              String(getConversationId(item)) !==
              String(getConversationId(conversation))
          ),
        ]);

        setActiveConversation(conversation);
      } else {
        await refreshConversations();
      }
    } catch (err) {
      setError(err.message || "Unable to start direct conversation.");
    }
  }, [refreshConversations]);

  const createNewConversation = useCallback(async () => {
    const name = window.prompt("Enter a name for your group or channel:");
    if (!name?.trim()) return;

    const kind = window.confirm(
      "Create a channel? Choose Cancel to create a group."
    ) ? "channel" : "group";

    try {
      const result = await createConversation({
        kind,
        type: kind,
        name: name.trim(),
        title: name.trim(),
      });

      const conversation = result?.conversation ?? result;

      if (getConversationId(conversation)) {
        setConversations((current) => [
          conversation,
          ...current.filter(
            (item) =>
              String(getConversationId(item)) !==
              String(getConversationId(conversation))
          ),
        ]);
        setActiveConversation(conversation);
      } else {
        await refreshConversations();
      }
    } catch (err) {
      setError(
        err.message ||
        "Unable to create conversation. Check the backend's required fields."
      );
    }
  }, [refreshConversations]);

  return {
    conversations,
    users,
    activeConversation,
    setActiveConversation,
    messages,
    typingUsers,
    loadingMessages,
    error,
    setError,
    send,
    notifyTyping,
    reactToMessage,
    deleteMessage,
    startDirect,
    createNewConversation,
    refreshConversations,
  };
}