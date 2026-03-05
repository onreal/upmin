import { fetchRealtimeTicket, type AuthState, type RemoteDocument } from "../../api";

export type RealtimeEvent =
  | { type: "realtime.ready" }
  | { type: "agent.conversation.updated"; conversation: RemoteDocument }
  | { type: "chat.conversation.updated"; conversation: RemoteDocument };

export type RealtimeStatus = "idle" | "connecting" | "open" | "closed" | "unauthorized";

type EventListener = (event: RealtimeEvent) => void;
type StatusListener = (status: RealtimeStatus) => void;

let socket: WebSocket | null = null;
let authProvider: (() => AuthState) | null = null;
let reconnectTimer: number | null = null;
let reconnectAttempt = 0;
let active = false;
let status: RealtimeStatus = "idle";

const eventListeners = new Set<EventListener>();
const statusListeners = new Set<StatusListener>();

const hasSubscribers = () => eventListeners.size > 0 || statusListeners.size > 0;

const setStatus = (next: RealtimeStatus) => {
  status = next;
  statusListeners.forEach((listener) => listener(next));
};

const clearReconnectTimer = () => {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const closeSocket = () => {
  if (!socket) {
    return;
  }

  const current = socket;
  socket = null;
  current.close();
};

const scheduleReconnect = () => {
  if (!active || reconnectTimer !== null || !hasSubscribers()) {
    return;
  }

  const delay = Math.min(1000 * 2 ** reconnectAttempt, 15000);
  reconnectAttempt += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    void connect();
  }, delay);
};

const currentAuth = () => (authProvider ? authProvider() : null);

const connect = async () => {
  if (!active || socket !== null || !hasSubscribers()) {
    return;
  }

  const auth = currentAuth();
  if (!auth) {
    setStatus("idle");
    return;
  }

  setStatus("connecting");

  try {
    const ticket = await fetchRealtimeTicket(auth);
    const url = new URL(ticket.url);
    url.searchParams.set("ticket", ticket.ticket);

    socket = new WebSocket(url.toString());
    socket.addEventListener("open", () => {
      reconnectAttempt = 0;
      setStatus("open");
    });
    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as RealtimeEvent;
        eventListeners.forEach((listener) => listener(payload));
      } catch {
        // Ignore malformed frames.
      }
    });
    socket.addEventListener("close", () => {
      socket = null;
      if (!active || !hasSubscribers()) {
        setStatus("idle");
        return;
      }
      setStatus("closed");
      scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      socket?.close();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Realtime connection failed.";
    if (message.toLowerCase() === "unauthorized") {
      active = false;
      setStatus("unauthorized");
      return;
    }
    setStatus("closed");
    scheduleReconnect();
  }
};

export const startRealtime = (getAuth: () => AuthState) => {
  authProvider = getAuth;
  active = true;
  clearReconnectTimer();
};

export const stopRealtime = () => {
  active = false;
  reconnectAttempt = 0;
  clearReconnectTimer();
  setStatus("idle");
  closeSocket();
};

export const subscribeRealtime = (listener: EventListener) => {
  eventListeners.add(listener);
  if (active) {
    void connect();
  }
  return () => {
    eventListeners.delete(listener);
    if (!hasSubscribers()) {
      reconnectAttempt = 0;
      clearReconnectTimer();
      setStatus("idle");
      closeSocket();
    }
  };
};

export const subscribeRealtimeStatus = (listener: StatusListener) => {
  statusListeners.add(listener);
  listener(status);
  if (active) {
    void connect();
  }
  return () => {
    statusListeners.delete(listener);
    if (!hasSubscribers()) {
      reconnectAttempt = 0;
      clearReconnectTimer();
      setStatus("idle");
      closeSocket();
    }
  };
};
