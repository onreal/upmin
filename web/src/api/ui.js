import { request } from "./client";
export const fetchUiConfig = (auth) => request("/api/ui-config", { method: "GET" }, auth);
export const fetchLayoutConfig = (auth) => request("/api/layout-config", { method: "GET" }, auth);
