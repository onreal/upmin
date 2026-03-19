import type { AuthState, IntegrationSummary } from "../api";
import { pushNotice } from "../ui/notice";
import { adminText } from "../app/translations";

export type IntegrationsViewContext = {
  content: HTMLElement | null;
  auth: AuthState | null;
  integrations: IntegrationSummary[];
  getIntegrations: () => IntegrationSummary[];
  getIntegrationModels: (name: string) => string[];
  clearAgentState: () => void;
  openIntegrationModal: (integration: IntegrationSummary) => void;
  syncIntegrationModels: (
    auth: AuthState,
    name: string
  ) => Promise<{ name: string; queued: boolean; alreadyRunning: boolean; syncing: boolean }>;
  reloadIntegrations: () => Promise<void>;
};

export const renderIntegrationsView = ({
  content,
  auth,
  integrations,
  getIntegrations,
  getIntegrationModels,
  clearAgentState,
  openIntegrationModal,
  syncIntegrationModels,
  reloadIntegrations,
}: IntegrationsViewContext) => {
  if (!content) {
    return;
  }
  clearAgentState();

  if (!integrations.length) {
    content.innerHTML = `
      <div class="app-view-header mb-4">
        <div>
          <h1 class="title is-4">${adminText("integrations.title", "Integrations")}</h1>
          <p class="app-muted">${adminText("integrations.subtitle", "Configure AI providers and sync available models.")}</p>
        </div>
      </div>
      <div class="notification is-light">${adminText("integrations.none", "No integrations found.")}</div>
    `;
    return;
  }

  const list = integrations
    .map((integration) => {
      const enabledLabel = integration.enabled
        ? adminText("integrations.enabled", "Enabled")
        : adminText("integrations.disabled", "Disabled");
      const models = integration.supportsModels ? getIntegrationModels(integration.name).length : null;
      const modelsLine = integration.supportsModels
        ? `<div class="app-module-row-meta">${adminText("integrations.models", "Models: {count}", { count: models ?? 0 })}</div>`
        : "";
      const syncState = integration.syncing ? "Sync: running" : integration.lastSyncError
        ? adminText("integrations.lastSyncFailed", "Last sync failed: {error}", { error: integration.lastSyncError })
        : integration.lastSyncedAt
          ? adminText("integrations.lastSynced", "Last synced: {time}", { time: integration.lastSyncedAt })
          : adminText("integrations.syncIdle", "Sync: idle");
      const syncDisabled = integration.enabled && !integration.syncing ? "" : "disabled";
      const settingsLabel = integration.enabled
        ? adminText("integrations.editSettings", "Edit settings")
        : adminText("integrations.enable", "Enable integration");
      const syncLabel = integration.syncing
        ? adminText("integrations.syncing", "Syncing...")
        : adminText("integrations.syncModels", "Sync models");

      return `
        <div class="app-module-row">
          <div class="app-module-row-title">${integration.name}</div>
          <div class="app-module-row-meta">${integration.description}</div>
          <div class="app-module-row-meta">${adminText("integrations.status", "Status: {status}", { status: enabledLabel })}</div>
          ${modelsLine}
          ${integration.supportsModels ? `<div class="app-module-row-meta">${syncState}</div>` : ""}
          <div class="buttons">
            <button
              class="button app-button app-ghost app-icon-button"
              data-integration-config="${integration.name}"
              aria-label="${settingsLabel}"
              title="${settingsLabel}"
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
            ${
              integration.supportsModels
                ? `<button class="button app-button app-ghost" data-integration-sync="${integration.name}" ${syncDisabled}>
                    ${syncLabel}
                  </button>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");

  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${adminText("integrations.title", "Integrations")}</h1>
        <p class="app-muted">${adminText("integrations.subtitle", "Configure AI providers and sync available models.")}</p>
      </div>
    </div>
    <div class="app-module-list">${list}</div>
  `;

  document.querySelectorAll<HTMLButtonElement>("[data-integration-config]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.getAttribute("data-integration-config") || "";
      const integration = integrations.find((entry) => entry.name === name) ?? null;
      if (integration) {
        openIntegrationModal(integration);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-integration-sync]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!auth) {
        return;
      }
      const name = button.getAttribute("data-integration-sync") || "";
      if (!name) {
        return;
      }
      try {
        const result = await syncIntegrationModels(auth, name);
        pushNotice(
          "success",
          result.alreadyRunning
            ? adminText("integrations.syncAlreadyRunning", "Model sync already running.")
            : adminText("integrations.syncStarted", "Model sync started.")
        );
        await reloadIntegrations();
        renderIntegrationsView({
          content,
          auth,
          integrations: getIntegrations(),
          getIntegrations,
          getIntegrationModels,
          clearAgentState,
          openIntegrationModal,
          syncIntegrationModels,
          reloadIntegrations,
        });
      } catch (err) {
        pushNotice("error", (err as Error).message);
      }
    });
  });
};
