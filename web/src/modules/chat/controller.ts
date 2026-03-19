import type { ChatConversationSummary, RemoteDocument } from "../../api";
import {
  appendConversationMessage,
  conversationHasPendingResponse,
  markConversationPending,
} from "../../features/chat/conversation";
import { getConversationProgress, type ConversationProgress } from "../../features/chat/progress";
import { createProcessingStatus } from "../../features/chat/processing";
import { registerModuleChatCleanup } from "../../features/chat/runtime";
import {
  type RealtimeEvent,
  type RealtimeStatus,
} from "../../features/realtime/client";
import { adminText } from "../../app/translations";
import { isRecord } from "../../utils";
import type { ModuleRenderContext } from "../types";
import { ensureDataObject, isMessageSelected, toggleOutputMessage } from "./data";
import { bindChatDomEvents } from "./events";
import { mergeFailureFeedback, mergeFailureStatus, mergeSuccessStatus } from "./feedback";
import { describeMergePath, mergeAssistantJson } from "./merge";
import type { ChatDom } from "./layout";
import { createChatMessagePanel } from "./message-panel";
import { createChatRealtimeBindings } from "./realtime";
import {
  copyMessageToClipboard,
  createConversation,
  latestConversationId,
  listConversations,
  loadConversation as loadRemoteConversation,
  removeConversation,
  sendConversationMessage,
} from "./service";
import {
  updateChatInputState,
  updateConversationHeader,
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
  enableDataActions: boolean;
  autoLoadLatestConversation?: boolean;
};

