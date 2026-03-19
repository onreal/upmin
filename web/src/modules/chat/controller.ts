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
import { getConversationProgress, type ConversationProgress } from "../../features/chat/progress";
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
import { adminText } from "../../app/translations";

type ChatRuntime = {
  moduleName: string;
  settingsKey: string;
  agentName: string;
  auth: ModuleRenderContext["auth"];
  payload: ModuleRenderContext["payload"];
  editor: ModuleRenderContext["editor"];
  dom: ChatDom;
  targetKey: string;
  autoLoadLatestConversation?: boolean;
};

export const mountChatController = (runtime: ChatRuntime) => {
  let conversations: ChatConversationSummary[] = [];
  let currentConversation: RemoteDocument | null = null;
  let pendingNew = false;
  let attemptedInitialAutoLoad = false;
  const foldedByConversation = new Map<string, Set<string>>();
  let disposeRealtime: (() => void) | null = null;
  let disposeRealtimeStatus: (() => void) | null = null;

  const latestConversationId = (items: ChatConversationSummary[]) => {
    if (!items.length) {
      return null;
    }

    const timestamp = (item: ChatConversationSummary) => {
      const raw = item.updatedAt || item.createdAt || "";
      const value = Date.parse(raw);
      return Number.isNaN(value) ? 0 : value;
    };

    return [...items]
      .sort((a, b) => {
        const diff = timestamp(b) - timestamp(a);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      })[0]?.id ?? null;
  };

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

  const ensureFoldState = (conversation: RemoteDocument | null) => {
    if (!conversation || foldedByConversation.has(conversation.id)) {
      return;
    }

    const messages = extractMessages(conversation);
    const assistantMessages = messages.filter((message) => message.role === "assistant");
    const lastAssistantId = assistantMessages.length ? assistantMessages[assistantMessages.length - 1]?.id : null;
    const folded = new Set<string>();

    assistantMessages.forEach((message) => {
      if (message.id !== lastAssistantId) {
        folded.add(message.id);
      }
    });

    foldedByConversation.set(conversation.id, folded);
  };

  const isMessageFolded = (message: ChatMessage) => {
    if (!currentConversation || message.role !== "assistant") {
      return false;
    }
    return foldedByConversation.get(currentConversation.id)?.has(message.id) ?? false;
  };

  const toggleMessageFold = (message: ChatMessage) => {
    if (!currentConversation || message.role !== "assistant") {
      return;
    }
    ensureFoldState(currentConversation);
    const folded = foldedByConversation.get(currentConversation.id);
    if (!folded) {
      return;
    }
    if (folded.has(message.id)) {
      folded.delete(message.id);
    } else {
      folded.add(message.id);
    }
    renderCurrentMessages();
  };

  const renderCurrentMessages = () => {
    const emptyState = currentConversation
      ? adminText("chat.noMessages", "No messages yet.")
      : adminText("chat.selectOrCreate", "Select or create a conversation.");
    ensureFoldState(currentConversation);
    renderMessages(runtime.dom.messages, extractMessages(currentConversation), {
      enableActions: true,
      progress: getConversationProgress(currentConversation),
      isSelected: (message) => isMessageSelected(message),
      isFolded: (message) => isMessageFolded(message),
      onToggleFold: (message) => toggleMessageFold(message),
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

  const emitProgress = (
    conversation: RemoteDocument | null,
    pending: boolean,
    progress: ConversationProgress | null
  ) => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("app:chat-progress", {
        detail: {
          moduleName: runtime.moduleName,
          settingsKey: runtime.settingsKey,
          conversationId: conversation?.id ?? null,
          pending,
          progress,
        },
      })
    );
  };

  const syncConversation = (conversation: RemoteDocument | null, forceScroll = false) => {
    if (conversation) {
      ensureFoldState(conversation);
      const messages = extractMessages(conversation);
      const assistantMessages = messages.filter((message) => message.role === "assistant");
      const latestAssistant = assistantMessages[assistantMessages.length - 1];
      if (latestAssistant) {
        foldedByConversation.get(conversation.id)?.delete(latestAssistant.id);
      }
    }
    currentConversation = conversation;
    updateConversationHeader(runtime.dom.title, runtime.dom.meta, conversation);
    const shouldScroll = forceScroll || isNearBottom();
    renderCurrentMessages();
    const pending = conversationHasPendingResponse(conversation);
    const progress = getConversationProgress(conversation);
    emitProgress(conversation, pending, progress);
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
      `<option value="">${adminText("chat.selectConversation", "Select chat")}</option>` +
      conversations.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    if (currentConversation) {
      runtime.dom.select.value = currentConversation.id;
    }
  };

  const refreshList = async () => {
    if (!runtime.auth) {
      setStatus(adminText("auth.loginRequired", "Login required."));
      return;
    }

    try {
      const response = await fetchChatConversations(runtime.auth, runtime.moduleName, {
        settings: runtime.settingsKey,
      });
      conversations = Array.isArray(response.items) ? response.items : [];
      updateSelectOptions();
      if (runtime.autoLoadLatestConversation && !currentConversation && !attemptedInitialAutoLoad) {
        attemptedInitialAutoLoad = true;
        const conversationId = latestConversationId(conversations);
        if (conversationId) {
          await loadConversation(conversationId);
          return;
        }
      }
      if (!conversationHasPendingResponse(currentConversation)) {
        setStatus("");
      }
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!runtime.auth) {
      setStatus(adminText("auth.loginRequired", "Login required."));
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
      setStatus(adminText("auth.loginRequired", "Login required."));
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
          adminText("agents.replyFailed", "Something went wrong while I was replying: {message}", {
            message: (error as Error).message || adminText("common.tryAgain", "Please try again."),
          })
        );
        syncConversation(currentConversation, true);
      }
    }
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setStatus(adminText("common.copied", "Copied."));
      window.setTimeout(() => {
        if (!conversationHasPendingResponse(currentConversation)) {
          setStatus("");
        }
      }, 1200);
    } catch {
      setStatus(adminText("common.copyFailed", "Copy failed."));
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
