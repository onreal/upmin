import type { AgentSummary, AuthState, DocumentPayload, ModuleDefinition, RemoteDocument } from "../api";
import type { JsonEditorHandle } from "../json-editor";
import {
  bindDocumentIdCopy,
  bindDocumentLanguageSelect,
  buildEditableDocumentPayload,
  exportDocumentJson,
} from "./document-actions";
import { renderModuleSettingsView } from "./module-settings-view";
import { adminText } from "../app/translations";

export type DocumentEditorRef = {
  get: () => JsonEditorHandle | null;
  set: (editor: JsonEditorHandle | null) => void;
};

export type DocumentViewContext = {
  content: HTMLElement | null;
  auth: AuthState | null;
  modules: ModuleDefinition[];
  agents: AgentSummary[];
  doc: RemoteDocument;
  languageOptions?: {
    currentLanguage: string | null;
    options: Array<{ id: string; label: string; language: string | null }>;
    onSelect: (id: string, language: string | null) => void;
  } | null;
  clearAgentState: () => void;
  moduleChecklistHtml: (selected?: string[]) => string;
  readSelectedModules: (container: HTMLElement | null) => string[];
  normalizeModuleList: (modulesValue?: string[] | null, fallback?: string | null) => string[];
  buildJsonEditor: (container: HTMLElement, data: unknown) => JsonEditorHandle;
  editorRef: DocumentEditorRef;
  updateDocument: (auth: AuthState, id: string, payload: DocumentPayload) => Promise<RemoteDocument>;
  downloadDocument: (auth: AuthState, id: string) => Promise<{ blob: Blob; filename?: string }>;
  refreshNavigation: () => Promise<void>;
  renderModulePanel: (doc: RemoteDocument) => Promise<void>;
  renderLogDocument: (doc: RemoteDocument) => void;
  onDocumentUpdated: (doc: RemoteDocument) => void;
  onModuleSettingsSaved: () => void;
  returnToDocumentId: string | null;
  onReturnToDocument: (id: string) => void;
  rerender: (doc: RemoteDocument) => void;
};

