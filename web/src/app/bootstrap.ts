import { downloadArchive, fetchSystemUpdate, runSystemUpdate, saveAuth } from "../api";
import { state } from "./state";
import { renderAppShell, renderSystemUpdateControls } from "../ui/shell";
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
import { refreshNavigation, loadAgents, loadIntegrations, loadLayoutConfig, loadModules, loadUiConfig, preloadAdminLanguage } from "./loaders";
import { showIntegrationsView, showLogsView, showModulesView, showFormsView } from "./screens";
import { loadDocument } from "./documents";
import { loadAgent } from "../features/agents/controller";
import { clearAgentState } from "../features/agents/state";
import { refreshAgentEditControls } from "../features/agents/view";
import { pushNotice } from "../ui/notice";
import { adminText } from "./translations";

let systemUpdatePollHandle: number | null = null;

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

const stopSystemUpdatePolling = () => {
  if (systemUpdatePollHandle !== null) {
    window.clearTimeout(systemUpdatePollHandle);
    systemUpdatePollHandle = null;
  }
};

const scheduleSystemUpdatePolling = () => {
  stopSystemUpdatePolling();
  systemUpdatePollHandle = window.setTimeout(() => {
    void refreshSystemUpdateStatus(true);
  }, 2500);
};

const refreshSystemUpdateStatus = async (pollIfRunning = false) => {
  if (!state.auth) {
    state.systemUpdate = null;
    return null;
  }

  try {
    const previous = state.systemUpdate;
    const response = await fetchSystemUpdate(state.auth);
    state.systemUpdate = response.update;
    renderSystemUpdateControls();

    const wasLocked = Boolean(previous?.locked);
    const isLocked = Boolean(response.update.locked);
    if (wasLocked && !isLocked && response.update.status === "completed") {
      stopSystemUpdatePolling();
      window.location.reload();
      return response.update;
    }

    if (isLocked) {
      if (pollIfRunning) {
        scheduleSystemUpdatePolling();
      }
    } else {
      stopSystemUpdatePolling();
    }

    return response.update;
  } catch (err) {
    stopSystemUpdatePolling();
    pushNotice("error", (err as Error).message);
    return null;
  }
};

const startSystemUpdate = async () => {
  if (!state.auth) {
    return;
  }

  state.systemUpdate = {
    ...(state.systemUpdate ?? {
      currentVersion: null,
      latestVersion: null,
      updateAvailable: false,
    }),
    status: "running",
    locked: true,
    message: adminText("systemUpdate.starting", "Starting admin update."),
    error: null,
  };
  renderSystemUpdateControls();
  scheduleSystemUpdatePolling();

  try {
    const response = await runSystemUpdate(state.auth);
    state.systemUpdate = response.update;
    renderSystemUpdateControls();
    pushNotice("success", response.update.message || adminText("systemUpdate.updated", "Admin updated successfully."));
    stopSystemUpdatePolling();
    window.location.reload();
  } catch (err) {
    await refreshSystemUpdateStatus(false);
    stopSystemUpdatePolling();
    pushNotice("error", (err as Error).message);
  }
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
  await openPrivateDocument("website-build.json", adminText("documents.websiteBuildNotFound", "Website Builder page not found."));
};

const openPrivateDocument = async (path: string, errorMessage: string) => {
  const page = state.navigationPages.find((entry) => entry.store === "private" && entry.path === path && entry.documentId);

  if (!page?.documentId) {
    pushNotice("error", errorMessage);
    return;
  }

  await loadDocument(page.documentId);
};

const openCreationsPage = async () => {
  await openPrivateDocument("creations.json", adminText("documents.creationsNotFound", "Creations page not found."));
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

  const initialUpdateStatus = await refreshSystemUpdateStatus(true);
  const isLocked = Boolean(initialUpdateStatus?.locked);

  if (isLocked) {
    renderAppShell({ moduleChecklistHtml: (selected) => buildModuleChecklistHtml(state.modules, selected) });
    initNotifications();
    renderSystemUpdateControls();
    return;
  }

  await loadUiConfig();
  await loadLayoutConfig();
  await loadModules();
  await preloadAdminLanguage();

  renderAppShell({ moduleChecklistHtml: (selected) => buildModuleChecklistHtml(state.modules, selected) });
  initNotifications();
  renderSystemUpdateControls();
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
    onShowCreations: () => {
      void openCreationsPage();
    },
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
    onRunSystemUpdate: () => {
      void startSystemUpdate();
    },
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
    pushNotice("error", detail?.message || adminText("auth.sessionExpired", "Your session expired. Please log in again."));
  }) as EventListener);

  window.addEventListener("app:system-update-locked", (() => {
    void refreshSystemUpdateStatus(true);
  }) as EventListener);

  renderApp().catch(() => {
    stopSystemUpdatePolling();
    stopRealtime();
    const app = document.getElementById("app");
    if (!app) {
      return;
    }
    showLogin(app);
  });
};
