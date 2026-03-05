import { triggerDownload } from "../utils";
import { renderModuleSettingsForm, resolveModuleForSettings } from "../features/modules/settings-form";
export const renderDocument = ({ content, auth, modules, agents, doc, clearAgentState, moduleChecklistHtml, readSelectedModules, normalizeModuleList, buildJsonEditor, editorRef, updateDocument, downloadDocument, refreshNavigation, renderModulePanel, renderLogDocument, onDocumentUpdated, onModuleSettingsSaved, returnToDocumentId, onReturnToDocument, rerender, }) => {
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
    if (isLogDocument) {
        renderLogDocument(doc);
        return;
    }
    if (isModuleSettings) {
        editorRef.set(null);
        const moduleDefinition = resolveModuleForSettings(modules, doc.path);
        content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">Module settings · ${doc.store}/${doc.path}</p>
      </div>
      <div class="mb-4 buttons">
        ${returnToDocumentId
            ? `<button id="module-back" class="button app-button app-ghost">Back</button>`
            : ""}
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
                settings: (typeof payload.data === "object" && payload.data !== null ? payload.data : null),
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
            const payloadToSave = {
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
            }
            catch (err) {
                alert(err.message);
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
            }
            catch (err) {
                alert(err.message);
            }
        });
        return;
    }
    if (isSystemPage) {
        const adminPath = typeof payload.data === "object" &&
            payload.data !== null &&
            "adminPath" in payload.data &&
            typeof payload.data.adminPath === "string"
            ? (payload.data.adminPath ?? "")
            : "";
        content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">${payload.page} · ${doc.store}/${doc.path}</p>
      </div>
      ${isConfigurationPage
            ? `<div class="notification is-light app-muted">After saving, open <strong>/${adminPath || "manage"}/</strong>.</div>`
            : ""}
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
            const payloadToSave = {
                ...payload,
                data: editor ? editor.getValue() : payload.data,
            };
            try {
                const updated = await updateDocument(auth, doc.id, payloadToSave);
                onDocumentUpdated(updated);
                rerender(updated);
                await refreshNavigation();
            }
            catch (err) {
                alert(err.message);
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
            }
            catch (err) {
                alert(err.message);
            }
        });
        return;
    }
    content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${payload.name}</h1>
      <p class="app-muted">${payload.page} · ${doc.store}/${doc.path}</p>
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
    const moduleInput = document.getElementById("field-modules");
    moduleInput?.addEventListener("change", () => {
        payload.modules = readSelectedModules(moduleInput);
        void renderModulePanel(doc);
    });
    document.getElementById("save")?.addEventListener("click", async () => {
        if (!auth) {
            return;
        }
        const pageInput = document.getElementById("field-page");
        const nameInput = document.getElementById("field-name");
        const languageInput = document.getElementById("field-language");
        const sectionInput = document.getElementById("field-section");
        const orderInput = document.getElementById("field-order");
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
        const payloadToSave = {
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
        }
        catch (err) {
            alert(err.message);
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
        }
        catch (err) {
            alert(err.message);
        }
    });
};
