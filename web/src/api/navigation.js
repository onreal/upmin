import { request } from "./client";
export const fetchNavigation = (auth) => request("/api/navigation", { method: "GET" }, auth);
