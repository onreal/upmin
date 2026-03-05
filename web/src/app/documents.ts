import { downloadDocument, fetchDocument, updateDocument, type RemoteDocument } from "../api";
import { buildJsonEditor } from "../json-editor";
import { renderLogDocument } from "../views/logs";
import { renderDocument } from "../views/documents";
import { renderModulePanel } from "../views/modules";
import { state, editorRef } from "./state";
import {
  moduleChecklistHtml as buildModuleChecklistHtml,
  normalizeModuleList,
  readSelectedModules,
  findModuleDefinition as findDefinition,
} from "../features/modules/helpers";
import { ensureModuleSettingsDocument, fetchModuleSettings } from "../features/modules/settings";
import { clearAgentState } from "../features/agents/state";
import { encodeDocumentId } from "../utils";
import { refreshNavigation } from "./loaders";

export const openLoggerSettings = () => {
  if (!state.auth) {
    return;
  }
  const id = encodeDocumentId("private", "logs/logger-settings.json");
  void loadDocument(id);
};

export const renderDocumentView = (doc: RemoteDocument) => {
  const content = document.getElementById("content");
  renderDocument({
    content,
    auth: state.auth,
    modules: state.modules,
    agents: state.agents,
    doc,
    clearAgentState,
    moduleChecklistHtml: (selected) => buildModuleChecklistHtml(state.modules, selected),
    readSelectedModules,
    normalizeModuleList,
    buildJsonEditor,
    editorRef,
    updateDocument,
    downloadDocument,
    refreshNavigation: () => refreshNavigation(loadDocument),
    renderModulePanel: (moduleDoc) =>
      renderModulePanel({
        auth: state.auth,
        doc: moduleDoc,
        editor: editorRef.get(),
        normalizeModuleList,
        fetchModuleSettings: (moduleName, payload) =>
          fetchModuleSettings(state.auth, payload, moduleName, state.moduleSettingsCache),
        findModuleDefinition: (name) => findDefinition(state.modules, name),
        ensureModuleSettingsDocument: (module, payload) =>
          ensureModuleSettingsDocument(state.auth, payload, module, state.moduleSettingsCache),
        openModuleSettings: (settingsId) => {
          if (!moduleDoc?.id) {
            return;
          }
          state.returnToDocumentId = moduleDoc.id;
          loadDocument(settingsId);
        },
      }),
    renderLogDocument: (logDoc) =>
      renderLogDocument({
        content,
        auth: state.auth,
        doc: logDoc,
        logs: state.logs,
        loadDocument,
        openLoggerSettings,
        downloadDocument,
      }),
    onDocumentUpdated: (updated) => {
      state.currentDocument = updated;
    },
    onModuleSettingsSaved: () => {
      state.moduleSettingsCache.clear();
    },
    returnToDocumentId: state.returnToDocumentId,
    onReturnToDocument: (id) => {
      state.returnToDocumentId = null;
      loadDocument(id);
    },
    rerender: (updated) => {
      renderDocumentView(updated);
    },
  });
};

export const loadDocument = async (id: string) => {
  if (!state.auth) {
    return;
  }
  try {
    const doc = await fetchDocument(state.auth, id);
    state.currentDocument = doc;
    if (!(doc.store === "private" && doc.payload.page === "modules")) {
      state.returnToDocumentId = null;
    }
    if (doc.store === "private" && doc.path.startsWith("logs/") && !state.logs.length) {
      try {
        const { fetchLogs } = await import("../api");
        const response = await fetchLogs(state.auth);
        state.logs = Array.isArray(response.logs) ? response.logs : [];
      } catch {
        // ignore log list failures
      }
    }
    renderDocumentView(doc);
  } catch (err) {
    alert((err as Error).message);
  }
};
