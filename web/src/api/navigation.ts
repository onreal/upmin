import type { AuthState, NavigationPage } from "./types";
import { request } from "./client";

export const fetchNavigation = (auth: AuthState) =>
  request<{ pages: NavigationPage[] }>("/api/navigation", { method: "GET" }, auth);
