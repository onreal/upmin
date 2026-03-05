import type { AuthState } from "./types";
import { request } from "./client";

export type RealtimeTicket = {
  url: string;
  ticket: string;
  expiresAt: string;
};

export const fetchRealtimeTicket = (auth: AuthState) =>
  request<RealtimeTicket>("/api/realtime/ticket", { method: "GET" }, auth, { notify: false });
