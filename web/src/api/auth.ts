import type { AuthUser } from "./types";
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
