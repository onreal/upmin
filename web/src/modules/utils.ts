import type { DocumentPayload } from "../api";

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export const moduleSettingsKey = (payload: DocumentPayload, moduleName: string) => {
  const moduleSlug = slug(moduleName) || "module";
  const docId = typeof payload.id === "string" ? payload.id.trim().toLowerCase() : "";
  if (!docId || !isUuid(docId)) {
    throw new Error("Document id is required for module settings.");
  }
  return `${docId}-${moduleSlug}`;
};
