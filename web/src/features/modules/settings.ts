import {
  createDocument,
  fetchDocument,
  type AuthState,
  type DocumentPayload,
  type ModuleDefinition,
  type RemoteDocument,
} from "../../api";
import { legacyModuleSettingsKey, moduleSettingsKey } from "../../modules/utils";
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
    if (!payload.section) {
      const legacyKey = legacyModuleSettingsKey(moduleName);
      if (legacyKey) {
        const legacyPath = `modules/${legacyKey}.json`;
        const legacyId = encodeDocumentId("private", legacyPath);
        try {
          const legacyDoc = await fetchDocument(auth, legacyId);
          const legacySettings = isRecord(legacyDoc.payload.data) ? legacyDoc.payload.data : null;
          cache.set(key, legacySettings);
          return legacySettings;
        } catch {
          // fall through
        }
      }
    }
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
    if (!payload.section) {
      const legacyKey = legacyModuleSettingsKey(module.name);
      if (legacyKey) {
        const legacyPath = `modules/${legacyKey}.json`;
        const legacyId = encodeDocumentId("private", legacyPath);
        try {
          const legacyDoc = await fetchDocument(auth, legacyId);
          const legacySettings = isRecord(legacyDoc.payload.data)
            ? (legacyDoc.payload.data as Record<string, unknown>)
            : null;
          cache.set(key, legacySettings);
          return legacyDoc;
        } catch {
          // fall through to create new
        }
      }
    }

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
