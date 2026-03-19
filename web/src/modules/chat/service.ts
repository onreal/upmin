import type { AuthState, ChatConversationSummary, RemoteDocument } from "../../api";
import {
  appendChatMessage,
  deleteChatConversation,
  fetchChatConversation,
  fetchChatConversations,
  startChatConversation,
} from "../../api";

type ChatServiceContext = {
  auth: AuthState;
  moduleName: string;
  settingsKey: string;
};

export const latestConversationId = (items: ChatConversationSummary[]) => {
  if (!items.length) {
    return null;
  }

  const timestamp = (item: ChatConversationSummary) => {
    const raw = item.updatedAt || item.createdAt || "";
    const value = Date.parse(raw);
    return Number.isNaN(value) ? 0 : value;
  };

  return [...items]
    .sort((a, b) => {
      const diff = timestamp(b) - timestamp(a);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    })[0]?.id ?? null;
};

export const listConversations = async (context: ChatServiceContext) => {
  const response = await fetchChatConversations(context.auth, context.moduleName, {
    settings: context.settingsKey,
  });
  return Array.isArray(response.items) ? response.items : [];
};

export const loadConversation = (context: ChatServiceContext, conversationId: string) =>
  fetchChatConversation(context.auth, context.moduleName, {
    id: conversationId,
    settings: context.settingsKey,
  });

export const createConversation = (context: ChatServiceContext) =>
  startChatConversation(context.auth, context.moduleName, {
    settings: context.settingsKey,
  });

export const sendConversationMessage = (
  context: ChatServiceContext,
  conversationId: string,
  content: string
) =>
  appendChatMessage(context.auth, context.moduleName, {
    id: conversationId,
    content,
    settings: context.settingsKey,
  });

export const removeConversation = (context: ChatServiceContext, conversationId: string) =>
  deleteChatConversation(context.auth, context.moduleName, {
    id: conversationId,
    settings: context.settingsKey,
  });

export const copyMessageToClipboard = (content: string) => navigator.clipboard.writeText(content);
