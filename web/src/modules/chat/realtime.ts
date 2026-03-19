import {
  subscribeRealtime,
  subscribeRealtimeStatus,
  type RealtimeEvent,
  type RealtimeStatus,
} from "../../features/realtime/client";

type ChatRealtimeBindings = {
  onEvent: (event: RealtimeEvent) => void;
  onStatus: (status: RealtimeStatus) => void;
};

export const createChatRealtimeBindings = (bindings: ChatRealtimeBindings) => {
  let disposeRealtime: (() => void) | null = null;
  let disposeRealtimeStatus: (() => void) | null = null;

  const stop = () => {
    disposeRealtime?.();
    disposeRealtimeStatus?.();
    disposeRealtime = null;
    disposeRealtimeStatus = null;
  };

  const sync = (active: boolean) => {
    if (!active) {
      stop();
      return;
    }
    if (disposeRealtime === null) {
      disposeRealtime = subscribeRealtime(bindings.onEvent);
    }
    if (disposeRealtimeStatus === null) {
      disposeRealtimeStatus = subscribeRealtimeStatus(bindings.onStatus);
    }
  };

  return { sync, stop };
};
