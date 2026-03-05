import type { RemoteDocument } from "../../api";

export const renderAgentLayout = (
  agentDoc: RemoteDocument,
  systemPrompt: string,
  adminPrompt: string
) => `
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
            <div id="agent-chat-meta" class="app-chat-meta app-muted">Your next message starts a new conversation.</div>
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
          <p id="agent-chat-status" class="help"></p>
        </div>
      </div>
    </div>
  </div>
`;
