import type { AuthState, WebsiteBuildActionResponse } from "./types";
import { request } from "./client";

export const publishWebsiteBuild = (auth: AuthState) =>
  request<WebsiteBuildActionResponse>("/api/website-build/publish", { method: "POST" }, auth);

export const cleanWebsiteBuild = (auth: AuthState) =>
  request<WebsiteBuildActionResponse>("/api/website-build/clean", { method: "POST" }, auth);