export const mountChatController = (runtime: ChatRuntime) => {
  let conversations: ChatConversationSummary[] = [];
  let currentConversation: RemoteDocument | null = null;
  let pendingNew = false;
  let attemptedInitialAutoLoad = false;
  const realtime = createChatRealtimeBindings({
    onEvent: (event) => handleRealtimeEvent(event),
    onStatus: (status) => handleRealtimeStatus(status),
  });

  const setStatus = (message: string) => {
    runtime.dom.status.textContent = message;
  };

  const processingStatus = createProcessingStatus(setStatus);

  const authContext = () => {
    if (!runtime.auth) {
      setStatus(adminText("auth.loginRequired", "Login required."));
      return null;
    }
    return {
      auth: runtime.auth,
      moduleName: runtime.moduleName,
      settingsKey: runtime.settingsKey,
    };
  };

  const isNearBottom = () =>
    runtime.dom.scroll.scrollHeight - runtime.dom.scroll.scrollTop - runtime.dom.scroll.clientHeight <= 48;

  const scrollToBottom = () => {
    runtime.dom.scroll.scrollTop = runtime.dom.scroll.scrollHeight;
  };

  const clearStatusLater = (delay = 1200) => {
    window.setTimeout(() => {
      if (!conversationHasPendingResponse(currentConversation)) {
        setStatus("");
      }
    }, delay);
  };

  const updateJumpVisibility = () => {
    runtime.dom.jump.classList.toggle("is-visible", pendingNew);
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
          agentName: runtime.agentName,
          conversationId: conversation?.id ?? null,
          pending,
          progress,
        },
      })
    );
  };

  const messagePanel = createChatMessagePanel({
    container: runtime.dom.messages,
    assistantLabel: runtime.agentName,
    enableDataActions: runtime.enableDataActions,
    getConversation: () => currentConversation,
    isSelected: (message) => isMessageSelected(runtime, runtime.targetKey, message),
    onToggle: (message, selected) => {
      toggleOutputMessage(
        {
          payload: runtime.payload,
          editor: runtime.editor,
          targetKey: runtime.targetKey,
          conversation: currentConversation,
          agentName: runtime.agentName,
        },
        message,
        selected
      );
      messagePanel.render();
    },
    onMerge: (message) => void mergeMessage(message),
    onCopy: (message) => void copyMessage(message),
    progress: (conversation) => getConversationProgress(conversation),
  });

  const syncConversation = (conversation: RemoteDocument | null, forceScroll = false) => {
    if (conversation) {
      messagePanel.prepareConversation(conversation);
    }

    currentConversation = conversation;
    updateConversationHeader(runtime.dom.title, runtime.dom.meta, conversation);
    messagePanel.render();

    const pending = conversationHasPendingResponse(conversation);
    emitProgress(conversation, pending, getConversationProgress(conversation));
    updateChatInputState(runtime.dom.input, runtime.dom.send, !!conversation && !pending);

    runtime.dom.select.value = conversation?.id ?? "";
    if (runtime.dom.remove) {
      runtime.dom.remove.disabled = !conversation;
    }

    if (forceScroll || isNearBottom()) {
      scrollToBottom();
      pendingNew = false;
    }
    updateJumpVisibility();

    if (pending) {
      processingStatus.start(getConversationProgress(conversation)?.status ?? "");
      realtime.sync(true);
      return;
    }

    processingStatus.stop();
    realtime.sync(!!currentConversation);
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
    const service = authContext();
    if (!service) {
      return;
    }

    try {
      conversations = await listConversations(service);
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
    const service = authContext();
    if (!service) {
      return;
    }

    try {
      pendingNew = false;
      syncConversation(await loadRemoteConversation(service, conversationId), true);
      updateSelectOptions();
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const startConversation = async () => {
    const service = authContext();
    if (!service) {
      return;
    }

    try {
      pendingNew = false;
      syncConversation(await createConversation(service), true);
      await refreshList();
      setStatus("");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const sendMessage = async (content: string) => {
    const service = authContext();
    if (!service || !currentConversation || conversationHasPendingResponse(currentConversation)) {
      return;
    }

    appendConversationMessage(currentConversation, "user", content);
    syncConversation(currentConversation, true);

    try {
      pendingNew = false;
      syncConversation(await sendConversationMessage(service, currentConversation.id, content), true);
      await refreshList();
    } catch (error) {
      if (!currentConversation) {
        return;
      }
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
  };

  const copyMessage = async (message: { content: string }) => {
    try {
      await copyMessageToClipboard(message.content);
      setStatus(adminText("common.copied", "Copied."));
      clearStatusLater();
    } catch {
      setStatus(adminText("common.copyFailed", "Copy failed."));
    }
  };

  const mergeMessage = async (message: { content: string }) => {
    const data = ensureDataObject(runtime);
    const result = mergeAssistantJson(data, message.content, runtime.targetKey);

    if (!result.ok) {
      setStatus(mergeFailureStatus(result.code));
      const service = authContext();
      if (!service || !currentConversation || conversationHasPendingResponse(currentConversation)) {
        return;
      }
      try {
        pendingNew = false;
        syncConversation(
          await sendConversationMessage(service, currentConversation.id, mergeFailureFeedback(result.code)),
          true
        );
        await refreshList();
      } catch (error) {
        setStatus((error as Error).message);
      }
      return;
    }

    runtime.payload.data = result.data;
    runtime.editor?.setValue(result.data);
    setStatus(mergeSuccessStatus(describeMergePath(result.path)));
    clearStatusLater();
  };

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    if (event.type !== "chat.conversation.updated") {
      return;
    }

    const data = isRecord(event.conversation.payload.data) ? event.conversation.payload.data : {};
    if (data.moduleKey !== runtime.settingsKey) {
      return;
    }

    if (currentConversation?.id === event.conversation.id) {
      pendingNew = !isNearBottom();
      syncConversation(event.conversation, !pendingNew);
    }

    void refreshList();
  };

  const handleRealtimeStatus = (status: RealtimeStatus) => {
    if (status !== "open") {
      return;
    }
    void refreshList();
    if (currentConversation) {
      void loadConversation(currentConversation.id);
    }
  };

  const unbindEvents = bindChatDomEvents({
    dom: runtime.dom,
    onCreate: () => void startConversation(),
    onRemove: () => {
      const service = authContext();
      if (!service || !currentConversation) {
        return;
      }
      setStatus(adminText("chat.deletingConversation", "Deleting conversation..."));
      void removeConversation(service, currentConversation.id)
        .then(async () => {
          syncConversation(null, true);
          await refreshList();
          setStatus("");
        })
        .catch((error) => {
          setStatus((error as Error).message);
        });
    },
    onSelect: (conversationId) => void loadConversation(conversationId),
    onClearSelection: () => {
      pendingNew = false;
      syncConversation(null, true);
      setStatus("");
    },
    onReachedBottom: () => {
      if (!isNearBottom()) {
        return;
      }
      pendingNew = false;
      updateJumpVisibility();
    },
    onJump: () => {
      scrollToBottom();
      pendingNew = false;
      updateJumpVisibility();
    },
    onSend: (content) => void sendMessage(content),
  });

  registerModuleChatCleanup(() => {
    unbindEvents();
    realtime.stop();
    processingStatus.stop();
  });

  updateChatInputState(runtime.dom.input, runtime.dom.send, false);
  messagePanel.render();
  void refreshList();
};
