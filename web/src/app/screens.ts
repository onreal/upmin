import { renderIntegrationsView } from "../views/integrations";
import { renderLogsView } from "../views/logs";
import { renderModulesView } from "../views/modules";
import { state } from "./state";
import { clearAgentState } from "../features/agents/state";
import { loadDocument, openLoggerSettings } from "./documents";
import { loadIntegrations } from "./loaders";
import { getIntegrationModels } from "../features/integrations/helpers";
import { syncIntegrationModels, fetchLogs } from "../api";

export const showModulesView = () => {
  renderModulesView({
    content: document.getElementById("content"),
    modules: state.modules,
    navigationPages: state.navigationPages,
    clearAgentState,
    loadDocument,
  });
};

export const showIntegrationsView = (onAfterLoad?: () => void) => {
  renderIntegrationsView({
    content: document.getElementById("content"),
    auth: state.auth,
    integrations: state.integrations,
    getIntegrations: () => state.integrations,
    getIntegrationModels: (name) => getIntegrationModels(state.integrationSettings, name),
    clearAgentState,
    openIntegrationModal: (integration) => {
      state.openIntegrationModalHandler?.(integration);
    },
    syncIntegrationModels,
    reloadIntegrations: () => loadIntegrations({ onAfterLoad }),
  });
};

export const showLogsView = () =>
  renderLogsView({
    content: document.getElementById("content"),
    auth: state.auth,
    logs: state.logs,
    setLogs: (next) => {
      state.logs = next;
    },
    fetchLogs,
    loadDocument,
    clearAgentState,
    openLoggerSettings,
  });
