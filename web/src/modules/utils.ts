import type { DocumentPayload } from "../api";

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const moduleSettingsKey = (payload: DocumentPayload, moduleName: string) => {
  const moduleSlug = slug(moduleName) || "module";
  if (!payload.section) {
    const pageSlug = slug(payload.page) || "page";
    return `${pageSlug}-${moduleSlug}`;
  }
  const sectionSlug = slug(payload.name) || "section";
  return `${sectionSlug}-${moduleSlug}`;
};

export const legacyModuleSettingsKey = (moduleName: string) => slug(moduleName) || "module";
