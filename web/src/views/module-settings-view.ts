import type { AgentSummary, AuthState, DocumentPayload, ModuleDefinition, RemoteDocument } from "../api";
import { renderModuleSettingsForm, resolveModuleForSettings } from "../features/modules/settings-form";
import {
  bindDocumentIdCopy,
  bindDocumentLanguageSelect,
  exportDocumentJson,
} from "./document-actions";
import { adminText } from "../app/translations";

type ModuleSettingsViewContext = {
  content: HTMLElement;
  auth: AuthState | null;
  modules: ModuleDefinition[];
  agents: AgentSummary[];
  doc: RemoteDocument;
  idMeta: string;
  languageMeta: string;
  languageOptions?: {
    currentLanguage: string | null;
    options: Array<{ id: string; label: string; language: string | null }>;
    onSelect: (id: string, language: string | null) => void;
  } | null;
  returnToDocumentId: string | null;
  onReturnToDocument: (id: string) => void;
  updateDocument: (auth: AuthState, id: string, payload: DocumentPayload) => Promise<RemoteDocument>;
  onDocumentUpdated: (doc: RemoteDocument) => void;
  onModuleSettingsSaved: () => void;
  rerender: (doc: RemoteDocument) => void;
  refreshNavigation: () => Promise<void>;
  downloadDocument: (auth: AuthState, id: string) => Promise<{ blob: Blob; filename?: string }>;
};

export const renderModuleSettingsView = ({
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
}: ModuleSettingsViewContext) => {
  const payload = doc.payload;
  const moduleDefinition = resolveModuleForSettings(modules, doc.path);

  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${payload.name}</h1>
      <p class="app-muted">${adminText("documents.moduleSettingsMeta", "Module settings")} · ${doc.store}/${doc.path}</p>
      ${idMeta}
      ${languageMeta}
    </div>
    <div class="mb-4 buttons">
      ${
        returnToDocumentId
          ? `<button id="module-back" class="button app-button app-ghost">${adminText("common.back", "Back")}</button>`
          : ""
      }
      <button id="save" class="button app-button app-primary">${adminText("common.save", "Save")}</button>
      <button id="export-json" class="button app-button app-ghost">${adminText("documents.exportJson", "Export JSON")}</button>
    </div>
    <div class="mt-4">
      <h2 class="title is-5">${adminText("common.settings", "Settings")}</h2>
      <div id="module-settings-form" class="app-module-settings-surface"></div>
    </div>
  `;

  const formContainer = document.getElementById("module-settings-form");
  const settingsForm = formContainer && moduleDefinition
    ? renderModuleSettingsForm({
        container: formContainer,
        module: moduleDefinition,
        settings: typeof payload.data === "object" && payload.data !== null
          ? (payload.data as Record<string, unknown>)
          : null,
        agents,
      })
    : null;

  if (!moduleDefinition && formContainer) {
    formContainer.innerHTML = `<div class="notification is-light">${adminText("modules.definitionNotFound", "Module definition not found.")}</div>`;
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
    try {
      await exportDocumentJson(auth, doc, downloadDocument);
    } catch (err) {
      alert((err as Error).message);
    }
  });

  bindDocumentIdCopy();
  bindDocumentLanguageSelect(languageOptions);
};
