import type { RemoteDocument } from "../../api";
import { isRecord } from "../../utils";

export type ConversationProgressItem = {
  message: string;
  createdAt?: string | null;
};

export type ConversationProgress = {
  status: string;
  updatedAt?: string | null;
  items: ConversationProgressItem[];
};

export const getConversationProgress = (conversation: RemoteDocument | null): ConversationProgress | null => {
  if (!conversation) {
    return null;
  }

  const data = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const progress = isRecord(data.progress) ? data.progress : null;
  if (!progress) {
    return null;
  }

  const items: ConversationProgressItem[] = [];
  (Array.isArray(progress.items) ? progress.items : []).forEach((item) => {
    const record = isRecord(item) ? item : {};
    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (!message) {
      return;
    }

    items.push({
      message,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
    });
  });
  const recentItems = items.slice(-4);

  const status =
    (typeof progress.status === "string" ? progress.status.trim() : "")
    || recentItems[recentItems.length - 1]?.message
    || "";
  const updatedAt = typeof progress.updatedAt === "string" ? progress.updatedAt : null;

  if (!status && recentItems.length === 0) {
    return null;
  }

  return {
    status,
    updatedAt,
    items: recentItems,
  };
};

export const appendConversationProgress = (container: HTMLElement, progress: ConversationProgress | null) => {
  if (!progress) {
    return;
  }

  const card = document.createElement("div");
  card.className = "app-chat-progress";

  const title = document.createElement("div");
  title.className = "app-chat-progress-title";
  title.textContent = "Codex is working";

  const status = document.createElement("div");
  status.className = "app-chat-progress-status";
  status.textContent = progress.status || "Working...";

  card.append(title, status);

  if (progress.items.length > 0) {
    const list = document.createElement("div");
    list.className = "app-chat-progress-items";

    progress.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "app-chat-progress-item";
      row.textContent = item.message;
      list.append(row);
    });

    card.append(list);
  }

  container.append(card);
};
