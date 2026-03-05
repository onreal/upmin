import { request, requestBlob } from "./client";
export const fetchDocument = (auth, id) => request(`/api/documents/${id}`, { method: "GET" }, auth);
export const updateDocument = (auth, id, payload) => request(`/api/documents/${id}`, { method: "PUT", body: JSON.stringify(payload) }, auth);
export const createDocument = (auth, requestPayload) => request(`/api/documents`, { method: "POST", body: JSON.stringify(requestPayload) }, auth);
export const downloadDocument = (auth, id) => requestBlob(`/api/documents/${id}/export`, { method: "GET" }, auth);
export const downloadArchive = (auth) => requestBlob(`/api/export.tar.gz`, { method: "GET" }, auth);
