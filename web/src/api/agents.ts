import type {
  AgentConversationSummary,
  AgentSummary,
  AuthState,
  RemoteDocument,
} from "./types";
import { request } from "./client";

export const fetchAgents = (auth: AuthState) =>
  request<{ agents: AgentSummary[] }>(`/api/agents`, { method: "GET" }, auth, { notify: false });

export const fetchAgent = (auth: AuthState, id: string) =>
  request<RemoteDocument>(`/api/agents/${id}`, { method: "GET" }, auth, { notify: false });

export const createAgent = (
  auth: AuthState,
  payload: {
    store: "public" | "private";
    name: string;
    provider: string;
    model: string;
    systemPrompt: string;
    adminPrompt: string;
  }
) => request<RemoteDocument>(`/api/agents`, { method: "POST", body: JSON.stringify(payload) }, auth);

export const updateAgent = (
  auth: AuthState,
  id: string,
  payload: {
    name: string;
    provider: string;
    model: string;
    systemPrompt: string;
    adminPrompt: string;
  }
) =>
  request<RemoteDocument>(
    `/api/agents/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
    auth
  );

export const fetchAgentConversations = (auth: AuthState, id: string) =>
  request<{ conversations: AgentConversationSummary[] }>(
    `/api/agents/${id}/conversations`,
    { method: "GET" },
    auth,
    { notify: false }
  );

export const createAgentConversation = (auth: AuthState, id: string) =>
  request<RemoteDocument>(
    `/api/agents/${id}/conversations`,
    { method: "POST", body: JSON.stringify({}) },
    auth,
    { notify: false }
  );

export const fetchAgentConversation = (auth: AuthState, id: string) =>
  request<RemoteDocument>(`/api/agents/conversations/${id}`, { method: "GET" }, auth, {
    notify: false,
  });

export const appendAgentMessage = (auth: AuthState, id: string, content: string) =>
  request<RemoteDocument>(
    `/api/agents/conversations/${id}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
    auth,
    { notify: false }
  );
