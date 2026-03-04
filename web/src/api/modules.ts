import type { AuthState, ModuleDefinition } from "./types";
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
