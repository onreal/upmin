import { request } from "./client";
export const fetchLogs = (auth) => request("/api/logs", { method: "GET" }, auth);
