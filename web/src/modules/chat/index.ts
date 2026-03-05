import type { ChatConversationSummary, ModuleDefinition, RemoteDocument } from "../../api";
import {
  appendChatMessage,
  deleteChatConversation,
  fetchChatConversations,
  pullChatConversation,
  startChatConversation,
} from "../../api";
import type { ModuleRenderContext } from "../types";
import { moduleSettingsKey } from "../utils";
import { isRecord } from "../../utils";
import {
  extractMessages,
  renderMessages,
  updateChatInputState,
  updateConversationHeader,
  type ChatMessage,
} from "./utils";

const buildHeader = (module: ModuleDefinition, agentName: string, openSettings?: () => void) => {
  const header = document.createElement("div");
  header.className = "app-module-header";
  const headerRow = document.createElement("div");
  headerRow.className = "app-module-header-row";
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  headerRow.append(title);
  if (openSettings) {
    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "button app-button app-ghost app-icon-button app-module-settings-button";
    settingsButton.title = "Module settings";
    settingsButton.setAttribute("aria-label", "Module settings");
    settingsButton.innerHTML = `
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          ></path>
          <path
            d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          ></path>
        </svg>
      </span>
    `;
    settingsButton.addEventListener("click", openSettings);
    headerRow.append(settingsButton);
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

export const renderChatModule = (panel: HTMLElement, context: ModuleRenderContext) => {
  const { module, payload, editor, auth } = context;
  const settings = isRecord(context.settings) ? context.settings : null;
  const agentSettings = settings && isRecord(settings.agent) ? settings.agent : null;
  const agentName = typeof agentSettings?.name === "string" ? agentSettings.name.trim() : "";
  const settingsKey = moduleSettingsKey(payload, module.name);
  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const targetKey =
    typeof outputSettings?.target === "string" && outputSettings.target.trim() !== ""
      ? outputSettings.target.trim()
      : module.name;

  const ensureDataObject = () => {
    if (isRecord(payload.data)) {
      return payload.data as Record<string, unknown>;
    }
    payload.data = {};
    editor?.setValue(payload.data);
    return payload.data as Record<string, unknown>;
  };

  const ensureOutputList = () => {
    const data = ensureDataObject();
    const existing = data[targetKey];
    if (!Array.isArray(existing)) {
      data[targetKey] = [];
      return data[targetKey] as Array<Record<string, unknown>>;
    }
    return existing as Array<Record<string, unknown>>;
  };

  const moduleCard = document.createElement("div");
  moduleCard.className = "app-module";
  moduleCard.append(buildHeader(module, agentName, context.openSettings));

  if (!agentName) {
    const notice = document.createElement("div");
    notice.className = "notification is-warning is-light";
    notice.textContent = "Set Chat.agent.name in module settings to start chatting.";
    moduleCard.append(notice);
    panel.append(moduleCard);
    return;
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
            <div class="select is-small">
              <select data-role="chat-select">
                <option value="">Select chat</option>
              </select>
            </div>
            <button class="button app-button app-ghost" data-action="new">New</button>
            <button class="button app-button app-ghost app-icon-button" data-action="delete" title="Delete chat" aria-label="Delete chat" disabled>
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                  <path
                    d="M9 6h6M10 6V4h4v2M6 6h12M8 6v12m4-12v12m4-12v12"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div class="app-chat-scroll" data-role="chat-scroll">
          <div class="app-chat-messages" data-role="chat-messages"></div>
          <button
            type="button"
            class="button app-button app-ghost app-chat-jump"
            data-role="chat-jump"
            aria-label="Jump to latest message"
            title="Jump to latest message"
          >
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                <path
                  d="M6 9l6 6 6-6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
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

  moduleCard.append(body);
  panel.append(moduleCard);

  const titleEl = body.querySelector<HTMLElement>("[data-role='chat-title']");
  const metaEl = body.querySelector<HTMLElement>("[data-role='chat-meta']");
  const scrollEl = body.querySelector<HTMLElement>("[data-role='chat-scroll']");
  const messagesEl = body.querySelector<HTMLElement>("[data-role='chat-messages']");
  const statusEl = body.querySelector<HTMLElement>("[data-role='chat-status']");
  const formEl = body.querySelector<HTMLFormElement>("[data-role='chat-form']");
  const inputEl = body.querySelector<HTMLTextAreaElement>("[data-role='chat-input']");
  const sendEl = body.querySelector<HTMLButtonElement>("[data-role='chat-send']");
  const selectEl = body.querySelector<HTMLSelectElement>("[data-role='chat-select']");
  const jumpEl = body.querySelector<HTMLButtonElement>("[data-role='chat-jump']");
  const newButton = body.querySelector<HTMLButtonElement>("[data-action='new']");
  const deleteButton = body.querySelector<HTMLButtonElement>("[data-action='delete']");

  if (
    !titleEl ||
    !metaEl ||
    !scrollEl ||
    !messagesEl ||
    !statusEl ||
    !formEl ||
    !inputEl ||
    !sendEl ||
    !selectEl ||
    !jumpEl
  ) {
    return;
  }

  let conversations: ChatConversationSummary[] = [];
  let currentConversation: RemoteDocument | null = null;
  let poller: number | null = null;
  let pendingNew = false;

  const isMessageSelected = (message: ChatMessage) => {
    const data = ensureDataObject();
    const list = Array.isArray(data[targetKey]) ? (data[targetKey] as Array<Record<string, unknown>>) : [];
    return list.some((entry) => isRecord(entry) && entry.id === message.id);
  };

  const buildMessageEntry = (message: ChatMessage, conversationId: string) => ({
    id: message.id,
    conversationId,
    agent: agentName,
    content: message.content,
    createdAt: message.createdAt ?? null,
    role: message.role,
  });

  const toggleMessageSelection = (message: ChatMessage, selected: boolean) => {
    const data = ensureDataObject();
    const list = ensureOutputList();
    if (selected) {
      const next = list.filter((entry) => !(isRecord(entry) && entry.id === message.id));
      data[targetKey] = next;
    } else if (currentConversation) {
      list.push(buildMessageEntry(message, currentConversation.id));
    }
    editor?.setValue(data);
  };

  const copyMessage = async (message: ChatMessage) => {
    const content = message.content;
    if (!content) {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setStatus("Copied.");
      window.setTimeout(() => setStatus(""), 1200);
    } catch {
      setStatus("Copy failed.");
    }
  };

  const renderCurrentMessages = () => {
    const messages = extractMessages(currentConversation);
    const emptyState = currentConversation ? "No messages yet." : "Select or create a conversation.";
    renderMessages(messagesEl, messages, {
      enableActions: true,
      isSelected: (message) => isMessageSelected(message),
      onToggle: (message, selected) => {
        toggleMessageSelection(message, selected);
        renderCurrentMessages();
      },
      onCopy: (message) => void copyMessage(message),
      emptyState,
    });
  };

  const setStatus = (message: string) => {
    statusEl.textContent = message;
  };

  const isNearBottom = () => {
    const threshold = 48;
    return scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight <= threshold;
  };

  const scrollToBottom = () => {
    scrollEl.scrollTop = scrollEl.scrollHeight;
  };

  const updateJumpVisibility = () => {
    jumpEl.classList.toggle("is-visible", pendingNew);
  };

  const setConversation = (conversation: RemoteDocument | null, forceScroll = false) => {
    currentConversation = conversation;
    updateConversationHeader(titleEl, metaEl, conversation);
    const wasAtBottom = forceScroll || isNearBottom();
    renderCurrentMessages();
    updateChatInputState(inputEl, sendEl, !!conversation);
    if (conversation) {
      selectEl.value = conversation.id;
      if (deleteButton) {
        deleteButton.disabled = false;
      }
    } else {
      selectEl.value = "";
      if (deleteButton) {
        deleteButton.disabled = true;
      }
    }
    if (wasAtBottom) {
      scrollToBottom();
      pendingNew = false;
    }
    updateJumpVisibility();
  };

  const appendLocalMessage = (role: "user" | "assistant", content: string) => {
    if (!currentConversation) {
      return;
    }
    const data = isRecord(currentConversation.payload.data) ? currentConversation.payload.data : {};
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const createdAt = new Date().toISOString();
    messages.push({ role, content, createdAt });
    data.messages = messages;
    currentConversation.payload.data = data;
    const wasAtBottom = isNearBottom();
    renderCurrentMessages();
    if (wasAtBottom) {
      scrollToBottom();
      pendingNew = false;
      updateJumpVisibility();
    }
  };

  const updateSelectOptions = () => {
    selectEl.innerHTML =
      `<option value="">Select chat</option>` +
      conversations
        .map((item) => `<option value="${item.id}">${item.name}</option>`)
        .join("");
    if (currentConversation) {
      selectEl.value = currentConversation.id;
    }
  };

  const stopPolling = () => {
    if (poller !== null) {
      window.clearInterval(poller);
      poller = null;
    }
  };

  const startPolling = (conversationId: string) => {
    stopPolling();
    poller = window.setInterval(async () => {
      if (!auth || !currentConversation || currentConversation.id !== conversationId) {
        return;
      }
      try {
        const updated = await pullChatConversation(auth, module.name, {
          id: conversationId,
          settings: settingsKey,
        });
        const prevData = isRecord(currentConversation.payload.data)
          ? currentConversation.payload.data
          : {};
        const nextData = isRecord(updated.payload.data) ? updated.payload.data : {};
        const prevCount = Array.isArray(prevData.messages) ? prevData.messages.length : 0;
        const nextCount = Array.isArray(nextData.messages) ? nextData.messages.length : 0;
        if (prevCount !== nextCount) {
          pendingNew = !isNearBottom();
          setConversation(updated, !pendingNew);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
  };

  const loadConversation = async (conversationId: string) => {
    if (!auth) {
      setStatus("Login required.");
      return;
    }
    setStatus("Loading conversation...");
    try {
      const conversation = await pullChatConversation(auth, module.name, {
        id: conversationId,
        settings: settingsKey,
      });
      pendingNew = false;
      setConversation(conversation, true);
      updateSelectOptions();
      startPolling(conversation.id);
      setStatus("");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const refreshList = async () => {
    if (!auth) {
      setStatus("Login required.");
      return;
    }
    setStatus("Loading conversations...");
    try {
      const response = await fetchChatConversations(auth, module.name, { settings: settingsKey });
      conversations = Array.isArray(response.items) ? (response.items as ChatConversationSummary[]) : [];
      updateSelectOptions();
      setStatus("");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const startConversation = async () => {
    if (!auth) {
      setStatus("Login required.");
      return;
    }
    setStatus("Starting conversation...");
    try {
      const conversation = await startChatConversation(auth, module.name, { settings: settingsKey });
      pendingNew = false;
      setConversation(conversation, true);
      await refreshList();
      startPolling(conversation.id);
      setStatus("");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const sendMessage = async (content: string) => {
    if (!auth || !currentConversation) {
      return;
    }
    appendLocalMessage("user", content);
    setStatus("Sending message...");
    try {
      const updated = await appendChatMessage(auth, module.name, {
        id: currentConversation.id,
        content,
        settings: settingsKey,
      });
      pendingNew = false;
      setConversation(updated, true);
      startPolling(updated.id);
      await refreshList();
      setStatus("");
    } catch (err) {
      appendLocalMessage("assistant", "Agent couldn't reply. Please try again.");
      setStatus((err as Error).message);
    }
  };

  newButton?.addEventListener("click", () => {
    void startConversation();
  });

  deleteButton?.addEventListener("click", () => {
    if (!auth || !currentConversation) {
      return;
    }
    const conversationId = currentConversation.id;
    setStatus("Deleting conversation...");
    void deleteChatConversation(auth, module.name, {
      id: conversationId,
      settings: settingsKey,
    })
      .then(async () => {
        stopPolling();
        setConversation(null, true);
        await refreshList();
        setStatus("");
      })
      .catch((err) => {
        setStatus((err as Error).message);
      });
  });

  selectEl.addEventListener("change", () => {
    const id = selectEl.value.trim();
    if (!id) {
      return;
    }
    void loadConversation(id);
  });

  scrollEl.addEventListener("scroll", () => {
    if (isNearBottom()) {
      pendingNew = false;
      updateJumpVisibility();
    }
  });

  jumpEl.addEventListener("click", () => {
    scrollToBottom();
    pendingNew = false;
    updateJumpVisibility();
  });

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const content = inputEl.value.trim();
    if (!content) {
      return;
    }
    inputEl.value = "";
    void sendMessage(content);
  });

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formEl.requestSubmit();
    }
  });

  updateChatInputState(inputEl, sendEl, false);
  renderCurrentMessages();
  void refreshList();
};
