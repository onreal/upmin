import {
  appendAgentMessage,
  createAgentConversation,
  fetchAgentConversation,
  fetchAgentConversations,
  updateAgent,
  type AgentConversationSummary,
  type AuthState,
  type RemoteDocument,
} from "../../api";
import { state } from "../../app/state";
import {
  appendConversationMessage,
  conversationHasPendingResponse,
  markConversationPending,
} from "../chat/conversation";
import { getConversationProgress } from "../chat/progress";
import { createProcessingStatus } from "../chat/processing";
import { registerAgentChatCleanup } from "../chat/runtime";
import { setupProviderModelControls } from "../integrations/helpers";
import {
  subscribeRealtime,
  subscribeRealtimeStatus,
  type RealtimeEvent,
  type RealtimeStatus,
} from "../realtime/client";
import { pushNotice } from "../../ui/notice";
import { isRecord } from "../../utils";
import { renderConversationList, renderMessages, updateChatInputState, updateConversationHeader } from "./chat";
import { renderAgentLayout } from "./layout";
import { clearAgentState } from "./state";
import { getAgentField } from "./utils";
import { adminText } from "../../app/translations";

export type AgentViewContext = {
  auth: AuthState | null;
  agentDoc: RemoteDocument;
  reloadAgents: () => Promise<void>;
};

export const refreshAgentEditControls = () => {
  if (!state.currentAgent) {
    return;
  }

  const providerSelect = document.getElementById("agent-edit-provider") as HTMLSelectElement | null;
  const modelSelect = document.getElementById("agent-edit-model") as HTMLSelectElement | null;
  const modelSearch = document.getElementById("agent-edit-model-search") as HTMLInputElement | null;
  const providerHelp = document.getElementById("agent-edit-provider-help");
  if (!providerSelect || !modelSelect) {
    return;
  }

  const data = isRecord(state.currentAgent.payload.data) ? state.currentAgent.payload.data : {};
  setupProviderModelControls(
    providerSelect,
    modelSelect,
    modelSearch,
    providerHelp,
    state.integrations,
    state.integrationSettings,
    getAgentField(data, "provider"),
    getAgentField(data, "model"),
    true
  );
};

