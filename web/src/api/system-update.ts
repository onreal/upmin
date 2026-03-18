import type { AuthState, SystemUpdateStatus } from "./types";
import { request } from "./client";

export const fetchSystemUpdate = (auth: AuthState) =>
  request<{ update: SystemUpdateStatus }>("/api/system/update", { method: "GET" }, auth, { notify: false });

export const runSystemUpdate = (auth: AuthState) =>
  request<{ update: SystemUpdateStatus }>("/api/system/update/run", { method: "POST" }, auth, { notify: false });
