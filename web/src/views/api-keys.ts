import type { UserApiKeySummary } from "../api";
import { adminText } from "../app/translations";

export type ApiKeysViewContext = {
  content: HTMLElement | null;
  keys: UserApiKeySummary[];
  rawKey: string | null;
  onCreate: (name: string, expiry: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: string | null) => {
  if (!value) {
    return adminText("common.unknownTime", "Unknown time");
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const copyIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="10" height="10" rx="2"></rect>
    <path d="M15 9V7a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
  </svg>
`;

export const renderApiKeysView = ({ content, keys, rawKey, onCreate, onDelete }: ApiKeysViewContext) => {
  if (!content) {
    return;
  }

  const rows = keys.length
    ? keys
        .map(
          (key) => `
            <tr>
              <td data-label="${adminText("apiKeys.name", "Name")}">${escapeHtml(key.name)}</td>
              <td data-label="${adminText("apiKeys.prefix", "Prefix")}"><code class="app-api-keys-code">${escapeHtml(key.keyPrefix)}</code></td>
              <td data-label="${adminText("apiKeys.expiry", "Expiry")}">${escapeHtml(formatDate(key.expiry))}</td>
              <td data-label="${adminText("apiKeys.lastUsedAt", "Last used")}">${escapeHtml(formatDate(key.lastUsedAt))}</td>
              <td data-label="${adminText("common.delete", "Delete")}" class="app-api-keys-actions-cell">
                <button class="button app-button app-danger is-small" data-api-key-delete="${escapeHtml(key.id)}">
                  ${adminText("common.delete", "Delete")}
                </button>
              </td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="5" class="app-muted">${adminText("apiKeys.none", "No API keys yet.")}</td></tr>`;

  const rawKeyNotice = rawKey
    ? `
      <div class="app-api-keys-secret">
        <strong class="app-api-keys-secret-title">${adminText("apiKeys.rawKeyTitle", "Copy this key now.")}</strong>
        <p class="app-muted">${adminText("apiKeys.rawKeyHelp", "The full key is shown only once and cannot be recovered later.")}</p>
        <div class="app-api-keys-secret-row">
          <code id="api-key-raw-value" class="app-api-keys-secret-value">${escapeHtml(rawKey)}</code>
          <button
            id="api-key-copy"
            class="button app-button app-ghost app-icon-button app-api-keys-copy"
            type="button"
            aria-label="${adminText("common.copy", "Copy")}"
            title="${adminText("common.copy", "Copy")}"
          >
            ${copyIcon}
          </button>
        </div>
      </div>
    `
    : "";

  content.innerHTML = `
    <section class="app-panel app-api-keys">
      <div class="app-panel-header app-api-keys-header">
        <div>
          <h1 class="title is-4">${adminText("apiKeys.title", "API Keys")}</h1>
          <p class="app-muted">${adminText("apiKeys.subtitle", "Create and revoke delegated login keys for your user account.")}</p>
        </div>
      </div>
      ${rawKeyNotice}
      <div class="app-api-keys-create">
        <div class="app-api-keys-grid">
          <div class="field">
            <label class="label">${adminText("apiKeys.name", "Name")}</label>
            <div class="control">
              <input id="api-key-name" class="input" type="text" />
            </div>
          </div>
          <div class="field">
            <label class="label">${adminText("apiKeys.expiry", "Expiry")}</label>
            <div class="control">
              <input id="api-key-expiry" class="input" type="datetime-local" />
            </div>
          </div>
        </div>
        <div class="app-api-keys-create-actions">
          <button id="api-key-create" class="button app-button app-primary">${adminText("apiKeys.create", "Create API key")}</button>
        </div>
      </div>
      <div class="app-api-keys-table-wrap">
        <table class="table is-fullwidth app-api-keys-table">
          <thead>
            <tr>
              <th>${adminText("apiKeys.name", "Name")}</th>
              <th>${adminText("apiKeys.prefix", "Prefix")}</th>
              <th>${adminText("apiKeys.expiry", "Expiry")}</th>
              <th>${adminText("apiKeys.lastUsedAt", "Last used")}</th>
              <th>${adminText("common.delete", "Delete")}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("api-key-create")?.addEventListener("click", () => {
    const name = (document.getElementById("api-key-name") as HTMLInputElement | null)?.value.trim() ?? "";
    const expiryValue = (document.getElementById("api-key-expiry") as HTMLInputElement | null)?.value ?? "";
    if (!name || !expiryValue) {
      return;
    }
    const expiry = new Date(expiryValue);
    void onCreate(name, Number.isNaN(expiry.getTime()) ? expiryValue : expiry.toISOString());
  });

  content.querySelectorAll<HTMLButtonElement>("[data-api-key-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-api-key-delete") || "";
      if (!id) {
        return;
      }
      if (!window.confirm(adminText("apiKeys.confirmDelete", "Delete this API key?"))) {
        return;
      }
      void onDelete(id);
    });
  });
};
