export const renderIntegrationsView = ({ content, auth, integrations, getIntegrations, getIntegrationModels, clearAgentState, openIntegrationModal, syncIntegrationModels, reloadIntegrations, }) => {
    if (!content) {
        return;
    }
    clearAgentState();
    if (!integrations.length) {
        content.innerHTML = `
      <div class="app-view-header mb-4">
        <div>
          <h1 class="title is-4">Integrations</h1>
          <p class="app-muted">Configure AI providers and sync available models.</p>
        </div>
      </div>
      <div class="notification is-light">No integrations found.</div>
    `;
        return;
    }
    const list = integrations
        .map((integration) => {
        const enabledLabel = integration.enabled ? "Enabled" : "Disabled";
        const models = integration.supportsModels ? getIntegrationModels(integration.name).length : null;
        const modelsLine = integration.supportsModels
            ? `<div class="app-module-row-meta">Models: ${models}</div>`
            : "";
        const syncDisabled = integration.enabled ? "" : "disabled";
        const settingsLabel = integration.enabled ? "Edit settings" : "Enable integration";
        return `
        <div class="app-module-row">
          <div class="app-module-row-title">${integration.name}</div>
          <div class="app-module-row-meta">${integration.description}</div>
          <div class="app-module-row-meta">Status: ${enabledLabel}</div>
          ${modelsLine}
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
            ${integration.supportsModels
            ? `<button class="button app-button app-ghost" data-integration-sync="${integration.name}" ${syncDisabled}>
                    Sync models
                  </button>`
            : ""}
          </div>
        </div>
      `;
    })
        .join("");
    content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">Integrations</h1>
        <p class="app-muted">Configure AI providers and sync available models.</p>
      </div>
    </div>
    <div class="app-module-list">${list}</div>
  `;
    document.querySelectorAll("[data-integration-config]").forEach((button) => {
        button.addEventListener("click", () => {
            const name = button.getAttribute("data-integration-config") || "";
            const integration = integrations.find((entry) => entry.name === name) ?? null;
            if (integration) {
                openIntegrationModal(integration);
            }
        });
    });
    document.querySelectorAll("[data-integration-sync]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!auth) {
                return;
            }
            const name = button.getAttribute("data-integration-sync") || "";
            if (!name) {
                return;
            }
            try {
                await syncIntegrationModels(auth, name);
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
            }
            catch (err) {
                alert(err.message);
            }
        });
    });
};
