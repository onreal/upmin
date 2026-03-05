import { request, requestAsset } from "./client";
export const createCreationSnapshot = (auth, snapshot) => request("/api/creations/snapshot", { method: "POST", body: JSON.stringify({ snapshot }) }, auth);
export const clearWebsiteWithSnapshot = (auth, snapshot) => request("/api/creations/clear", { method: "POST", body: JSON.stringify({ snapshot }) }, auth);
export const restoreCreationSnapshot = (auth, id) => request(`/api/creations/${id}/restore`, { method: "POST" }, auth);
export const deleteCreationSnapshot = (auth, id) => request(`/api/creations/${id}`, { method: "DELETE" }, auth);
export const downloadCreationSnapshot = (auth, id) => requestAsset(`/api/creations/${id}/download`, { method: "GET" }, auth);
export const fetchCreationSnapshotImage = (auth, id) => requestAsset(`/api/creations/${id}/image`, { method: "GET" }, auth, { notify: false });
