
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function getWebSocketBase() {
  const url = new URL(API_BASE_URL);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

export function connectConversation(conversationId, handlers = {}) {
  const base = getWebSocketBase();
  const socket = new WebSocket(
    `${base}/ws/chat/conversations/${conversationId}/`
  );

  socket.addEventListener("open", () => handlers.onOpen?.());

  socket.addEventListener("message", (event) => {
    try {
      handlers.onEvent?.(JSON.parse(event.data));
    } catch (error) {
      console.error("Invalid WebSocket message:", error);
    }
  });

  socket.addEventListener("error", (event) => {
    handlers.onError?.(event);
  });

  socket.addEventListener("close", (event) => {
    handlers.onClose?.(event);
  });

  return {
    socket,
    send(payload) {
      if (socket.readyState !== WebSocket.OPEN) return false;

      socket.send(JSON.stringify(payload));
      return true;
    },
    close() {
      socket.close();
    },
  };
}
