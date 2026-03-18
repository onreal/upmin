import type { ModuleDefinition } from "../../api";

export type ChatDom = {
  title: HTMLElement;
  meta: HTMLElement;
  scroll: HTMLElement;
  messages: HTMLElement;
  status: HTMLElement;
  form: HTMLFormElement;
  input: HTMLTextAreaElement;
  send: HTMLButtonElement;
  select: HTMLSelectElement;
  jump: HTMLButtonElement;
  create: HTMLButtonElement | null;
  remove: HTMLButtonElement | null;
};

const buildHeader = (
  module: ModuleDefinition,
  agentName: string,
  openSettings?: () => void,
  hideHeader?: boolean
) => {
  if (hideHeader) {
    return null;
  }

  const header = document.createElement("div");
  header.className = "app-module-header";

  const headerRow = document.createElement("div");
  headerRow.className = "app-module-header-row";

  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  headerRow.append(title);

  if (openSettings) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button app-button app-ghost app-icon-button app-module-settings-button";
    button.title = "Module settings";
    button.setAttribute("aria-label", "Module settings");
    button.innerHTML = `
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
        </svg>
      </span>
    `;
    button.addEventListener("click", openSettings);
    headerRow.append(button);
  }

  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} · ${module.author}` : module.description;

  header.append(headerRow, meta);

  if (agentName) {
    const agentMeta = document.createElement("div");
    agentMeta.className = "app-module-meta";
    agentMeta.textContent = `Agent: ${agentName}`;
    header.append(agentMeta);
  }

  return header;
};

export const renderChatLayout = (
  panel: HTMLElement,
  module: ModuleDefinition,
  agentName: string,
  openSettings?: () => void,
  hideHeader?: boolean
): ChatDom | null => {
  const card = document.createElement("div");
  card.className = "app-module";
  const header = buildHeader(module, agentName, openSettings, hideHeader);
  if (header) {
    card.append(header);
  }

  const body = document.createElement("div");
  body.className = "app-module-body";
  body.innerHTML = `
    <div class="app-chat-layout">
      <div class="app-panel app-chat">
        <div class="app-chat-header">
          <div>
            <div class="app-chat-title" data-role="chat-title">No conversation selected</div>
            <div class="app-chat-meta app-muted" data-role="chat-meta">Select or create a conversation.</div>
          </div>
          <div class="app-chat-actions">
            <div class="select is-small app-chat-select-wrap">
              <select data-role="chat-select">
                <option value="">Select chat</option>
              </select>
            </div>
            <button
              class="button app-button app-ghost app-chat-toolbar-button app-chat-toolbar-icon-button"
              data-action="new"
              title="Start a new conversation"
              aria-label="Start a new conversation"
            >
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
                </svg>
              </span>
            </button>
            <button
              class="button app-button app-ghost app-icon-button app-chat-toolbar-button app-chat-toolbar-icon-button"
              data-action="delete"
              title="Delete the selected conversation"
              aria-label="Delete the selected conversation"
              disabled
            >
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                  <path d="M9 6h6M10 6V4h4v2M6 6h12M8 6v12m4-12v12m4-12v12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div class="app-chat-scroll" data-role="chat-scroll">
          <div class="app-chat-messages" data-role="chat-messages"></div>
          <button type="button" class="button app-button app-ghost app-chat-jump" data-role="chat-jump" aria-label="Jump to latest message" title="Jump to latest message">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </span>
          </button>
        </div>
        <div class="app-chat-input">
          <form data-role="chat-form">
            <div class="field">
              <div class="control">
                <textarea class="textarea" rows="2" placeholder="Write a message" data-role="chat-input" disabled></textarea>
              </div>
            </div>
            <div class="buttons">
              <button class="button app-button app-primary" data-role="chat-send" disabled>Send</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <p class="help" data-role="chat-status"></p>
  `;

  card.append(body);
  panel.append(card);

  const title = body.querySelector<HTMLElement>("[data-role='chat-title']");
  const meta = body.querySelector<HTMLElement>("[data-role='chat-meta']");
  const scroll = body.querySelector<HTMLElement>("[data-role='chat-scroll']");
  const messages = body.querySelector<HTMLElement>("[data-role='chat-messages']");
  const status = body.querySelector<HTMLElement>("[data-role='chat-status']");
  const form = body.querySelector<HTMLFormElement>("[data-role='chat-form']");
  const input = body.querySelector<HTMLTextAreaElement>("[data-role='chat-input']");
  const send = body.querySelector<HTMLButtonElement>("[data-role='chat-send']");
  const select = body.querySelector<HTMLSelectElement>("[data-role='chat-select']");
  const jump = body.querySelector<HTMLButtonElement>("[data-role='chat-jump']");

  if (!title || !meta || !scroll || !messages || !status || !form || !input || !send || !select || !jump) {
    return null;
  }

  return {
    title,
    meta,
    scroll,
    messages,
    status,
    form,
    input,
    send,
    select,
    jump,
    create: body.querySelector<HTMLButtonElement>("[data-action='new']"),
    remove: body.querySelector<HTMLButtonElement>("[data-action='delete']"),
  };
};
