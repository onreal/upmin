import type { AuthState, ChatConversationSummary, ModuleDefinition, RemoteDocument } from "./types";
import { request, requestForm } from "./client";

export const fetchModules = (auth: AuthState) =>
  request<{ modules: ModuleDefinition[] }>("/api/modules", { method: "GET" }, auth);

export const uploadModuleFile = (
  auth: AuthState,
  moduleName: string,
  file: File,
  settingsKey?: string
) => {
  const body = new FormData();
  body.append("file", file);
  if (settingsKey) {
    body.append("settings", settingsKey);
  }
  return requestForm<{ url: string; path: string; filename: string }>(
    `/api/modules/${moduleName}`,
    body,
    auth
  );
};

export const fetchModuleList = (
  auth: AuthState,
  moduleName: string,
  params: { visibility?: string; settings?: string }
) => {
  const search = new URLSearchParams();
  if (params.visibility) {
    search.set("visibility", params.visibility);
  }
  if (params.settings) {
    search.set("settings", params.settings);
  }
  const query = search.toString();
  const url = query ? `/api/modules/${moduleName}/list?${query}` : `/api/modules/${moduleName}/list`;
  return request<{ items: Array<Record<string, unknown>> }>(url, { method: "GET" }, auth);
};

export const deleteModuleFile = (
  auth: AuthState,
  moduleName: string,
  payload: { path: string; visibility?: string; settings?: string }
) =>
  request<{ ok: boolean }>(
    `/api/modules/${moduleName}/delete`,
    { method: "POST", body: JSON.stringify(payload) },
    auth
  );

export const fetchChatConversations = (
  auth: AuthState,
  moduleName: string,
  params: { settings: string }
) => {
  const search = new URLSearchParams();
  search.set("settings", params.settings);
  return request<{ items: ChatConversationSummary[] }>(
    `/api/modules/${moduleName}/list?${search.toString()}`,
    { method: "GET" },
    auth,
    { notify: false }
  );
};

export const startChatConversation = (
  auth: AuthState,
  moduleName: string,
  payload: { settings: string }
) =>
  request<RemoteDocument>(
    `/api/modules/${moduleName}`,
    { method: "POST", body: JSON.stringify(payload) },
    auth,
    { notify: false }
  );

export const appendChatMessage = (
  auth: AuthState,
  moduleName: string,
  payload: { id: string; content: string; settings: string }
) =>
  request<RemoteDocument>(
    `/api/modules/${moduleName}/message`,
    { method: "POST", body: JSON.stringify(payload) },
    auth,
    { notify: false }
  );

export const fetchChatConversation = (
  auth: AuthState,
  moduleName: string,
  params: { id: string; settings: string }
) => {
  const search = new URLSearchParams();
  search.set("settings", params.settings);
  search.set("id", params.id);
  return request<RemoteDocument>(
    `/api/modules/${moduleName}/conversation?${search.toString()}`,
    { method: "GET" },
    auth,
    { notify: false }
  );
};

export const deleteChatConversation = (
  auth: AuthState,
  moduleName: string,
  payload: { id: string; settings: string }
) =>
  request<{ ok: boolean }>(
    `/api/modules/${moduleName}/delete`,
    { method: "POST", body: JSON.stringify(payload) },
    auth
  );
