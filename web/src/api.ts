export type AuthState =
  | { type: "apiKey"; value: string }
  | { type: "token"; value: string; user?: AuthUser }
  | null;

const STORAGE_KEY = "manage_auth";

export const loadAuth = (): AuthState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
};

export const saveAuth = (auth: AuthState) => {
  if (!auth) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
};

const buildHeaders = (auth: AuthState, json: boolean) => {
  const headers: Record<string, string> = {};
  if (json) {
    headers["Content-Type"] = "application/json";
  }
  if (auth?.type === "apiKey") {
    headers["X-API-KEY"] = auth.value;
  }
  if (auth?.type === "token") {
    headers["Authorization"] = `Bearer ${auth.value}`;
  }
  return headers;
};

const request = async <T>(
  url: string,
  options: RequestInit,
  auth: AuthState
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(auth, true),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }

  return (await response.json()) as T;
};

const requestBlob = async (
  url: string,
  options: RequestInit,
  auth: AuthState
): Promise<{ blob: Blob; filename: string | null }> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(auth, true),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (
    !contentType.includes("application/zip") &&
    !contentType.includes("application/json") &&
    !contentType.includes("application/gzip") &&
    !contentType.includes("application/x-gzip") &&
    !contentType.includes("application/octet-stream")
  ) {
    throw new Error("Unexpected download response.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  const filename = match ? match[1] : null;

  return { blob, filename };
};

const requestForm = async <T>(
  url: string,
  body: FormData,
  auth: AuthState
): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    body,
    headers: {
      ...buildHeaders(auth, false),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }

  return (await response.json()) as T;
};

export const loginWithApiKey = (apiKey: string) =>
  request<{ apiKey: true }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    },
    null
  );

export const loginWithPassword = (email: string, password: string) =>
  request<{ token: string; user: AuthUser }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    null
  );

export const fetchNavigation = (auth: AuthState) =>
  request<{ pages: NavigationPage[] }>(
    "/api/navigation",
    { method: "GET" },
    auth
  );

export const fetchDocument = (auth: AuthState, id: string) =>
  request<RemoteDocument>(
    `/api/documents/${id}`,
    { method: "GET" },
    auth
  );

export const updateDocument = (auth: AuthState, id: string, payload: DocumentPayload) =>
  request<RemoteDocument>(
    `/api/documents/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
    auth
  );

export const createDocument = (
  auth: AuthState,
  requestPayload: { store: "public" | "private"; path: string; payload: DocumentPayload }
) =>
  request<RemoteDocument>(
    `/api/documents`,
    { method: "POST", body: JSON.stringify(requestPayload) },
    auth
  );

export const fetchUiConfig = (auth: AuthState) =>
  request<{ config: UiConfig }>("/api/ui-config", { method: "GET" }, auth);

export const fetchLayoutConfig = (auth: AuthState) =>
  request<{ config: LayoutConfig }>("/api/layout-config", { method: "GET" }, auth);

export const downloadDocument = (auth: AuthState, id: string) =>
  requestBlob(`/api/documents/${id}/export`, { method: "GET" }, auth);

export const downloadArchive = (auth: AuthState) =>
  requestBlob(`/api/export.tar.gz`, { method: "GET" }, auth);

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

export type NavigationPage = {
  page: string;
  name: string;
  language?: string | null;
  order?: number | null;
  documentId?: string | null;
  store?: string | null;
  path?: string | null;
  sections: Array<{
    id: string;
    name: string;
    language?: string | null;
    order?: number | null;
    store: string;
    path: string;
  }>;
};

export type DocumentPayload = {
  page: string;
  name: string;
  language?: string | null;
  order: number;
  section: boolean;
  modules?: string[] | null;
  module?: string | null;
  data: unknown;
};

export type RemoteDocument = {
  id: string;
  store: string;
  path: string;
  payload: DocumentPayload;
};

export type UiConfig = {
  theme?: "light" | "dark";
  tokens?: Record<string, string>;
  darkTokens?: Record<string, string>;
};

export type ModuleDefinition = {
  name: string;
  description: string;
  input: string;
  output: string;
  parameters?: Record<string, unknown>;
  author?: string;
  schema: Record<string, unknown>;
};

export type LayoutConfig = {
  header?: {
    title?: string;
    subtitle?: string;
    settingsLabel?: string;
    themeLabel?: string;
    createLabel?: string;
    profileLabel?: string;
    logoutLabel?: string;
  };
  sidebar?: {
    publicLabel?: string;
  };
  profile?: {
    title?: string;
    subtitle?: string;
    saveLabel?: string;
  };
};

export type AuthUser = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  attributes?: Record<string, unknown>;
};
