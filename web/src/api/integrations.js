import { request } from "./client";
export const fetchIntegrations = (auth) => request("/api/integrations", { method: "GET" }, auth);
export const fetchIntegrationSettings = (auth, name) => request(`/api/integrations/${encodeURIComponent(name)}`, { method: "GET" }, auth);
export const updateIntegrationSettings = (auth, name, payload) => request(`/api/integrations/${encodeURIComponent(name)}`, { method: "PUT", body: JSON.stringify(payload) }, auth);
export const syncIntegrationModels = (auth, name) => request(`/api/integrations/${encodeURIComponent(name)}/sync`, { method: "POST" }, auth);
