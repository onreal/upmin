import type { AuthState, CreationActionResponse } from "./types";
import { request, requestAsset } from "./client";

export const createCreationSnapshot = (auth: AuthState, snapshot: string) =>
  request<CreationActionResponse>(
    "/api/creations/snapshot",
    { method: "POST", body: JSON.stringify({ snapshot }) },
    auth
  );

export const clearWebsiteWithSnapshot = (auth: AuthState, snapshot: string) =>
  request<CreationActionResponse>(
    "/api/creations/clear",
    { method: "POST", body: JSON.stringify({ snapshot }) },
    auth
  );

export const restoreCreationSnapshot = (auth: AuthState, id: string) =>
  request<CreationActionResponse>(`/api/creations/${id}/restore`, { method: "POST" }, auth);

export const deleteCreationSnapshot = (auth: AuthState, id: string) =>
  request<CreationActionResponse>(`/api/creations/${id}`, { method: "DELETE" }, auth);

export const downloadCreationSnapshot = (auth: AuthState, id: string) =>
  requestAsset(`/api/creations/${id}/download`, { method: "GET" }, auth);

export const fetchCreationSnapshotImage = (auth: AuthState, id: string) =>
  requestAsset(`/api/creations/${id}/image`, { method: "GET" }, auth, { notify: false });
