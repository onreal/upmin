import type { ChatConversationSummary, RemoteDocument } from "../../api";
import {
  appendChatMessage,
  deleteChatConversation,
  fetchChatConversation,
  fetchChatConversations,
  startChatConversation,
} from "../../api";
import {
  appendConversationMessage,
  conversationHasPendingResponse,
  markConversationPending,
} from "../../features/chat/conversation";
import { getConversationProgress } from "../../features/chat/progress";
import { createProcessingStatus } from "../../features/chat/processing";
import { registerModuleChatCleanup } from "../../features/chat/runtime";
import {
  subscribeRealtime,
  subscribeRealtimeStatus,
  type RealtimeEvent,
  type RealtimeStatus,
} from "../../features/realtime/client";
import { isRecord } from "../../utils";
import type { ModuleRenderContext } from "../types";
import type { ChatDom } from "./layout";
import {
  extractMessages,
  renderMessages,
  updateChatInputState,
  updateConversationHeader,
  type ChatMessage,
} from "./utils";

type ChatRuntime = {
  moduleName: string;
  settingsKey: string;
  agentName: string;
  auth: ModuleRenderContext["auth"];
  payload: ModuleRenderContext["payload"];
  editor: ModuleRenderContext["editor"];
  dom: ChatDom;
  targetKey: string;
};

