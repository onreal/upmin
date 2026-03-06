import type { AgentSummary, AuthState, DocumentPayload, ModuleDefinition, RemoteDocument } from "../api";
import type { JsonEditorHandle } from "../json-editor";
import { triggerDownload } from "../utils";
import { renderModuleSettingsForm, resolveModuleForSettings } from "../features/modules/settings-form";

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
        <span class="app-doc-meta-label">ID</span>
        <code class="app-doc-meta-value">${pageId}</code>
        <button class="app-doc-meta-copy" type="button" aria-label="Copy ID" data-copy-doc-id="${pageId}">
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

  const bindIdCopy = () => {
    document.querySelectorAll<HTMLButtonElement>("[data-copy-doc-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const value = button.getAttribute("data-copy-doc-id") || "";
        if (!value) {
          return;
        }
        try {
          await navigator.clipboard.writeText(value);
          button.classList.add("is-copied");
          window.setTimeout(() => button.classList.remove("is-copied"), 1200);
        } catch {
          button.classList.add("is-error");
          window.setTimeout(() => button.classList.remove("is-error"), 1200);
        }
      });
    });
  };

  if (isLogDocument) {
    renderLogDocument(doc);
    bindIdCopy();
    return;
  }

  if (isModuleSettings) {
    editorRef.set(null);
    const moduleDefinition = resolveModuleForSettings(modules, doc.path);
    content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">Module settings · ${doc.store}/${doc.path}</p>
        ${idMeta}
      </div>
      <div class="mb-4 buttons">
        ${
          returnToDocumentId
            ? `<button id="module-back" class="button app-button app-ghost">Back</button>`
            : ""
        }
        <button id="save" class="button app-button app-primary">Αποθήκευση</button>
        <button id="export-json" class="button app-button app-ghost">Export JSON</button>
      </div>
      <div class="mt-4">
        <h2 class="title is-5">Settings</h2>
        <div id="module-settings-form" class="app-module-settings-surface"></div>
      </div>
    `;

    const formContainer = document.getElementById("module-settings-form");
    const settingsForm = formContainer && moduleDefinition
      ? renderModuleSettingsForm({
          container: formContainer,
          module: moduleDefinition,
          settings: (typeof payload.data === "object" && payload.data !== null ? (payload.data as Record<string, unknown>) : null),
          agents,
        })
      : null;

    if (!moduleDefinition && formContainer) {
      formContainer.innerHTML = `<div class="notification is-light">Module definition not found.</div>`;
    }

    document.getElementById("module-back")?.addEventListener("click", () => {
      if (returnToDocumentId) {
        onReturnToDocument(returnToDocumentId);
      }
    });

    document.getElementById("save")?.addEventListener("click", async () => {
      if (!auth) {
        return;
      }

      const payloadToSave: DocumentPayload = {
        ...payload,
        type: payload.type ?? "module",
        data: settingsForm?.getValue() ?? payload.data,
      };

      try {
        const updated = await updateDocument(auth, doc.id, payloadToSave);
        onDocumentUpdated(updated);
        onModuleSettingsSaved();
        rerender(updated);
        await refreshNavigation();
      } catch (err) {
        alert((err as Error).message);
      }
    });

    document.getElementById("export-json")?.addEventListener("click", async () => {
      if (!auth) {
        return;
      }
      try {
        const result = await downloadDocument(auth, doc.id);
        const filename = result.filename ?? `${doc.path.split("/").pop() || "document"}.json`;
        triggerDownload(result.blob, filename);
      } catch (err) {
        alert((err as Error).message);
      }
    });

    bindIdCopy();
    return;
  }

  if (isSystemPage) {
    content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">${payload.page} · ${doc.store}/${doc.path}</p>
        ${idMeta}
      </div>
      ${
        isConfigurationPage
          ? `<div class="notification is-light app-muted">The admin path is fixed at <strong>/manage/</strong>.</div>`
          : ""
      }
      <div class="mb-4 buttons">
        <button id="save" class="button app-button app-primary">Αποθήκευση</button>
        <button id="export-json" class="button app-button app-ghost">Export JSON</button>
      </div>
      <div class="mt-4">
        <div id="module-panel" class="mb-4"></div>
        <h2 class="title is-5">Data</h2>
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
      if (!auth) {
        return;
      }
      try {
        const result = await downloadDocument(auth, doc.id);
        const filename = result.filename ?? `${doc.path.split("/").pop() || "document"}.json`;
        triggerDownload(result.blob, filename);
      } catch (err) {
        alert((err as Error).message);
      }
    });

    return;
  }

  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${payload.name}</h1>
      <p class="app-muted">${payload.page} · ${doc.store}/${doc.path}</p>
      ${idMeta}
    </div>
    <div class="mb-4 buttons">
      <button id="save" class="button app-button app-primary">Αποθήκευση</button>
      <button id="export-json" class="button app-button app-ghost">Export JSON</button>
    </div>
    <div class="columns is-variable is-4 is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label">Order</label>
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
          <label class="label">Page</label>
          <div class="control">
            <input id="field-page" class="input" type="text" value="${payload.page}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Name</label>
          <div class="control">
            <input id="field-name" class="input" type="text" value="${payload.name}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Language</label>
          <div class="control">
            <input id="field-language" class="input" type="text" value="${payload.language ?? ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Modules</label>
          <div class="control">
            <div id="field-modules" class="app-module-picker">
              ${moduleChecklistHtml(selectedModules)}
            </div>
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Section</label>
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
      <h2 class="title is-5">Data</h2>
      <div id="json-editor" class="json-editor"></div>
    </div>
  `;

  const editorContainer = document.getElementById("json-editor");
  if (editorContainer) {
    editorRef.set(buildJsonEditor(editorContainer, payload.data));
  }

  void renderModulePanel(doc);
  bindIdCopy();

  const moduleInput = document.getElementById("field-modules");
  moduleInput?.addEventListener("change", () => {
    payload.modules = readSelectedModules(moduleInput);
    void renderModulePanel(doc);
  });

  document.getElementById("save")?.addEventListener("click", async () => {
    if (!auth) {
      return;
    }

    const pageInput = document.getElementById("field-page") as HTMLInputElement | null;
    const nameInput = document.getElementById("field-name") as HTMLInputElement | null;
    const languageInput = document.getElementById("field-language") as HTMLInputElement | null;
    const sectionInput = document.getElementById("field-section") as HTMLSelectElement | null;
    const orderInput = document.getElementById("field-order") as HTMLInputElement | null;
    const moduleInput = document.getElementById("field-modules");

    const orderRaw = orderInput?.value.trim() || "";
    if (!orderRaw) {
      alert("Order is required.");
      return;
    }
    const parsedOrder = Number(orderRaw);
    if (!Number.isInteger(parsedOrder)) {
      alert("Order must be an integer.");
      return;
    }
    const orderValue = parsedOrder;

    const payloadToSave: DocumentPayload = {
      type: payload.type ?? "page",
      page: pageInput?.value.trim() || payload.page,
      name: nameInput?.value.trim() || payload.name,
      language: languageInput?.value.trim() || undefined,
      order: orderValue,
      section: sectionInput?.value === "true",
      modules: readSelectedModules(moduleInput),
      data: editorRef.get()?.getValue() ?? payload.data,
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
    if (!auth) {
      return;
    }
    try {
      const result = await downloadDocument(auth, doc.id);
      const filename = result.filename ?? `${doc.path.split("/").pop() || "document"}.json`;
      triggerDownload(result.blob, filename);
    } catch (err) {
      alert((err as Error).message);
    }
  });
};
