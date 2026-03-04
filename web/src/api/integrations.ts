import type { AuthState, IntegrationSettings, IntegrationSummary } from "./types";
import { request } from "./client";

export const fetchIntegrations = (auth: AuthState) =>
  request<{ integrations: IntegrationSummary[] }>(
    "/api/integrations",
    { method: "GET" },
    auth
  );

export const fetchIntegrationSettings = (auth: AuthState, name: string) =>
  request<{ settings: IntegrationSettings }>(
    `/api/integrations/${encodeURIComponent(name)}`,
    { method: "GET" },
    auth
  );

export const updateIntegrationSettings = (
  auth: AuthState,
  name: string,
  payload: Record<string, unknown>
) =>
  request<{ settings: IntegrationSettings }>(
    `/api/integrations/${encodeURIComponent(name)}`,
    { method: "PUT", body: JSON.stringify(payload) },
    auth
  );

export const syncIntegrationModels = (auth: AuthState, name: string) =>
  request<{ settings: IntegrationSettings }>(
    `/api/integrations/${encodeURIComponent(name)}/sync`,
    { method: "POST" },
    auth
  );
