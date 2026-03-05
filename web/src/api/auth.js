import { request } from "./client";
export const loginWithApiKey = (apiKey) => request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
}, null);
export const loginWithPassword = (email, password) => request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
}, null);
