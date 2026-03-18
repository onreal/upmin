import type { AuthState } from "./types";

const STORAGE_KEY = "manage_auth";

type NoticePayload = { type: "success" | "error"; message: string };
type SessionExpiredPayload = { message: string; status: number };
type UpdateLockedPayload = { message: string; status: number };

const notify = (payload: NoticePayload) => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<NoticePayload>("app:notice", { detail: payload }));
};

const notifySessionExpired = (payload: SessionExpiredPayload) => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<SessionExpiredPayload>("app:session-expired", { detail: payload }));
};

const notifyUpdateLocked = (payload: UpdateLockedPayload) => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<UpdateLockedPayload>("app:system-update-locked", { detail: payload }));
};

const successMessageFor = (method: string) => {
  if (method === "GET") return "Loaded.";
  if (method === "POST") return "Created.";
  if (method === "PUT") return "Saved.";
  if (method === "DELETE") return "Deleted.";
  return "Done.";
};

const handleUnauthorized = (response: Response, auth: AuthState, message: string) => {
  if (!auth || response.status !== 401) {
    return;
  }
  saveAuth(null);
  notifySessionExpired({ message, status: response.status });
};

const handleLocked = (response: Response, message: string) => {
  if (response.status !== 423) {
    return;
  }
  notifyUpdateLocked({ message, status: response.status });
};

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

type RequestConfig = { notify?: boolean };

export const request = async <T>(
  url: string,
  options: RequestInit,
  auth: AuthState,
  config: RequestConfig = {}
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
    const message = error.message || error.error || response.statusText || "Request failed";
    handleUnauthorized(response, auth, message);
    handleLocked(response, message);
    if (config.notify !== false) {
      notify({ type: "error", message });
    }
    throw new Error(message);
  }

  const data = (await response.json()) as T;
  const method = (options.method || "GET").toUpperCase();
  if (config.notify !== false) {
    notify({ type: "success", message: successMessageFor(method) });
  }
  return data;
};

export const requestBlob = async (
  url: string,
  options: RequestInit,
  auth: AuthState
): Promise<{ blob: Blob; filename?: string }> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(auth, true),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    const message = error.message || error.error || response.statusText || "Request failed";
    handleUnauthorized(response, auth, message);
    handleLocked(response, message);
    notify({ type: "error", message });
    throw new Error(message);
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
  const filename = match ? match[1] : undefined;

  notify({ type: "success", message: "Download ready." });
  return { blob, filename };
};

export const requestAsset = async (
  url: string,
  options: RequestInit,
  auth: AuthState,
  config: RequestConfig = {}
): Promise<{ blob: Blob; filename?: string }> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(auth, false),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    const message = error.message || error.error || response.statusText || "Request failed";
    handleUnauthorized(response, auth, message);
    handleLocked(response, message);
    if (config.notify !== false) {
      notify({ type: "error", message });
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  const filename = match ? match[1] : undefined;

  if (config.notify !== false) {
    notify({ type: "success", message: "Download ready." });
  }

  return { blob, filename };
};

export const requestForm = async <T>(
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
    const message = error.message || error.error || response.statusText || "Request failed";
    handleUnauthorized(response, auth, message);
    handleLocked(response, message);
    notify({ type: "error", message });
    throw new Error(message);
  }

  const data = (await response.json()) as T;
  notify({ type: "success", message: "Uploaded successfully." });
  return data;
};