export const renderDocument = ({
  content,
  auth,
  modules,
  agents,
  doc,
  languageOptions,
  clearAgentState,
  moduleChecklistHtml,
  readSelectedModules,
  normalizeModuleList,
  buildJsonEditor,
  editorRef,
  updateDocument,
  downloadDocument,
  refreshNavigation,
  renderModulePanel,
  renderLogDocument,
  onDocumentUpdated,
  onModuleSettingsSaved,
  returnToDocumentId,
  onReturnToDocument,
  rerender,
}: DocumentViewContext) => {
  if (!content) {
    return;
  }

  clearAgentState();

  const payload = doc.payload;
  const selectedModules = normalizeModuleList(payload.modules, payload.module ?? null);
  const isModuleSettings = payload.page === "modules" && doc.store === "private";
  const isLogSettings = doc.store === "private" && doc.path === "logs/logger-settings.json";
  const isLogDocument = doc.store === "private" && doc.path.startsWith("logs/") && !isLogSettings;
  const isSystemPage = doc.store === "private" && payload.position === "system";
  const isConfigurationPage = doc.store === "private" && doc.path === "system/configuration.json";
  const pageId = typeof payload.id === "string" && payload.id.trim() !== "" ? payload.id : null;
  const idMeta = pageId
    ? `
      <div class="app-doc-meta">
        <span class="app-doc-meta-label">${adminText("documents.id", "ID")}</span>
        <code class="app-doc-meta-value">${pageId}</code>
        <button class="app-doc-meta-copy" type="button" aria-label="${adminText("documents.copyId", "Copy ID")}" data-copy-doc-id="${pageId}">
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true">
              <rect x="9" y="9" width="10" height="10" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect>
              <rect x="5" y="5" width="10" height="10" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect>
            </svg>
          </span>
        </button>
      </div>
    `
    : "";

  const languageMeta = languageOptions && languageOptions.options.length > 1
    ? `
      <div class="field app-doc-language">
        <label class="label">${adminText("documents.language", "Language")}</label>
        <div class="control">
          <div class="select">
            <select id="doc-language-select">
              ${languageOptions.options
                .map((option) => {
                  const selected = option.language === languageOptions.currentLanguage ? "selected" : "";
                  return `<option value="${option.id}" ${selected}>${option.label}</option>`;
                })
                .join("")}
            </select>
          </div>
        </div>
      </div>
    `
    : "";

  if (isLogDocument) {
    renderLogDocument(doc);
    bindDocumentIdCopy();
    return;
  }

  if (isModuleSettings) {
    editorRef.set(null);
    renderModuleSettingsView({
      content,
      auth,
      modules,
      agents,
      doc,
      idMeta,
      languageMeta,
      languageOptions,
      returnToDocumentId,
      onReturnToDocument,
      updateDocument,
      onDocumentUpdated,
      onModuleSettingsSaved,
      rerender,
      refreshNavigation,
      downloadDocument,
    });
    return;
  }

  if (isSystemPage) {
    content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">${payload.page} · ${doc.store}/${doc.path}</p>
        ${idMeta}
        ${languageMeta}
      </div>
      ${
        isConfigurationPage
          ? `<div class="notification is-light app-muted">${adminText("documents.fixedAdminPath", "The admin path is fixed at <strong>/upmin/</strong>.")}</div>`
          : ""
      }
      <div class="mb-4 buttons">
        <button id="save" class="button app-button app-primary">${adminText("common.save", "Save")}</button>
        <button id="export-json" class="button app-button app-ghost">${adminText("documents.exportJson", "Export JSON")}</button>
      </div>
      <div class="mt-4">
        <div id="module-panel" class="mb-4"></div>
        <h2 class="title is-5">${adminText("documents.data", "Data")}</h2>
        <div id="json-editor" class="json-editor"></div>
      </div>
    `;

    const editorContainer = document.getElementById("json-editor");
    if (editorContainer) {
      editorRef.set(buildJsonEditor(editorContainer, payload.data));
    }

    const modulePanel = document.getElementById("module-panel");
    if (modulePanel && selectedModules.length > 0) {
      void renderModulePanel(doc);
    }

    document.getElementById("save")?.addEventListener("click", async () => {
      if (!auth) {
        return;
      }
      const editor = editorRef.get();
      const payloadToSave: DocumentPayload = {
        ...payload,
        data: editor ? editor.getValue() : payload.data,
      };
      try {
        const updated = await updateDocument(auth, doc.id, payloadToSave);
        onDocumentUpdated(updated);
        rerender(updated);
        await refreshNavigation();
      } catch (err) {
        alert((err as Error).message);
      }
    });

    document.getElementById("export-json")?.addEventListener("click", async () => {
      try {
        await exportDocumentJson(auth, doc, downloadDocument);
      } catch (err) {
        alert((err as Error).message);
      }
    });

    bindDocumentIdCopy();
    bindDocumentLanguageSelect(languageOptions);

    return;
  }

  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${payload.name}</h1>
      <p class="app-muted">${payload.page} · ${doc.store}/${doc.path}</p>
      ${idMeta}
      ${languageMeta}
    </div>
    <div class="mb-4 buttons">
      <button id="save" class="button app-button app-primary">${adminText("common.save", "Save")}</button>
      <button id="export-json" class="button app-button app-ghost">${adminText("documents.exportJson", "Export JSON")}</button>
    </div>
    <div class="columns is-variable is-4 is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.order", "Order")}</label>
          <div class="control">
            <input
              id="field-order"
              class="input"
              type="number"
              min="0"
              step="1"
              value="${payload.order}"
            />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.page", "Page")}</label>
          <div class="control">
            <input id="field-page" class="input" type="text" value="${payload.page}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.name", "Name")}</label>
          <div class="control">
            <input id="field-name" class="input" type="text" value="${payload.name}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.language", "Language")}</label>
          <div class="control">
            <input id="field-language" class="input" type="text" value="${payload.language ?? ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.modules", "Modules")}</label>
          <div class="control">
            <div id="field-modules" class="app-module-picker">
              ${moduleChecklistHtml(selectedModules)}
            </div>
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.section", "Section")}</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select id="field-section">
                <option value="false" ${payload.section ? "" : "selected"}>false</option>
                <option value="true" ${payload.section ? "selected" : ""}>true</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <div id="module-panel" class="mb-4"></div>
      <h2 class="title is-5">${adminText("documents.data", "Data")}</h2>
      <div id="json-editor" class="json-editor"></div>
    </div>
  `;

  const editorContainer = document.getElementById("json-editor");
  if (editorContainer) {
    editorRef.set(buildJsonEditor(editorContainer, payload.data));
  }

  void renderModulePanel(doc);
  bindDocumentIdCopy();
  bindDocumentLanguageSelect(languageOptions);

  const moduleInput = document.getElementById("field-modules");
  const saveButton = document.getElementById("save") as HTMLButtonElement | null;
  let isAutoSavingModules = false;

  const setModuleInputsDisabled = (disabled: boolean) => {
    moduleInput?.querySelectorAll<HTMLInputElement>("input[type='checkbox']").forEach((input) => {
      input.disabled = disabled;
    });
    if (saveButton) {
      saveButton.disabled = disabled;
    }
  };

  const saveEditableDocument = async (modulesOverride?: string[]) => {
    if (!auth) {
      return false;
    }
    const built = buildEditableDocumentPayload({
      payload,
      readSelectedModules,
      editor: editorRef.get(),
      modulesOverride,
    });
    if ("error" in built) {
      alert(built.error);
      return false;
    }

    try {
      setModuleInputsDisabled(true);
      const updated = await updateDocument(auth, doc.id, built.payload);
      onDocumentUpdated(updated);
      rerender(updated);
      await refreshNavigation();
      return true;
    } catch (err) {
      alert((err as Error).message);
      return false;
    } finally {
      setModuleInputsDisabled(false);
    }
  };

  moduleInput?.addEventListener("change", () => {
    if (isAutoSavingModules) {
      return;
    }
    isAutoSavingModules = true;
    const selectedModules = readSelectedModules(moduleInput);
    void saveEditableDocument(selectedModules).finally(() => {
      isAutoSavingModules = false;
    });
  });

  saveButton?.addEventListener("click", async () => {
    void saveEditableDocument();
  });

  document.getElementById("export-json")?.addEventListener("click", async () => {
    try {
      await exportDocumentJson(auth, doc, downloadDocument);
    } catch (err) {
      alert((err as Error).message);
    }
  });
};
