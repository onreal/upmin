import type { DocumentPayload, RemoteDocument } from "../../api";
import type { JsonEditorHandle } from "../../json-editor";
import { isRecord } from "../../utils";
import type { ChatMessage } from "./utils";

type DataMutationContext = {
  payload: DocumentPayload;
  editor: JsonEditorHandle | null;
};

type OutputToggleContext = DataMutationContext & {
  targetKey: string;
  conversation: RemoteDocument | null;
  agentName: string;
};

export const ensureDataObject = ({ payload, editor }: DataMutationContext) => {
  if (isRecord(payload.data)) {
    return payload.data as Record<string, unknown>;
  }
  payload.data = {};
  editor?.setValue(payload.data);
  return payload.data as Record<string, unknown>;
};

const ensureOutputList = (data: Record<string, unknown>, targetKey: string) => {
  const existing = data[targetKey];
  if (!Array.isArray(existing)) {
    data[targetKey] = [];
    return data[targetKey] as Array<Record<string, unknown>>;
  }
  return existing as Array<Record<string, unknown>>;
};

export const isMessageSelected = (
  context: DataMutationContext,
  targetKey: string,
  message: ChatMessage
) => {
  const data = ensureDataObject(context);
  const list = Array.isArray(data[targetKey]) ? (data[targetKey] as Array<Record<string, unknown>>) : [];
  return list.some((entry) => isRecord(entry) && entry.id === message.id);
};

export const toggleOutputMessage = (
  context: OutputToggleContext,
  message: ChatMessage,
  selected: boolean
) => {
  const data = ensureDataObject(context);
  const list = ensureOutputList(data, context.targetKey);

  if (selected) {
    data[context.targetKey] = list.filter((entry) => !(isRecord(entry) && entry.id === message.id));
  } else if (context.conversation) {
    list.push({
      id: message.id,
      conversationId: context.conversation.id,
      agent: context.agentName,
      content: message.content,
      createdAt: message.createdAt ?? null,
      role: message.role,
    });
  }

  context.editor?.setValue(data);
};
