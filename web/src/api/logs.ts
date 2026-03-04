import type { AuthState, LogSummary } from "./types";
import { request } from "./client";

export const fetchLogs = (auth: AuthState) =>
  request<{ logs: LogSummary[] }>("/api/logs", { method: "GET" }, auth);
