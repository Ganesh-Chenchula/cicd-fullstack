
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://novachat-backend-l5jy.onrender.com"
).replace(/\/+$/, "");

function getWebSocketBase() {
  const url = new URL(API_BASE_URL);

  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else {
    throw new Error(`Unsupported API URL protocol: ${url.protocol}`);
  }

  return url.origin;
}

export function connectConversation(conversationId, handlers = {}) {
  if (
    conversationId === undefined ||
    conversationId === null ||
    !/^\d+$/.test(String(conversationId)) ||
    Number(conversationId) <= 0
  ) {
    throw new Error("A valid conversation ID is required.");
  }

  const base = getWebSocketBase();
  const socket = new WebSocket(
    `${base}/ws/chat/conversations/${conversationId}/`
  );

  socket.addEventListener("open", () => {
    handlers.onOpen?.();
  });

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
      if (socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      socket.send(JSON.stringify(payload));
      return true;
    },

    close() {
      socket.close();
    },
  };
}
