import { appendAgentMessage, createAgentConversation, fetchAgentConversation, fetchAgentConversations, updateAgent, } from "../../api";
import { state } from "../../app/state";
import { setupProviderModelControls } from "../integrations/helpers";
import { isRecord } from "../../utils";
import { renderConversationList, renderMessages, updateChatInputState, updateConversationHeader } from "./chat";
import { getAgentField } from "./utils";
import { stopAgentPolling } from "./state";
export const refreshAgentEditControls = () => {
    if (!state.currentAgent) {
        return;
    }
    const providerSelect = document.getElementById("agent-edit-provider");
    const modelSelect = document.getElementById("agent-edit-model");
    const modelSearch = document.getElementById("agent-edit-model-search");
    const providerHelp = document.getElementById("agent-edit-provider-help");
    if (!providerSelect || !modelSelect) {
        return;
    }
    const data = isRecord(state.currentAgent.payload.data) ? state.currentAgent.payload.data : {};
    const provider = getAgentField(data, "provider");
    const model = getAgentField(data, "model");
    setupProviderModelControls(providerSelect, modelSelect, modelSearch, providerHelp, state.integrations, state.integrationSettings, provider, model, true);
};
export const renderAgentView = async ({ auth, agentDoc, reloadAgents }) => {
    const content = document.getElementById("content");
    if (!content) {
        return;
    }
    stopAgentPolling();
    state.currentAgent = agentDoc;
    state.currentConversation = null;
    const data = isRecord(agentDoc.payload.data) ? agentDoc.payload.data : {};
    const provider = getAgentField(data, "provider");
    const model = getAgentField(data, "model");
    const systemPrompt = getAgentField(data, "systemPrompt");
    const adminPrompt = getAgentField(data, "adminPrompt");
    content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${agentDoc.payload.name}</h1>
      <p class="app-muted">Agent · ${agentDoc.store}/${agentDoc.path}</p>
    </div>
    <div class="columns is-variable is-4">
      <div class="column is-one-third">
        <div class="app-panel">
          <div class="mb-3">
            <h2 class="title is-6">Settings</h2>
            <p class="app-muted">Provider, model, and prompts.</p>
          </div>
          <div class="field">
            <label class="label">Name</label>
            <div class="control">
              <input id="agent-edit-name" class="input" type="text" value="${agentDoc.payload.name}" />
            </div>
          </div>
          <div class="field">
            <label class="label">Provider</label>
            <div class="control">
              <div class="select is-fullwidth">
                <select id="agent-edit-provider"></select>
              </div>
            </div>
            <p id="agent-edit-provider-help" class="help app-muted"></p>
          </div>
          <div class="field">
            <label class="label">Model</label>
            <div class="control">
              <input
                id="agent-edit-model-search"
                class="input"
                type="search"
                placeholder="Search models"
                autocomplete="off"
              />
            </div>
            <div class="control mt-2">
              <div class="select is-fullwidth">
                <select id="agent-edit-model"></select>
              </div>
            </div>
          </div>
          <div class="field">
            <label class="label">System prompt</label>
            <div class="control">
              <textarea id="agent-edit-system" class="textarea" rows="3">${systemPrompt}</textarea>
            </div>
          </div>
          <div class="field">
            <label class="label">Admin prompt</label>
            <div class="control">
              <textarea id="agent-edit-admin" class="textarea" rows="3">${adminPrompt}</textarea>
            </div>
          </div>
          <div class="buttons">
            <button id="agent-save" class="button app-button app-primary">Save</button>
          </div>
        </div>
        <div class="app-panel mt-4">
          <div class="app-panel-header">
            <div>
              <h2 class="title is-6 mb-1">Conversations</h2>
              <p class="app-muted">Reuse context or start fresh.</p>
            </div>
            <button id="agent-new-conversation" class="button app-button app-ghost">New</button>
          </div>
          <div id="agent-conversation-list" class="app-conversation-list"></div>
        </div>
      </div>
      <div class="column">
        <div class="app-panel app-chat">
          <div class="app-chat-header">
            <div>
              <div id="agent-chat-title" class="app-chat-title">No conversation selected</div>
              <div id="agent-chat-meta" class="app-chat-meta app-muted">Select or create a conversation.</div>
            </div>
          </div>
          <div id="agent-chat-messages" class="app-chat-messages"></div>
          <div class="app-chat-input">
            <form id="agent-chat-form">
              <div class="field">
                <div class="control">
                  <textarea id="agent-chat-text" class="textarea" rows="2" placeholder="Write a message" disabled></textarea>
                </div>
              </div>
              <div class="buttons">
                <button id="agent-chat-send" class="button app-button app-primary" disabled>Send</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
    const editProviderSelect = document.getElementById("agent-edit-provider");
    const editModelSelect = document.getElementById("agent-edit-model");
    const editModelSearch = document.getElementById("agent-edit-model-search");
    const editProviderHelp = document.getElementById("agent-edit-provider-help");
    const agentSaveButton = document.getElementById("agent-save");
    if (editProviderSelect && editModelSelect) {
        setupProviderModelControls(editProviderSelect, editModelSelect, editModelSearch, editProviderHelp, state.integrations, state.integrationSettings, provider, model, true);
        if (agentSaveButton) {
            agentSaveButton.disabled = editProviderSelect.disabled || editModelSelect.disabled;
        }
        const updateSaveState = () => {
            if (agentSaveButton) {
                agentSaveButton.disabled = editProviderSelect.disabled || editModelSelect.disabled;
            }
        };
        editProviderSelect.addEventListener("change", updateSaveState);
        editModelSelect.addEventListener("change", updateSaveState);
    }
    const loadConversation = async (conversationId) => {
        if (!auth) {
            return;
        }
        try {
            const conversation = await fetchAgentConversation(auth, conversationId);
            state.currentConversation = conversation;
            updateConversationHeader(conversation);
            renderMessages(conversation);
            updateChatInputState(true);
            stopAgentPolling();
            state.agentPoller = window.setInterval(async () => {
                if (!auth || !state.currentConversation || state.currentConversation.id !== conversationId) {
                    return;
                }
                try {
                    const updated = await fetchAgentConversation(auth, conversationId);
                    const previous = state.currentConversation;
                    state.currentConversation = updated;
                    const prevData = isRecord(previous.payload.data) ? previous.payload.data : {};
                    const nextData = isRecord(updated.payload.data) ? updated.payload.data : {};
                    const prevCount = Array.isArray(prevData.messages) ? prevData.messages.length : 0;
                    const nextCount = Array.isArray(nextData.messages) ? nextData.messages.length : 0;
                    if (prevCount !== nextCount) {
                        renderMessages(updated);
                    }
                }
                catch {
                    // ignore polling errors
                }
            }, 3000);
        }
        catch (err) {
            alert(err.message);
        }
    };
    const refreshConversations = async () => {
        if (!auth) {
            return;
        }
        try {
            const response = await fetchAgentConversations(auth, agentDoc.id);
            const items = Array.isArray(response.conversations)
                ? response.conversations
                : [];
            renderConversationList(items, state.currentConversation?.id ?? null, loadConversation);
        }
        catch (err) {
            alert(err.message);
        }
    };
    document.getElementById("agent-save")?.addEventListener("click", async () => {
        if (!auth || !state.currentAgent) {
            return;
        }
        const nameInput = document.getElementById("agent-edit-name");
        const providerInput = document.getElementById("agent-edit-provider");
        const modelInput = document.getElementById("agent-edit-model");
        const systemInput = document.getElementById("agent-edit-system");
        const adminInput = document.getElementById("agent-edit-admin");
        const nameValue = nameInput?.value.trim() || "";
        const providerValue = providerInput?.value.trim() || "";
        const modelValue = modelInput?.value.trim() || "";
        const systemValue = systemInput?.value.trim() || "";
        const adminValue = adminInput?.value.trim() || "";
        if (!nameValue || !providerValue || !modelValue || !systemValue || !adminValue) {
            alert("All agent fields are required.");
            return;
        }
        if (providerInput?.disabled || modelInput?.disabled) {
            alert("Enable an integration and sync models first.");
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
        }
        catch (err) {
            alert(err.message);
        }
    });
    document.getElementById("agent-new-conversation")?.addEventListener("click", async () => {
        if (!auth || !state.currentAgent) {
            return;
        }
        try {
            const created = await createAgentConversation(auth, state.currentAgent.id);
            state.currentConversation = created;
            await refreshConversations();
            await loadConversation(created.id);
        }
        catch (err) {
            alert(err.message);
        }
    });
    document.getElementById("agent-chat-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!auth || !state.currentConversation) {
            return;
        }
        const input = document.getElementById("agent-chat-text");
        const content = input?.value.trim() || "";
        if (!content) {
            return;
        }
        try {
            const updated = await appendAgentMessage(auth, state.currentConversation.id, content);
            state.currentConversation = updated;
            if (input) {
                input.value = "";
            }
            renderMessages(updated);
        }
        catch (err) {
            alert(err.message);
        }
    });
    updateChatInputState(false);
    updateConversationHeader(null);
    await refreshConversations();
};
