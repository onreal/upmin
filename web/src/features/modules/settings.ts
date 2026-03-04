import { fetchDocument, type AuthState, type DocumentPayload } from "../../api";
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
