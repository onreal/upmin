import type { AuthState, DocumentPayload, ModuleDefinition, NavigationPage, RemoteDocument } from "../api";
import type { JsonEditorHandle } from "../json-editor";
import { renderModule } from "../modules/registry";
import { describeStorage } from "../modules/uploader/utils";

export type ModulePanelContext = {
  auth: AuthState | null;
  doc: RemoteDocument;
  editor: JsonEditorHandle | null;
  normalizeModuleList: (modulesValue?: string[] | null, fallback?: string | null) => string[];
  fetchModuleSettings: (moduleName: string, payload: DocumentPayload) => Promise<Record<string, unknown> | null>;
  findModuleDefinition: (name: string | null | undefined) => ModuleDefinition | null;
};

export const renderModulePanel = async ({
  auth,
  doc,
  editor,
  normalizeModuleList,
  fetchModuleSettings,
  findModuleDefinition,
}: ModulePanelContext) => {
  const panel = document.getElementById("module-panel");
  if (!panel) {
    return;
  }

  panel.innerHTML = "";
  const moduleNames = normalizeModuleList(doc.payload.modules, doc.payload.module ?? null);
  if (!moduleNames.length) {
    panel.classList.add("is-hidden");
    return;
  }

  panel.classList.remove("is-hidden");
  const moduleSettingsList = await Promise.all(
    moduleNames.map(async (moduleName) => ({
      name: moduleName,
      settings: await fetchModuleSettings(moduleName, doc.payload),
    }))
  );

  moduleSettingsList.forEach(({ name: moduleName, settings }) => {
    const module = findModuleDefinition(moduleName);
    if (!module) {
      const notice = document.createElement("div");
      notice.className = "notification is-warning is-light";
      notice.textContent = `Module "${moduleName}" was not found.`;
      panel.append(notice);
      return;
    }

    const handled = renderModule(module.name, panel, {
      auth,
      module,
      payload: doc.payload,
      editor,
      settings,
    });

    if (!handled) {
      const placeholder = document.createElement("div");
      placeholder.className = "notification is-light";
      placeholder.textContent = `${module.name} module is available but has no renderer yet.`;
      panel.append(placeholder);
    }
  });
};

export type ModulesViewContext = {
  content: HTMLElement | null;
  modules: ModuleDefinition[];
  navigationPages: NavigationPage[];
  clearAgentState: () => void;
  loadDocument: (id: string) => void;
};

export const renderModulesView = ({
  content,
  modules,
  navigationPages,
  clearAgentState,
  loadDocument,
}: ModulesViewContext) => {
  if (!content) {
    return;
  }
  clearAgentState();

  const list = modules
    .map((module) => {
      const author = module.author ? ` · ${module.author}` : "";
      const storage = describeStorage(module);
      const storageLine = storage ? `<div class="app-module-row-meta">${storage}</div>` : "";
      return `
        <div class="app-module-row">
          <div class="app-module-row-title">${module.name}</div>
          <div class="app-module-row-meta">${module.description}${author}</div>
          <div class="app-module-row-meta">Input: ${module.input} · Output: ${module.output}</div>
          ${storageLine}
        </div>
      `;
    })
    .join("");

  const settingsDocs = navigationPages
    .filter((page) => page.page === "modules")
    .flatMap((page) => page.sections)
    .filter((section) => section.store === "private")
    .map((section) => ({
      id: section.id,
      name: section.name,
      path: section.path,
    }));

  const settingsList = settingsDocs
    .map(
      (doc) => `
        <div class="app-module-row">
          <div class="app-module-row-title">${doc.name}</div>
          <div class="app-module-row-meta">${doc.path}</div>
          <div class="buttons">
            <button
              class="button app-button app-ghost app-icon-button"
              aria-label="Open settings"
              title="Open settings"
              data-module-settings="${encodeURIComponent(doc.id)}"
            >
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
                  <path
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  ></path>
                  <path
                    d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  ></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
      `
    )
    .join("");

  const settingsSection = `
    <div id="module-settings-panel" class="app-module-settings is-hidden">
      <div class="mb-3">
        <h2 class="title is-5">Settings</h2>
        <p class="app-muted">Edit per-page or per-section module settings saved in manage/store/modules.</p>
      </div>
      ${
        settingsDocs.length
          ? `<div class="app-module-list">${settingsList}</div>`
          : `<div class="notification is-light">No module settings found yet.</div>`
      }
    </div>
  `;

  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">Modules</h1>
        <p class="app-muted">Available modules loaded from manage/src/Modules.</p>
      </div>
      <div class="app-view-actions">
        <button
          id="module-settings-toggle"
          class="button app-button app-ghost app-icon-button"
          aria-label="Module settings"
          title="Module settings"
        >
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              ></path>
              <path
                d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              ></path>
            </svg>
          </span>
        </button>
      </div>
    </div>
    ${modules.length ? `<div class="app-module-list">${list}</div>` : `<div class="notification is-light">No modules found.</div>`}
    ${settingsSection}
  `;

  const toggle = document.getElementById("module-settings-toggle");
  const panel = document.getElementById("module-settings-panel");
  toggle?.addEventListener("click", () => {
    panel?.classList.toggle("is-hidden");
  });

  document.querySelectorAll<HTMLButtonElement>("[data-module-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      const encoded = button.getAttribute("data-module-settings") || "";
      const id = decodeURIComponent(encoded);
      if (id) {
        loadDocument(id);
      }
    });
  });
};
