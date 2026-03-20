import type { AuthUser, AuthState, UserApiKeySummary } from "./types";
import { request } from "./client";

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

export const requestDelegatedLoginGrant = (apiKey: string) =>
  request<{ grant: string; expiresAt: string }>(
    "/api/auth/delegated-login/request",
    {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    },
    null,
    { notify: false }
  );

export const exchangeDelegatedLoginGrant = (grant: string) =>
  request<{ token: string; user: AuthUser }>(
    "/api/auth/delegated-login/exchange",
    {
      method: "POST",
      body: JSON.stringify({ grant }),
    },
    null,
    { notify: false }
  );

export const listUserApiKeys = (auth: AuthState) =>
  request<{ items: UserApiKeySummary[] }>("/api/auth/api-keys", { method: "GET" }, auth, { notify: false });

export const createUserApiKey = (auth: AuthState, payload: { name: string; expiry: string }) =>
  request<UserApiKeySummary & { key: string }>(
    "/api/auth/api-keys",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    auth
  );

export const deleteUserApiKey = (auth: AuthState, id: string) =>
  request<{ ok: boolean }>(`/api/auth/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" }, auth);
