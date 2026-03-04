import type { ModuleDefinition } from "../../api";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const describeStorage = (module: ModuleDefinition) => {
  const parameters = module.parameters ?? {};
  if (!isRecord(parameters)) {
    return "";
  }
  const storage = parameters.storage;
  if (!isRecord(storage)) {
    return "";
  }
  const visibility = typeof storage.visibility === "string" ? storage.visibility : "public";
  const root = typeof storage.root === "string" ? storage.root : "media";
  const folder = typeof storage.folder === "string" && storage.folder ? `/${storage.folder}` : "";
  const location = `${root}${folder}`;
  return `Storage: ${visibility} · ${location}`;
};
