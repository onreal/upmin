import { isRecord } from "../../utils";
export const renderMessages = (conversation) => {
    const messagesContainer = document.getElementById("agent-chat-messages");
    if (!messagesContainer) {
        return;
    }
    const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
    const messages = Array.isArray(payloadData.messages) ? payloadData.messages : [];
    if (!messages.length) {
        messagesContainer.innerHTML = `<p class="app-muted">No messages yet.</p>`;
        return;
    }
    messagesContainer.innerHTML = messages
        .map((message) => {
        const record = isRecord(message) ? message : {};
        const role = typeof record.role === "string" ? record.role : "user";
        const content = typeof record.content === "string" ? record.content : "";
        const label = role === "assistant" ? "Agent" : "You";
        const roleClass = role === "assistant" ? "is-assistant" : "is-user";
        return `
        <div class="app-chat-message ${roleClass}">
          <div class="app-chat-message-role">${label}</div>
          <div class="app-chat-message-content">${content}</div>
        </div>
      `;
    })
        .join("");
};
export const updateConversationHeader = (conversation) => {
    const title = document.getElementById("agent-chat-title");
    const meta = document.getElementById("agent-chat-meta");
    if (!title || !meta) {
        return;
    }
    if (!conversation) {
        title.textContent = "No conversation selected";
        meta.textContent = "Select or create a conversation.";
        return;
    }
    const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
    const createdAt = typeof payloadData.createdAt === "string" ? payloadData.createdAt : "";
    title.textContent = conversation.payload.name || "Conversation";
    meta.textContent = createdAt ? `Started ${createdAt}` : "Conversation loaded.";
};
export const updateChatInputState = (active) => {
    const input = document.getElementById("agent-chat-text");
    const send = document.getElementById("agent-chat-send");
    if (input) {
        input.disabled = !active;
    }
    if (send) {
        send.disabled = !active;
    }
};
export const renderConversationList = (items, currentConversationId, onSelect) => {
    const list = document.getElementById("agent-conversation-list");
    if (!list) {
        return;
    }
    if (!items.length) {
        list.innerHTML = `<p class="app-muted">No conversations yet.</p>`;
        return;
    }
    list.innerHTML = items
        .map((item) => {
        const active = currentConversationId === item.id ? "is-active" : "";
        const meta = item.createdAt ? `<div class="app-conversation-meta">${item.createdAt}</div>` : "";
        return `
        <button class="button app-button app-ghost app-conversation-item ${active}" data-conversation-id="${item.id}">
          <div class="app-conversation-title">${item.name}</div>
          ${meta}
        </button>
      `;
    })
        .join("");
    list.querySelectorAll("[data-conversation-id]").forEach((button) => {
        button.addEventListener("click", () => {
            const id = button.getAttribute("data-conversation-id");
            if (id) {
                onSelect(id);
            }
        });
    });
};
