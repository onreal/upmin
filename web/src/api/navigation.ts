import type { AuthState, NavigationPageGroup } from "./types";
import { request } from "./client";

export const fetchNavigation = (auth: AuthState) =>
  request<{ pages: NavigationPageGroup[]; defaultLanguage?: string | null }>(
    "/api/navigation",
    { method: "GET" },
    auth
  );
