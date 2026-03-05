import type { RemoteDocument } from "../../api";
import { isRecord } from "../../utils";

const currentData = (conversation: RemoteDocument) => {
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  conversation.payload.data = payloadData;
  return payloadData as Record<string, unknown>;
};

export const conversationMessageCount = (conversation: RemoteDocument | null) => {
  if (!conversation) {
    return 0;
  }
  const data = currentData(conversation);
  return Array.isArray(data.messages) ? data.messages.length : 0;
};

export const conversationHasPendingResponse = (conversation: RemoteDocument | null) => {
  if (!conversation) {
    return false;
  }
  const data = currentData(conversation);
  if (typeof data.pendingResponse === "boolean") {
    return data.pendingResponse;
  }

  const messages = Array.isArray(data.messages) ? data.messages : [];
  if (!messages.length) {
    return false;
  }

  const last = messages[messages.length - 1];
  if (!isRecord(last)) {
    return false;
  }

  return String(last.role || "").trim().toLowerCase() === "user";
};

export const appendConversationMessage = (
  conversation: RemoteDocument,
  role: "user" | "assistant",
  content: string
) => {
  const data = currentData(conversation);
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const createdAt = new Date().toISOString();
  messages.push({ role, content, createdAt });
  data.messages = messages;
  data.updatedAt = createdAt;
  data.pendingResponse = role === "user";
};

export const markConversationPending = (conversation: RemoteDocument, pending: boolean) => {
  const data = currentData(conversation);
  data.pendingResponse = pending;
  data.updatedAt = new Date().toISOString();
};
