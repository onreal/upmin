import type { AuthState, LayoutConfig, UiConfig } from "./types";
import { request } from "./client";

export const fetchUiConfig = (auth: AuthState) =>
  request<{ config: UiConfig }>("/api/ui-config", { method: "GET" }, auth);

export const fetchLayoutConfig = (auth: AuthState) =>
  request<{ config: LayoutConfig }>("/api/layout-config", { method: "GET" }, auth);
