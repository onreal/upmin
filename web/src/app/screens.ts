import { renderIntegrationsView } from "../views/integrations";
import { renderLogsView } from "../views/logs";
import { renderModulesView } from "../views/modules";
import { renderFormsView } from "../views/forms";
import { state } from "./state";
import { clearAgentState } from "../features/agents/state";
import { loadDocument, openLoggerSettings } from "./documents";
import { loadIntegrations } from "./loaders";
import { getIntegrationModels } from "../features/integrations/helpers";
import { syncIntegrationModels, fetchLogs, fetchForms } from "../api";
import {
  subscribeRealtime,
  subscribeRealtimeStatus,
  type RealtimeEvent,
  type RealtimeStatus,
} from "../features/realtime/client";
import {
  clearRegisteredIntegrationCleanup,
  registerIntegrationCleanup,
} from "../features/integrations/runtime";
import { pushNotice } from "../ui/notice";
import { adminText } from "./translations";

export const showModulesView = () => {
  clearRegisteredIntegrationCleanup();
  renderModulesView({
    content: document.getElementById("content"),
    modules: state.modules,
    navigationPages: state.navigationPages,
    clearAgentState,
    loadDocument,
  });
};

export const showIntegrationsView = (onAfterLoad?: () => void) => {
  const render = () =>
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
      syncIntegrationModels: async (auth, name) => syncIntegrationModels(auth, name),
      reloadIntegrations: () => loadIntegrations({ onAfterLoad }),
    });

  render();

  const reloadAndRender = async () => {
    await loadIntegrations({ onAfterLoad });
    render();
  };

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    if (event.type !== "integration.sync.updated") {
      return;
    }

    void reloadAndRender();

    if (event.syncing) {
      return;
    }

    if (event.ok === false) {
      pushNotice(
        "error",
        event.error || adminText("integrations.syncFailedNamed", "Model sync failed for {name}.", { name: event.name })
      );
      return;
    }

    if (event.ok === true) {
      const suffix = typeof event.models === "number" ? ` (${event.models} models)` : "";
      pushNotice("success", adminText("integrations.syncedNamed", "Models synced for {name}{suffix}.", {
        name: event.name,
        suffix,
      }));
    }
  };

  const handleRealtimeStatus = (status: RealtimeStatus) => {
    if (status === "open") {
      void reloadAndRender();
    }
  };

  const disposeRealtime = subscribeRealtime(handleRealtimeEvent);
  const disposeRealtimeStatus = subscribeRealtimeStatus(handleRealtimeStatus);
  registerIntegrationCleanup(() => {
    disposeRealtime();
    disposeRealtimeStatus();
  });
};

export const showLogsView = () => {
  clearRegisteredIntegrationCleanup();
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
};

export const showFormsView = () => {
  clearRegisteredIntegrationCleanup();
  renderFormsView({
    content: document.getElementById("content"),
    auth: state.auth,
    forms: state.forms,
    setForms: (next) => {
      state.forms = next;
    },
    fetchForms,
    clearAgentState,
  });
};
