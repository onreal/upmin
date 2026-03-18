import { downloadArchive, saveAuth } from "../api";
import { state } from "./state";
import { renderAppShell } from "../ui/shell";
import { initNotifications } from "../ui/notifications";
import { initTheme } from "../ui/theme";
import { renderLogin } from "../features/auth/login";
import { renderProfile } from "../features/auth/profile";
import { initShellEvents } from "./shell-events";
import { initCreateModal } from "../features/modals/create-document";
import { initAgentModal } from "../features/modals/create-agent";
import { initIntegrationModal } from "../features/modals/integration";
import { initConfirmModal } from "../features/modals/confirm";
import { moduleChecklistHtml as buildModuleChecklistHtml } from "../features/modules/helpers";
import { startRealtime, stopRealtime } from "../features/realtime/client";
import { refreshNavigation, loadAgents, loadIntegrations, loadLayoutConfig, loadModules, loadUiConfig } from "./loaders";
import { showIntegrationsView, showLogsView, showModulesView, showFormsView } from "./screens";
import { loadDocument } from "./documents";
import { loadAgent } from "../features/agents/controller";
import { clearAgentState } from "../features/agents/state";
import { refreshAgentEditControls } from "../features/agents/view";
import { pushNotice } from "../ui/notice";

const showLogin = (app: HTMLElement) => {
  renderLogin({
    container: app,
    onAuth: (next) => {
      state.auth = next;
    },
    onSuccess: renderApp,
    onClearAgentState: clearAgentState,
  });
};

const exportAll = async () => {
  if (!state.auth) {
    return;
  }
  try {
    const result = await downloadArchive(state.auth);
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename ?? "manage-export.tar.gz";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    alert((err as Error).message);
  }
};

const openWebsiteBuilder = async () => {
  const builderPage = state.navigationPages.find(
    (page) => page.store === "private" && page.path === "website-build.json" && page.documentId
  );

  if (!builderPage?.documentId) {
    pushNotice("error", "Website Builder page not found.");
    return;
  }

  await loadDocument(builderPage.documentId);
};

const renderApp = async () => {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing app container");
  }

  if (state.auth?.type === "apiKey") {
    state.auth = null;
    saveAuth(null);
  }

  if (!state.auth) {
    showLogin(app);
    return;
  }

  await loadUiConfig();
  await loadLayoutConfig();
  await loadModules();

  renderAppShell({ moduleChecklistHtml: (selected) => buildModuleChecklistHtml(state.modules, selected) });
  initNotifications();
  startRealtime(() => state.auth);

  const reloadAgents = () => loadAgents((id) => loadAgent(id, reloadAgents));

  const createModal = initCreateModal({
    getAuth: () => state.auth,
    onCreated: loadDocument,
    refreshNavigation: () => refreshNavigation(loadDocument),
  });

  const agentModalControls = initAgentModal({
    getAuth: () => state.auth,
    reloadAgents,
    onAgentCreated: (id) => loadAgent(id, reloadAgents),
  });

  const refreshIntegrationControls = () => {
    refreshAgentEditControls();
    agentModalControls.refreshControls();
  };

  const integrationModal = initIntegrationModal({
    getAuth: () => state.auth,
    reloadIntegrations: () =>
      loadIntegrations({
        onAfterLoad: refreshIntegrationControls,
      }),
    onAfterSave: () => showIntegrationsView(refreshIntegrationControls),
  });

  state.openIntegrationModalHandler = integrationModal.openIntegrationModal;
  state.openConfirmModalHandler = initConfirmModal().openConfirmModal;

  initShellEvents({
    onLogout: () => {
      stopRealtime();
      state.auth = null;
      saveAuth(null);
      showLogin(app);
    },
    onShowProfile: () => {
      void renderProfile();
    },
    onShowModules: showModulesView,
    onShowIntegrations: () => showIntegrationsView(refreshIntegrationControls),
    onShowLogs: () => {
      void showLogsView();
    },
    onShowForms: () => {
      void showFormsView();
    },
    onExportAll: exportAll,
    onOpenBuilder: () => {
      void openWebsiteBuilder();
    },
    onOpenCreate: createModal.openCreateModal,
    onOpenAgentModal: agentModalControls.openAgentModal,
  });

  await loadIntegrations({
    onAfterLoad: refreshIntegrationControls,
  });

  await reloadAgents();
  await refreshNavigation(loadDocument);
};

export const bootstrap = () => {
  initTheme();
  window.addEventListener("app:session-expired", ((event: Event) => {
    const app = document.getElementById("app");
    if (!app) {
      return;
    }
    stopRealtime();
    state.auth = null;
    const detail = (event as CustomEvent<{ message?: string }>).detail;
    showLogin(app);
    pushNotice("error", detail?.message || "Your session expired. Please log in again.");
  }) as EventListener);

  renderApp().catch(() => {
    stopRealtime();
    const app = document.getElementById("app");
    if (!app) {
      return;
    }
    showLogin(app);
  });
};
