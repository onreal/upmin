import type { AuthState, FormSummary, RemoteDocument } from "../api";
import { fetchDocument } from "../api";
import { adminText } from "../app/translations";

export type FormsViewContext = {
  content: HTMLElement | null;
  auth: AuthState | null;
  forms: FormSummary[];
  setForms: (forms: FormSummary[]) => void;
  fetchForms: (auth: AuthState) => Promise<{ forms: FormSummary[] }>;
  clearAgentState: () => void;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return adminText("common.unknownTime", "Unknown time");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const buildFormSelect = (forms: FormSummary[], currentId?: string) => {
  const options = forms
    .map((form) => {
      const label = form.label || form.name;
      const source = form.source?.name ? ` · ${form.source.name}` : "";
      const selected = form.id === currentId ? "selected" : "";
      return `<option value="${form.id}" ${selected}>${escapeHtml(label)}${escapeHtml(source)}</option>`;
    })
    .join("");

  return `
    <div class="field">
      <label class="label">${adminText("forms.form", "Form")}</label>
      <div class="control">
        <div class="select is-fullwidth">
          <select id="forms-select">${options}</select>
        </div>
      </div>
    </div>
  `;
};

const renderEntries = (doc: RemoteDocument, target: HTMLElement) => {
  const data = doc.payload.data as Record<string, unknown> | null;
  const entries = Array.isArray(data?.entries) ? data?.entries : [];

  if (!entries.length) {
    target.innerHTML = `<div class="notification is-light">${adminText("forms.noEntries", "No entries yet.")}</div>`;
    return;
  }

  const list = entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }
      const record = entry as Record<string, unknown>;
      const submittedAt = formatTimestamp(record.submittedAt as string | null);
      const actor = record.actor && typeof record.actor === "object" ? (record.actor as Record<string, unknown>) : null;
      const actorLabel = actor
        ? `${actor.sub ?? ""}${actor.role ? ` · ${actor.role}` : ""}`.trim()
        : adminText("forms.anonymous", "anonymous");
      const payload = record.data ?? {};
      const payloadJson = escapeHtml(JSON.stringify(payload, null, 2));

      return `
        <article class="app-form-entry app-surface">
          <div class="app-form-entry-header">
            <div>
              <span class="app-form-entry-label">${adminText("forms.submitted", "Submitted")}</span>
              <span class="app-form-entry-value">${escapeHtml(submittedAt)}</span>
            </div>
            <div>
              <span class="app-form-entry-label">${adminText("forms.actor", "Actor")}</span>
              <span class="app-form-entry-value">${escapeHtml(actorLabel || adminText("forms.anonymous", "anonymous"))}</span>
            </div>
          </div>
          <pre class="app-form-entry-json">${payloadJson}</pre>
        </article>
      `;
    })
    .join("");

  target.innerHTML = `<div class="app-form-entry-list">${list}</div>`;
};

export const renderFormsView = async ({
  content,
  auth,
  forms,
  setForms,
  fetchForms,
  clearAgentState,
}: FormsViewContext) => {
  if (!content) {
    return;
  }
  clearAgentState();

  if (!auth) {
    content.innerHTML = `<p class="app-muted">${adminText("auth.required", "Authentication required.")}</p>`;
    return;
  }

  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${adminText("forms.title", "Forms")}</h1>
        <p class="app-muted">${adminText("forms.subtitle", "Collected form submissions stored in manage/store/system/forms/submissions.")}</p>
      </div>
    </div>
    <div class="notification is-light">${adminText("forms.loading", "Loading forms...")}</div>
  `;

  try {
    const response = await fetchForms(auth);
    forms = Array.isArray(response.forms) ? response.forms : [];
    setForms(forms);
  } catch (err) {
    content.innerHTML = `<p class="app-muted">${(err as Error).message}</p>`;
    return;
  }

  if (!forms.length) {
    content.innerHTML = `
      <div class="app-view-header mb-4">
        <div>
          <h1 class="title is-4">${adminText("forms.title", "Forms")}</h1>
          <p class="app-muted">${adminText("forms.subtitle", "Collected form submissions stored in manage/store/system/forms/submissions.")}</p>
        </div>
      </div>
      <div class="notification is-light">${adminText("forms.none", "No forms found yet.")}</div>
    `;
    return;
  }

  const selectedId = forms[0]?.id || "";

  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${adminText("forms.title", "Forms")}</h1>
        <p class="app-muted">${adminText("forms.subtitle", "Collected form submissions stored in manage/store/system/forms/submissions.")}</p>
      </div>
      <div class="app-view-actions">
        <span class="app-muted">${adminText("forms.total", "{count} total", { count: forms.length })}</span>
      </div>
    </div>
    <div class="app-forms-toolbar mb-4">${buildFormSelect(forms, selectedId)}</div>
    <div id="forms-entries" class="app-forms-entries"></div>
  `;

  const entriesTarget = document.getElementById("forms-entries");
  const select = document.getElementById("forms-select") as HTMLSelectElement | null;

  const loadSelected = async (id: string) => {
    if (!entriesTarget || !auth) {
      return;
    }

    entriesTarget.innerHTML = `<div class="notification is-light">${adminText("forms.loadingEntries", "Loading entries...")}</div>`;

    try {
      const doc = await fetchDocument(auth, id);
      renderEntries(doc, entriesTarget);
    } catch (err) {
      entriesTarget.innerHTML = `<p class="app-muted">${(err as Error).message}</p>`;
    }
  };

  if (selectedId) {
    void loadSelected(selectedId);
  }

  select?.addEventListener("change", () => {
    const next = select.value.trim();
    if (next) {
      void loadSelected(next);
    }
  });
};
