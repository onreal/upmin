import type { AuthState, WebsiteBuildActionResponse } from "./types";
import { request } from "./client";

export const publishWebsiteBuild = (auth: AuthState) =>
  request<WebsiteBuildActionResponse>("/api/website-build/publish", { method: "POST" }, auth);

export const cleanWebsiteBuild = (auth: AuthState, snapshot: string) =>
  request<WebsiteBuildActionResponse>(
    "/api/website-build/clean",
    { method: "POST", body: JSON.stringify({ snapshot }) },
    auth
  );

export const copyWebsiteBuildFromPublic = (auth: AuthState, snapshot: string) =>
  request<WebsiteBuildActionResponse>(
    "/api/website-build/copy-public",
    { method: "POST", body: JSON.stringify({ snapshot }) },
    auth
  );
