import type { AuthState, FormSummary } from "./types";
import { request } from "./client";

export const fetchForms = (auth: AuthState) =>
  request<{ forms: FormSummary[] }>("/api/forms", { method: "GET" }, auth);
