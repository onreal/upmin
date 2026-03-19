import type { ChatConversationSummary, RemoteDocument } from "../../api";
import { appendConversationProgress, type ConversationProgress } from "../../features/chat/progress";
import { isRecord } from "../../utils";
import { adminText } from "../../app/translations";

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt?: string | null;
};

export type RenderMessageOptions = {
  enableActions?: boolean;
  assistantLabel?: string;
  isSelected?: (message: ChatMessage) => boolean;
  onToggle?: (message: ChatMessage, selected: boolean) => void;
  onCopy?: (message: ChatMessage) => void;
  isFolded?: (message: ChatMessage) => boolean;
  onToggleFold?: (message: ChatMessage) => void;
  emptyState?: string;
  progress?: ConversationProgress | null;
};

const messageId = (conversationId: string, createdAt: string | null, index: number) =>
  `${conversationId}:${createdAt ?? index}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const foldedPreview = (content: string) => {
  const firstLine = content.split(/\r?\n/, 1)[0]?.trim() ?? "";
  return firstLine;
};

export const extractMessages = (conversation: RemoteDocument | null): ChatMessage[] => {
  if (!conversation) {
    return [];
  }
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const rawMessages = Array.isArray(payloadData.messages) ? payloadData.messages : [];
  if (!rawMessages.length) {
    return [];
  }

  return rawMessages.map((message, index) => {
    const record = isRecord(message) ? message : {};
    const role = typeof record.role === "string" ? record.role : "user";
    const content = typeof record.content === "string" ? record.content : "";
    const createdAt = typeof record.createdAt === "string" ? record.createdAt : null;
    return {
      id: messageId(conversation.id, createdAt, index),
      role,
      content,
      createdAt,
    };
  });
};

export const renderMessages = (
  container: HTMLElement,
  messages: ChatMessage[],
  options: RenderMessageOptions = {}
) => {
  if (!messages.length) {
    const label = options.emptyState ?? adminText("chat.selectOrCreate", "Select or create a conversation.");
    container.innerHTML = `<p class="app-muted">${label}</p>`;
    appendConversationProgress(container, options.progress ?? null, options.assistantLabel);
    return;
  }

  const enableActions = options.enableActions ?? false;
  const messageMap = new Map(messages.map((message) => [message.id, message]));

  container.innerHTML = messages
    .map((message) => {
      const role = message.role === "assistant" ? "assistant" : "user";
      const label = role === "assistant"
        ? options.assistantLabel?.trim() || adminText("agents.agent", "Agent")
        : adminText("chat.you", "You");
      const roleClass = role === "assistant" ? "is-assistant" : "is-user";
      const selectable = enableActions && role === "assistant";
      const foldable = role === "assistant";
      const folded = foldable && options.isFolded ? options.isFolded(message) : false;
      const selected = selectable && options.isSelected ? options.isSelected(message) : false;
      const selectedClass = selected ? "is-selected" : "";
      const foldedClass = folded ? "is-folded" : "";
      const toggleTitle = selected
        ? adminText("chat.removeFromData", "Remove from data")
        : adminText("chat.addToData", "Add to data");
      const toggleIcon = selected
        ? `<path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>`
        : `<path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>`;
      const foldTitle = folded
        ? adminText("chat.expandResponse", "Expand response")
        : adminText("chat.collapseResponse", "Collapse response");
      const foldIcon = folded
        ? `<path d="m8 10 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>`
        : `<path d="m8 14 4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>`;
      const preview = folded ? foldedPreview(message.content) : "";
      const actions = selectable
        ? `
          <div class="app-chat-message-actions">
            <button
              type="button"
              class="app-chat-action"
              data-chat-action="fold"
              data-message-id="${message.id}"
              title="${foldTitle}"
              aria-label="${foldTitle}"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                ${foldIcon}
              </svg>
            </button>
            <button
              type="button"
              class="app-chat-action ${selected ? "is-active" : ""}"
              data-chat-action="toggle"
              data-message-id="${message.id}"
              title="${toggleTitle}"
              aria-label="${toggleTitle}"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                ${toggleIcon}
              </svg>
            </button>
            <button
              type="button"
              class="app-chat-action"
              data-chat-action="copy"
              data-message-id="${message.id}"
              title="${adminText("common.copy", "Copy")}"
              aria-label="${adminText("common.copy", "Copy")}"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                <path
                  d="M9 9h9v10H9zM6 5h9v3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
              </svg>
            </button>
          </div>
        `
        : foldable
          ? `
          <div class="app-chat-message-actions">
            <button
              type="button"
              class="app-chat-action"
              data-chat-action="fold"
              data-message-id="${message.id}"
              title="${foldTitle}"
              aria-label="${foldTitle}"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                ${foldIcon}
              </svg>
            </button>
          </div>
        `
          : "";

      return `
        <div class="app-chat-message ${roleClass} ${selectedClass} ${foldedClass}" data-message-id="${message.id}">
          <div class="app-chat-message-role">${label}</div>
          ${actions}
          ${folded ? `<div class="app-chat-message-preview">${escapeHtml(preview)}</div>` : ""}
          <div class="app-chat-message-content">${message.content}</div>
        </div>
      `;
    })
    .join("");

  if (enableActions) {
    container.querySelectorAll<HTMLButtonElement>("[data-chat-action]").forEach((button) => {
      const id = button.getAttribute("data-message-id");
      if (!id) {
        return;
      }
      const message = messageMap.get(id);
      if (!message) {
        return;
      }
      const action = button.getAttribute("data-chat-action");
      if (action === "toggle") {
        button.addEventListener("click", () => {
          const selected = options.isSelected ? options.isSelected(message) : false;
          options.onToggle?.(message, selected);
        });
      }
      if (action === "fold") {
        button.addEventListener("click", () => {
          options.onToggleFold?.(message);
        });
      }
      if (action === "copy") {
        button.addEventListener("click", () => {
          options.onCopy?.(message);
        });
      }
    });
  }

  appendConversationProgress(container, options.progress ?? null, options.assistantLabel);
};

