import type { AuthState, DocumentPayload, RemoteDocument } from "./types";
import { request, requestBlob } from "./client";

export const fetchDocument = (auth: AuthState, id: string) =>
  request<RemoteDocument>(`/api/documents/${id}`, { method: "GET" }, auth);

export const updateDocument = (auth: AuthState, id: string, payload: DocumentPayload) =>
  request<RemoteDocument>(`/api/documents/${id}`, { method: "PUT", body: JSON.stringify(payload) }, auth);

export const createDocument = (
  auth: AuthState,
  requestPayload: { store: "public" | "private"; path: string; payload: DocumentPayload }
) =>
  request<RemoteDocument>(
    `/api/documents`,
    { method: "POST", body: JSON.stringify(requestPayload) },
    auth
  );

export const downloadDocument = (auth: AuthState, id: string) =>
  requestBlob(`/api/documents/${id}/export`, { method: "GET" }, auth);

export const downloadArchive = (auth: AuthState) =>
  requestBlob(`/api/export.tar.gz`, { method: "GET" }, auth);
