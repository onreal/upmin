import { request } from "./client";
export const fetchAgents = (auth) => request(`/api/agents`, { method: "GET" }, auth);
export const fetchAgent = (auth, id) => request(`/api/agents/${id}`, { method: "GET" }, auth);
export const createAgent = (auth, payload) => request(`/api/agents`, { method: "POST", body: JSON.stringify(payload) }, auth);
export const updateAgent = (auth, id, payload) => request(`/api/agents/${id}`, { method: "PUT", body: JSON.stringify(payload) }, auth);
export const fetchAgentConversations = (auth, id) => request(`/api/agents/${id}/conversations`, { method: "GET" }, auth);
export const createAgentConversation = (auth, id) => request(`/api/agents/${id}/conversations`, { method: "POST", body: JSON.stringify({}) }, auth);
export const fetchAgentConversation = (auth, id) => request(`/api/agents/conversations/${id}`, { method: "GET" }, auth);
export const appendAgentMessage = (auth, id, content) => request(`/api/agents/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }, auth);