export const updateConversationHeader = (
  titleEl: HTMLElement,
  metaEl: HTMLElement,
  conversation: RemoteDocument | null
) => {
  if (!conversation) {
    titleEl.textContent = adminText("chat.noneSelected", "No conversation selected");
    metaEl.textContent = adminText("chat.selectOrCreate", "Select or create a conversation.");
    return;
  }

  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const createdAt = typeof payloadData.createdAt === "string" ? payloadData.createdAt : "";
  titleEl.textContent = conversation.payload.name || adminText("chat.conversation", "Conversation");
  metaEl.textContent = createdAt
    ? adminText("chat.startedAt", "Started {time}", { time: createdAt })
    : adminText("chat.loaded", "Conversation loaded.");
};

export const updateChatInputState = (
  input: HTMLTextAreaElement,
  send: HTMLButtonElement,
  active: boolean
) => {
  input.disabled = !active;
  send.disabled = !active;
};

export const renderConversationList = (
  container: HTMLElement,
  items: ChatConversationSummary[],
  activeId: string | null,
  onSelect: (id: string) => void
) => {
  if (!items.length) {
    container.innerHTML = `<p class="app-muted">${adminText("chat.noConversations", "No conversations yet.")}</p>`;
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const active = activeId === item.id ? "is-active" : "";
      const meta = item.createdAt ? `<div class="app-conversation-meta">${item.createdAt}</div>` : "";
      return `
        <button class="button app-button app-ghost app-conversation-item ${active}" data-conversation-id="${item.id}">
          <div class="app-conversation-title">${item.name}</div>
          ${meta}
        </button>
      `;
    })
    .join("");

  container.querySelectorAll<HTMLButtonElement>("[data-conversation-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-conversation-id");
      if (id) {
        onSelect(id);
      }
    });
  });
};