export const mountChatController = (runtime: ChatRuntime) => {
  let conversations: ChatConversationSummary[] = [];
  let currentConversation: RemoteDocument | null = null;
  let pendingNew = false;
  let disposeRealtime: (() => void) | null = null;
  let disposeRealtimeStatus: (() => void) | null = null;

  const ensureDataObject = () => {
    if (isRecord(runtime.payload.data)) {
      return runtime.payload.data as Record<string, unknown>;
    }
    runtime.payload.data = {};
    runtime.editor?.setValue(runtime.payload.data);
    return runtime.payload.data as Record<string, unknown>;
  };

  const ensureOutputList = () => {
    const data = ensureDataObject();
    const existing = data[runtime.targetKey];
    if (!Array.isArray(existing)) {
      data[runtime.targetKey] = [];
      return data[runtime.targetKey] as Array<Record<string, unknown>>;
    }
    return existing as Array<Record<string, unknown>>;
  };

  const isMessageSelected = (message: ChatMessage) => {
    const data = ensureDataObject();
    const list = Array.isArray(data[runtime.targetKey])
      ? (data[runtime.targetKey] as Array<Record<string, unknown>>)
      : [];
    return list.some((entry) => isRecord(entry) && entry.id === message.id);
  };

  const renderCurrentMessages = () => {
    const emptyState = currentConversation ? "No messages yet." : "Select or create a conversation.";
    renderMessages(runtime.dom.messages, extractMessages(currentConversation), {
      enableActions: true,
      progress: getConversationProgress(currentConversation),
      isSelected: (message) => isMessageSelected(message),
      onToggle: (message, selected) => {
        const data = ensureDataObject();
        const list = ensureOutputList();
        if (selected) {
          data[runtime.targetKey] = list.filter((entry) => !(isRecord(entry) && entry.id === message.id));
        } else if (currentConversation) {
          list.push({
            id: message.id,
            conversationId: currentConversation.id,
            agent: runtime.agentName,
            content: message.content,
            createdAt: message.createdAt ?? null,
            role: message.role,
          });
        }
        runtime.editor?.setValue(data);
        renderCurrentMessages();
      },
      onCopy: (message) => void copyMessage(message),
      emptyState,
    });
  };

  const setStatus = (message: string) => {
    runtime.dom.status.textContent = message;
  };

  const processingStatus = createProcessingStatus(setStatus);

  const isNearBottom = () =>
    runtime.dom.scroll.scrollHeight - runtime.dom.scroll.scrollTop - runtime.dom.scroll.clientHeight <= 48;

  const scrollToBottom = () => {
    runtime.dom.scroll.scrollTop = runtime.dom.scroll.scrollHeight;
  };

  const updateJumpVisibility = () => {
    runtime.dom.jump.classList.toggle("is-visible", pendingNew);
  };

  const stopRealtimeBindings = () => {
    disposeRealtime?.();
    disposeRealtimeStatus?.();
    disposeRealtime = null;
    disposeRealtimeStatus = null;
  };

  const syncConversation = (conversation: RemoteDocument | null, forceScroll = false) => {
    currentConversation = conversation;
    updateConversationHeader(runtime.dom.title, runtime.dom.meta, conversation);
    const shouldScroll = forceScroll || isNearBottom();
    renderCurrentMessages();
    const pending = conversationHasPendingResponse(conversation);
    const progress = getConversationProgress(conversation);
    updateChatInputState(runtime.dom.input, runtime.dom.send, !!conversation && !pending);

    if (conversation) {
      runtime.dom.select.value = conversation.id;
      if (runtime.dom.remove) {
        runtime.dom.remove.disabled = false;
      }
    } else {
      runtime.dom.select.value = "";
      if (runtime.dom.remove) {
        runtime.dom.remove.disabled = true;
      }
    }

    if (shouldScroll) {
      scrollToBottom();
      pendingNew = false;
    }
    updateJumpVisibility();

    if (pending) {
      processingStatus.start(progress?.status ?? "");
      syncRealtimeBindings();
      return;
    }
    processingStatus.stop();
    syncRealtimeBindings();
  };

  const updateSelectOptions = () => {
    runtime.dom.select.innerHTML =
      `<option value="">Select chat</option>` +
      conversations.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    if (currentConversation) {
      runtime.dom.select.value = currentConversation.id;
    }
  };

  const refreshList = async () => {
    if (!runtime.auth) {
      setStatus("Login required.");
      return;
    }

    try {
      const response = await fetchChatConversations(runtime.auth, runtime.moduleName, {
        settings: runtime.settingsKey,
      });
      conversations = Array.isArray(response.items) ? response.items : [];
      updateSelectOptions();
      if (!conversationHasPendingResponse(currentConversation)) {
        setStatus("");
      }
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!runtime.auth) {
      setStatus("Login required.");
      return;
    }

    try {
      const conversation = await fetchChatConversation(runtime.auth, runtime.moduleName, {
        id: conversationId,
        settings: runtime.settingsKey,
      });
      pendingNew = false;
      syncConversation(conversation, true);
      updateSelectOptions();
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const startConversation = async () => {
    if (!runtime.auth) {
      setStatus("Login required.");
      return;
    }

    try {
      const conversation = await startChatConversation(runtime.auth, runtime.moduleName, {
        settings: runtime.settingsKey,
      });
      pendingNew = false;
      syncConversation(conversation, true);
      await refreshList();
      setStatus("");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const sendMessage = async (content: string) => {
    if (!runtime.auth || !currentConversation || conversationHasPendingResponse(currentConversation)) {
      return;
    }

    appendConversationMessage(currentConversation, "user", content);
    syncConversation(currentConversation, true);

    try {
      const updated = await appendChatMessage(runtime.auth, runtime.moduleName, {
        id: currentConversation.id,
        content,
        settings: runtime.settingsKey,
      });
      pendingNew = false;
      syncConversation(updated, true);
      await refreshList();
    } catch (error) {
      if (currentConversation) {
        markConversationPending(currentConversation, false);
        appendConversationMessage(
          currentConversation,
          "assistant",
          `Something went wrong while I was replying: ${(error as Error).message || "Please try again."}`
        );
        syncConversation(currentConversation, true);
      }
    }
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setStatus("Copied.");
      window.setTimeout(() => {
        if (!conversationHasPendingResponse(currentConversation)) {
          setStatus("");
        }
      }, 1200);
    } catch {
      setStatus("Copy failed.");
    }
  };

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    if (event.type !== "chat.conversation.updated") {
      return;
    }

    const data = isRecord(event.conversation.payload.data) ? event.conversation.payload.data : {};
    if (data.moduleKey !== runtime.settingsKey) {
      return;
    }

    if (currentConversation && currentConversation.id === event.conversation.id) {
      pendingNew = !isNearBottom();
      syncConversation(event.conversation, !pendingNew);
    }

    void refreshList();
  };

  const handleRealtimeStatus = (status: RealtimeStatus) => {
    if (status === "open") {
      void refreshList();
      if (currentConversation) {
        void loadConversation(currentConversation.id);
      }
    }
  };

  const syncRealtimeBindings = () => {
    if (!currentConversation) {
      stopRealtimeBindings();
      return;
    }

    if (disposeRealtime === null) {
      disposeRealtime = subscribeRealtime(handleRealtimeEvent);
    }
    if (disposeRealtimeStatus === null) {
      disposeRealtimeStatus = subscribeRealtimeStatus(handleRealtimeStatus);
    }
  };

  runtime.dom.create?.addEventListener("click", () => {
    void startConversation();
  });

  runtime.dom.remove?.addEventListener("click", () => {
    if (!runtime.auth || !currentConversation) {
      return;
    }

    const conversationId = currentConversation.id;
    setStatus("Deleting conversation...");
    void deleteChatConversation(runtime.auth, runtime.moduleName, {
      id: conversationId,
      settings: runtime.settingsKey,
    })
      .then(async () => {
        syncConversation(null, true);
        await refreshList();
        setStatus("");
      })
      .catch((error) => {
        setStatus((error as Error).message);
      });
  });

  runtime.dom.select.addEventListener("change", () => {
    const conversationId = runtime.dom.select.value.trim();
    if (conversationId !== "") {
      void loadConversation(conversationId);
      return;
    }

    pendingNew = false;
    syncConversation(null, true);
    setStatus("");
  });

  runtime.dom.scroll.addEventListener("scroll", () => {
    if (isNearBottom()) {
      pendingNew = false;
      updateJumpVisibility();
    }
  });

  runtime.dom.jump.addEventListener("click", () => {
    scrollToBottom();
    pendingNew = false;
    updateJumpVisibility();
  });

  runtime.dom.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const content = runtime.dom.input.value.trim();
    if (content === "") {
      return;
    }
    runtime.dom.input.value = "";
    void sendMessage(content);
  });

  runtime.dom.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      runtime.dom.form.requestSubmit();
    }
  });

  registerModuleChatCleanup(() => {
    stopRealtimeBindings();
    processingStatus.stop();
  });

  updateChatInputState(runtime.dom.input, runtime.dom.send, false);
  renderCurrentMessages();
  void refreshList();
};
