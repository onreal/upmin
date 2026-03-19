import type { ConversationProgress } from "../../features/chat/progress";
import { adminText } from "../../app/translations";
import type { RemoteDocument } from "../../api";
import {
  extractMessages,
  renderMessages,
  type ChatMessage,
} from "./utils";

type MessagePanelBindings = {
  container: HTMLElement;
  assistantLabel: string;
  enableDataActions: boolean;
  getConversation: () => RemoteDocument | null;
  isSelected: (message: ChatMessage) => boolean;
  onToggle: (message: ChatMessage, selected: boolean) => void;
  onMerge: (message: ChatMessage) => void;
  onCopy: (message: ChatMessage) => void;
  progress: (conversation: RemoteDocument | null) => ConversationProgress | null;
};

export const createChatMessagePanel = (bindings: MessagePanelBindings) => {
  const foldedByConversation = new Map<string, Set<string>>();

  const ensureFoldState = (conversation: RemoteDocument | null) => {
    if (!conversation || foldedByConversation.has(conversation.id)) {
      return;
    }
    const assistantMessages = extractMessages(conversation).filter((message) => message.role === "assistant");
    const lastAssistantId = assistantMessages[assistantMessages.length - 1]?.id ?? null;
    const folded = new Set<string>();
    assistantMessages.forEach((message) => {
      if (message.id !== lastAssistantId) {
        folded.add(message.id);
      }
    });
    foldedByConversation.set(conversation.id, folded);
  };

  const isFolded = (message: ChatMessage) => {
    const conversation = bindings.getConversation();
    return !!conversation &&
      message.role === "assistant" &&
      (foldedByConversation.get(conversation.id)?.has(message.id) ?? false);
  };

  const toggleFold = (message: ChatMessage) => {
    const conversation = bindings.getConversation();
    if (!conversation || message.role !== "assistant") {
      return;
    }
    ensureFoldState(conversation);
    const folded = foldedByConversation.get(conversation.id);
    if (!folded) {
      return;
    }
    if (folded.has(message.id)) {
      folded.delete(message.id);
    } else {
      folded.add(message.id);
    }
    render();
  };

  const prepareConversation = (conversation: RemoteDocument | null) => {
    if (!conversation) {
      return;
    }
    ensureFoldState(conversation);
    const assistantMessages = extractMessages(conversation).filter((message) => message.role === "assistant");
    const latestAssistant = assistantMessages[assistantMessages.length - 1];
    if (latestAssistant) {
      foldedByConversation.get(conversation.id)?.delete(latestAssistant.id);
    }
  };

  const render = () => {
    const conversation = bindings.getConversation();
    const emptyState = conversation
      ? adminText("chat.noMessages", "No messages yet.")
      : adminText("chat.selectOrCreate", "Select or create a conversation.");
    ensureFoldState(conversation);
    renderMessages(bindings.container, extractMessages(conversation), {
      enableDataActions: bindings.enableDataActions,
      assistantLabel: bindings.assistantLabel,
      progress: bindings.progress(conversation),
      isSelected: bindings.isSelected,
      isFolded,
      onToggleFold: toggleFold,
      onToggle: bindings.onToggle,
      onMerge: bindings.onMerge,
      onCopy: bindings.onCopy,
      emptyState,
    });
  };

  return { prepareConversation, render };
};
