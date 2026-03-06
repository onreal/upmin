import {
  createDocument,
  fetchDocument,
  type AuthState,
  type DocumentPayload,
  type ModuleDefinition,
  type RemoteDocument,
} from "../../api";
import { moduleSettingsKey } from "../../modules/utils";
import { encodeDocumentId, isRecord } from "../../utils";

export const fetchModuleSettings = async (
  auth: AuthState | null,
  payload: DocumentPayload,
  moduleName: string,
  cache: Map<string, Record<string, unknown> | null>
) => {
  if (!auth) {
    return null;
  }
  const key = moduleSettingsKey(payload, moduleName);
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }
  const path = `modules/${key}.json`;
  const id = encodeDocumentId("private", path);
  try {
    const doc = await fetchDocument(auth, id);
    const settings = isRecord(doc.payload.data) ? doc.payload.data : null;
    cache.set(key, settings);
    return settings;
  } catch {
    cache.set(key, null);
    return null;
  }
};

export const ensureModuleSettingsDocument = async (
  auth: AuthState | null,
  payload: DocumentPayload,
  module: ModuleDefinition,
  cache: Map<string, Record<string, unknown> | null>
): Promise<RemoteDocument> => {
  if (!auth) {
    throw new Error("Authentication required.");
  }
  const key = moduleSettingsKey(payload, module.name);
  const path = `modules/${key}.json`;
  const id = encodeDocumentId("private", path);

  try {
    const doc = await fetchDocument(auth, id);
    const settings = isRecord(doc.payload.data) ? (doc.payload.data as Record<string, unknown>) : null;
    cache.set(key, settings);
    return doc;
  } catch {
    const defaults = isRecord(module.parameters) ? (module.parameters as Record<string, unknown>) : {};
    const name = `${payload.name} · ${module.name}`;
    const created = await createDocument(auth, {
      store: "private",
      path,
      payload: {
        type: "module",
        page: "modules",
        name,
        order: 1,
        section: true,
        data: defaults,
      },
    });
    const createdSettings = isRecord(created.payload.data)
      ? (created.payload.data as Record<string, unknown>)
      : null;
    cache.set(key, createdSettings);
    return created;
  }
};