export const renderAgentView = async ({ auth, agentDoc, reloadAgents }: AgentViewContext) => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  clearAgentState();
  state.currentAgent = agentDoc;
  state.currentConversation = null;

  const data = isRecord(agentDoc.payload.data) ? agentDoc.payload.data : {};
  content.innerHTML = renderAgentLayout(
    agentDoc,
    getAgentField(data, "systemPrompt"),
    getAgentField(data, "adminPrompt")
  );

  const providerSelect = document.getElementById("agent-edit-provider") as HTMLSelectElement | null;
  const modelSelect = document.getElementById("agent-edit-model") as HTMLSelectElement | null;
  const modelSearch = document.getElementById("agent-edit-model-search") as HTMLInputElement | null;
  const providerHelp = document.getElementById("agent-edit-provider-help");
  const saveButton = document.getElementById("agent-save") as HTMLButtonElement | null;
  const chatMeta = document.getElementById("agent-chat-meta");
  const chatForm = document.getElementById("agent-chat-form") as HTMLFormElement | null;
  const chatInput = document.getElementById("agent-chat-text") as HTMLTextAreaElement | null;
  const chatStatus = document.getElementById("agent-chat-status");

  if (providerSelect && modelSelect) {
    setupProviderModelControls(
      providerSelect,
      modelSelect,
      modelSearch,
      providerHelp,
      state.integrations,
      state.integrationSettings,
      getAgentField(data, "provider"),
      getAgentField(data, "model"),
      true
    );

    const syncSaveState = () => {
      if (saveButton) {
        saveButton.disabled = providerSelect.disabled || modelSelect.disabled;
      }
    };

    syncSaveState();
    providerSelect.addEventListener("change", syncSaveState);
    modelSelect.addEventListener("change", syncSaveState);
  }

  const setStatus = (message: string) => {
    if (chatStatus) {
      chatStatus.textContent = message;
    }
  };

  const processingStatus = createProcessingStatus(setStatus);
  let conversations: AgentConversationSummary[] = [];
  let disposeRealtime: (() => void) | null = null;
  let disposeRealtimeStatus: (() => void) | null = null;

  const stopRealtimeBindings = () => {
    disposeRealtime?.();
    disposeRealtimeStatus?.();
    disposeRealtime = null;
    disposeRealtimeStatus = null;
  };

  const renderConversations = () => {
    renderConversationList(conversations, state.currentConversation?.id ?? null, (id) => {
      void loadConversation(id);
    });
  };

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    if (event.type !== "agent.conversation.updated") {
      return;
    }

    const payloadData = isRecord(event.conversation.payload.data) ? event.conversation.payload.data : {};
    const eventAgentId = typeof payloadData.agentId === "string" ? payloadData.agentId : "";
    const agentUid = typeof agentDoc.payload.id === "string" ? agentDoc.payload.id : "";
    if (!eventAgentId || eventAgentId !== agentUid) {
      return;
    }

    if (state.currentConversation && state.currentConversation.id === event.conversation.id) {
      syncConversation(event.conversation);
    }

    void refreshConversations();
  };

  const handleRealtimeStatus = (status: RealtimeStatus) => {
    if (status === "open" && state.currentConversation) {
      void refreshConversations();
      void loadConversation(state.currentConversation.id);
    }
  };

  const syncRealtimeBindings = () => {
    if (!state.currentConversation) {
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

  const syncConversation = (conversation: RemoteDocument | null) => {
    state.currentConversation = conversation;
    updateConversationHeader(conversation);
    renderMessages(conversation);
    renderConversations();

    const pending = conversationHasPendingResponse(conversation);
    const progress = getConversationProgress(conversation);
    updateChatInputState(!!auth && !!state.currentAgent && !pending);

    if (!conversation && chatMeta) {
      chatMeta.textContent = adminText("agents.nextMessageStartsConversation", "Your next message starts a new conversation.");
    }

    if (pending) {
      processingStatus.start(progress?.status ?? "");
      syncRealtimeBindings();
      return;
    }

    processingStatus.stop();
    syncRealtimeBindings();
  };

  const refreshConversations = async () => {
    if (!auth) {
      return;
    }

    try {
      const response = await fetchAgentConversations(auth, agentDoc.id);
      conversations = Array.isArray(response.conversations)
        ? (response.conversations as AgentConversationSummary[])
        : [];
      renderConversations();
    } catch (err) {
      pushNotice("error", (err as Error).message);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!auth) {
      return;
    }

    try {
      const conversation = await fetchAgentConversation(auth, conversationId);
      syncConversation(conversation);
    } catch (err) {
      pushNotice("error", (err as Error).message);
    }
  };

  const ensureConversation = async () => {
    if (!auth || !state.currentAgent) {
      return null;
    }
    if (state.currentConversation) {
      return state.currentConversation;
    }

    const created = await createAgentConversation(auth, state.currentAgent.id);
    syncConversation(created);
    await refreshConversations();
    return created;
  };

  const appendLocalMessage = (role: "user" | "assistant", content: string) => {
    if (!state.currentConversation) {
      return;
    }
    appendConversationMessage(state.currentConversation, role, content);
    syncConversation(state.currentConversation);
  };

  document.getElementById("agent-save")?.addEventListener("click", async () => {
    if (!auth || !state.currentAgent) {
      return;
    }

    const nameValue = (document.getElementById("agent-edit-name") as HTMLInputElement | null)?.value.trim() || "";
    const providerValue = providerSelect?.value.trim() || "";
    const modelValue = modelSelect?.value.trim() || "";
    const systemValue =
      (document.getElementById("agent-edit-system") as HTMLTextAreaElement | null)?.value.trim() || "";
    const adminValue =
      (document.getElementById("agent-edit-admin") as HTMLTextAreaElement | null)?.value.trim() || "";

    if (!nameValue || !providerValue || !modelValue || !systemValue || !adminValue) {
      pushNotice("error", adminText("agents.allFieldsRequired", "All agent fields are required."));
      return;
    }
    if (providerSelect?.disabled || modelSelect?.disabled) {
      pushNotice("error", adminText("agents.enableIntegrationFirst", "Enable an integration and sync models first."));
      return;
    }

    try {
      const updated = await updateAgent(auth, state.currentAgent.id, {
        name: nameValue,
        provider: providerValue,
        model: modelValue,
        systemPrompt: systemValue,
        adminPrompt: adminValue,
      });
      state.currentAgent = updated;
      await reloadAgents();
      await renderAgentView({ auth, agentDoc: updated, reloadAgents });
    } catch {
      // API notifications already cover save failures here.
    }
  });

  document.getElementById("agent-new-conversation")?.addEventListener("click", async () => {
    if (!auth || !state.currentAgent) {
      return;
    }

    try {
      const created = await createAgentConversation(auth, state.currentAgent.id);
      syncConversation(created);
      await refreshConversations();
    } catch (err) {
      pushNotice("error", (err as Error).message);
    }
  });

  chatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth || conversationHasPendingResponse(state.currentConversation)) {
      return;
    }

    const content = chatInput?.value.trim() || "";
    if (!content) {
      return;
    }

    const conversation = await ensureConversation().catch((err: Error) => {
      pushNotice("error", err.message);
      return null;
    });
    if (!conversation) {
      return;
    }

    if (chatInput) {
      chatInput.value = "";
    }

    appendLocalMessage("user", content);

    try {
      const updated = await appendAgentMessage(auth, conversation.id, content);
      syncConversation(updated);
      await refreshConversations();
    } catch (err) {
      if (state.currentConversation) {
        markConversationPending(state.currentConversation, false);
        appendLocalMessage(
          "assistant",
          adminText("agents.replyFailed", "Something went wrong while I was replying: {message}", {
            message: (err as Error).message || adminText("common.tryAgain", "Please try again."),
          })
        );
      }
    }
  });

  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm?.requestSubmit();
    }
  });

  registerAgentChatCleanup(() => {
    stopRealtimeBindings();
    processingStatus.stop();
  });

  syncConversation(null);
  await refreshConversations();
};
