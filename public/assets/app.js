var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// web/src/api/types.ts
var init_types = __esm({
  "web/src/api/types.ts"() {
    "use strict";
  }
});

// web/src/api/client.ts
var STORAGE_KEY, notify, successMessageFor, loadAuth, saveAuth, buildHeaders, request, requestBlob, requestAsset, requestForm;
var init_client = __esm({
  "web/src/api/client.ts"() {
    "use strict";
    STORAGE_KEY = "manage_auth";
    notify = (payload) => {
      if (typeof window === "undefined") {
        return;
      }
      window.dispatchEvent(new CustomEvent("app:notice", { detail: payload }));
    };
    successMessageFor = (method) => {
      if (method === "GET")
        return "Loaded.";
      if (method === "POST")
        return "Created.";
      if (method === "PUT")
        return "Saved.";
      if (method === "DELETE")
        return "Deleted.";
      return "Done.";
    };
    loadAuth = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };
    saveAuth = (auth) => {
      if (!auth) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    };
    buildHeaders = (auth, json) => {
      const headers = {};
      if (json) {
        headers["Content-Type"] = "application/json";
      }
      if (auth?.type === "apiKey") {
        headers["X-API-KEY"] = auth.value;
      }
      if (auth?.type === "token") {
        headers["Authorization"] = `Bearer ${auth.value}`;
      }
      return headers;
    };
    request = async (url, options, auth, config = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...buildHeaders(auth, true),
          ...options.headers || {}
        }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        const message = error.message || error.error || response.statusText || "Request failed";
        if (config.notify !== false) {
          notify({ type: "error", message });
        }
        throw new Error(message);
      }
      const data = await response.json();
      const method = (options.method || "GET").toUpperCase();
      if (config.notify !== false) {
        notify({ type: "success", message: successMessageFor(method) });
      }
      return data;
    };
    requestBlob = async (url, options, auth) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...buildHeaders(auth, true),
          ...options.headers || {}
        }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        const message = error.message || error.error || response.statusText || "Request failed";
        notify({ type: "error", message });
        throw new Error(message);
      }
      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/zip") && !contentType.includes("application/json") && !contentType.includes("application/gzip") && !contentType.includes("application/x-gzip") && !contentType.includes("application/octet-stream")) {
        throw new Error("Unexpected download response.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = match ? match[1] : void 0;
      notify({ type: "success", message: "Download ready." });
      return { blob, filename };
    };
    requestAsset = async (url, options, auth, config = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...buildHeaders(auth, false),
          ...options.headers || {}
        }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        const message = error.message || error.error || response.statusText || "Request failed";
        if (config.notify !== false) {
          notify({ type: "error", message });
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = match ? match[1] : void 0;
      if (config.notify !== false) {
        notify({ type: "success", message: "Download ready." });
      }
      return { blob, filename };
    };
    requestForm = async (url, body, auth) => {
      const response = await fetch(url, {
        method: "POST",
        body,
        headers: {
          ...buildHeaders(auth, false)
        }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        const message = error.message || error.error || response.statusText || "Request failed";
        notify({ type: "error", message });
        throw new Error(message);
      }
      const data = await response.json();
      notify({ type: "success", message: "Uploaded successfully." });
      return data;
    };
  }
});

// web/src/api/auth.ts
var loginWithApiKey, loginWithPassword;
var init_auth = __esm({
  "web/src/api/auth.ts"() {
    "use strict";
    init_client();
    loginWithApiKey = (apiKey) => request(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ apiKey })
      },
      null
    );
    loginWithPassword = (email, password) => request(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password })
      },
      null
    );
  }
});

// web/src/api/documents.ts
var fetchDocument, updateDocument, createDocument, downloadDocument, downloadArchive;
var init_documents = __esm({
  "web/src/api/documents.ts"() {
    "use strict";
    init_client();
    fetchDocument = (auth, id) => request(`/api/documents/${id}`, { method: "GET" }, auth);
    updateDocument = (auth, id, payload) => request(`/api/documents/${id}`, { method: "PUT", body: JSON.stringify(payload) }, auth);
    createDocument = (auth, requestPayload) => request(
      `/api/documents`,
      { method: "POST", body: JSON.stringify(requestPayload) },
      auth
    );
    downloadDocument = (auth, id) => requestBlob(`/api/documents/${id}/export`, { method: "GET" }, auth);
    downloadArchive = (auth) => requestBlob(`/api/export.tar.gz`, { method: "GET" }, auth);
  }
});

// web/src/api/navigation.ts
var fetchNavigation;
var init_navigation = __esm({
  "web/src/api/navigation.ts"() {
    "use strict";
    init_client();
    fetchNavigation = (auth) => request(
      "/api/navigation",
      { method: "GET" },
      auth
    );
  }
});

// web/src/api/ui.ts
var fetchUiConfig, fetchLayoutConfig;
var init_ui = __esm({
  "web/src/api/ui.ts"() {
    "use strict";
    init_client();
    fetchUiConfig = (auth) => request("/api/ui-config", { method: "GET" }, auth);
    fetchLayoutConfig = (auth) => request("/api/layout-config", { method: "GET" }, auth);
  }
});

// web/src/api/modules.ts
var fetchModules, uploadModuleFile, fetchModuleList, deleteModuleFile, fetchChatConversations, startChatConversation, appendChatMessage, fetchChatConversation, deleteChatConversation;
var init_modules = __esm({
  "web/src/api/modules.ts"() {
    "use strict";
    init_client();
    fetchModules = (auth) => request("/api/modules", { method: "GET" }, auth);
    uploadModuleFile = (auth, moduleName, file, settingsKey) => {
      const body = new FormData();
      body.append("file", file);
      if (settingsKey) {
        body.append("settings", settingsKey);
      }
      return requestForm(
        `/api/modules/${moduleName}`,
        body,
        auth
      );
    };
    fetchModuleList = (auth, moduleName, params) => {
      const search = new URLSearchParams();
      if (params.visibility) {
        search.set("visibility", params.visibility);
      }
      if (params.settings) {
        search.set("settings", params.settings);
      }
      const query = search.toString();
      const url = query ? `/api/modules/${moduleName}/list?${query}` : `/api/modules/${moduleName}/list`;
      return request(url, { method: "GET" }, auth);
    };
    deleteModuleFile = (auth, moduleName, payload) => request(
      `/api/modules/${moduleName}/delete`,
      { method: "POST", body: JSON.stringify(payload) },
      auth
    );
    fetchChatConversations = (auth, moduleName, params) => {
      const search = new URLSearchParams();
      search.set("settings", params.settings);
      return request(
        `/api/modules/${moduleName}/list?${search.toString()}`,
        { method: "GET" },
        auth,
        { notify: false }
      );
    };
    startChatConversation = (auth, moduleName, payload) => request(
      `/api/modules/${moduleName}`,
      { method: "POST", body: JSON.stringify(payload) },
      auth,
      { notify: false }
    );
    appendChatMessage = (auth, moduleName, payload) => request(
      `/api/modules/${moduleName}/message`,
      { method: "POST", body: JSON.stringify(payload) },
      auth,
      { notify: false }
    );
    fetchChatConversation = (auth, moduleName, params) => {
      const search = new URLSearchParams();
      search.set("settings", params.settings);
      search.set("id", params.id);
      return request(
        `/api/modules/${moduleName}/conversation?${search.toString()}`,
        { method: "GET" },
        auth,
        { notify: false }
      );
    };
    deleteChatConversation = (auth, moduleName, payload) => request(
      `/api/modules/${moduleName}/delete`,
      { method: "POST", body: JSON.stringify(payload) },
      auth
    );
  }
});

// web/src/api/integrations.ts
var fetchIntegrations, fetchIntegrationSettings, updateIntegrationSettings, syncIntegrationModels;
var init_integrations = __esm({
  "web/src/api/integrations.ts"() {
    "use strict";
    init_client();
    fetchIntegrations = (auth) => request(
      "/api/integrations",
      { method: "GET" },
      auth
    );
    fetchIntegrationSettings = (auth, name) => request(
      `/api/integrations/${encodeURIComponent(name)}`,
      { method: "GET" },
      auth
    );
    updateIntegrationSettings = (auth, name, payload) => request(
      `/api/integrations/${encodeURIComponent(name)}`,
      { method: "PUT", body: JSON.stringify(payload) },
      auth
    );
    syncIntegrationModels = (auth, name) => request(
      `/api/integrations/${encodeURIComponent(name)}/sync`,
      { method: "POST" },
      auth,
      { notify: false }
    );
  }
});

// web/src/api/logs.ts
var fetchLogs;
var init_logs = __esm({
  "web/src/api/logs.ts"() {
    "use strict";
    init_client();
    fetchLogs = (auth) => request("/api/logs", { method: "GET" }, auth);
  }
});

// web/src/api/forms.ts
var fetchForms;
var init_forms = __esm({
  "web/src/api/forms.ts"() {
    "use strict";
    init_client();
    fetchForms = (auth) => request("/api/forms", { method: "GET" }, auth);
  }
});

// web/src/api/agents.ts
var fetchAgents, fetchAgent, createAgent, updateAgent, fetchAgentConversations, createAgentConversation, fetchAgentConversation, appendAgentMessage;
var init_agents = __esm({
  "web/src/api/agents.ts"() {
    "use strict";
    init_client();
    fetchAgents = (auth) => request(`/api/agents`, { method: "GET" }, auth, { notify: false });
    fetchAgent = (auth, id) => request(`/api/agents/${id}`, { method: "GET" }, auth, { notify: false });
    createAgent = (auth, payload) => request(`/api/agents`, { method: "POST", body: JSON.stringify(payload) }, auth);
    updateAgent = (auth, id, payload) => request(
      `/api/agents/${id}`,
      { method: "PUT", body: JSON.stringify(payload) },
      auth
    );
    fetchAgentConversations = (auth, id) => request(
      `/api/agents/${id}/conversations`,
      { method: "GET" },
      auth,
      { notify: false }
    );
    createAgentConversation = (auth, id) => request(
      `/api/agents/${id}/conversations`,
      { method: "POST", body: JSON.stringify({}) },
      auth,
      { notify: false }
    );
    fetchAgentConversation = (auth, id) => request(`/api/agents/conversations/${id}`, { method: "GET" }, auth, {
      notify: false
    });
    appendAgentMessage = (auth, id, content) => request(
      `/api/agents/conversations/${id}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
      auth,
      { notify: false }
    );
  }
});

// web/src/api/creations.ts
var createCreationSnapshot, clearWebsiteWithSnapshot, restoreCreationSnapshot, deleteCreationSnapshot, downloadCreationSnapshot, fetchCreationSnapshotImage;
var init_creations = __esm({
  "web/src/api/creations.ts"() {
    "use strict";
    init_client();
    createCreationSnapshot = (auth, snapshot) => request(
      "/api/creations/snapshot",
      { method: "POST", body: JSON.stringify({ snapshot }) },
      auth
    );
    clearWebsiteWithSnapshot = (auth, snapshot) => request(
      "/api/creations/clear",
      { method: "POST", body: JSON.stringify({ snapshot }) },
      auth
    );
    restoreCreationSnapshot = (auth, id) => request(`/api/creations/${id}/restore`, { method: "POST" }, auth);
    deleteCreationSnapshot = (auth, id) => request(`/api/creations/${id}`, { method: "DELETE" }, auth);
    downloadCreationSnapshot = (auth, id) => requestAsset(`/api/creations/${id}/download`, { method: "GET" }, auth);
    fetchCreationSnapshotImage = (auth, id) => requestAsset(`/api/creations/${id}/image`, { method: "GET" }, auth, { notify: false });
  }
});

// web/src/api/website-build.ts
var publishWebsiteBuild, cleanWebsiteBuild, copyWebsiteBuildFromPublic;
var init_website_build = __esm({
  "web/src/api/website-build.ts"() {
    "use strict";
    init_client();
    publishWebsiteBuild = (auth) => request("/api/website-build/publish", { method: "POST" }, auth);
    cleanWebsiteBuild = (auth, snapshot) => request(
      "/api/website-build/clean",
      { method: "POST", body: JSON.stringify({ snapshot }) },
      auth
    );
    copyWebsiteBuildFromPublic = (auth, snapshot) => request(
      "/api/website-build/copy-public",
      { method: "POST", body: JSON.stringify({ snapshot }) },
      auth
    );
  }
});

// web/src/api/realtime.ts
var fetchRealtimeTicket;
var init_realtime = __esm({
  "web/src/api/realtime.ts"() {
    "use strict";
    init_client();
    fetchRealtimeTicket = (auth) => request("/api/realtime/ticket", { method: "GET" }, auth, { notify: false });
  }
});

// web/src/api/index.ts
var api_exports = {};
__export(api_exports, {
  appendAgentMessage: () => appendAgentMessage,
  appendChatMessage: () => appendChatMessage,
  cleanWebsiteBuild: () => cleanWebsiteBuild,
  clearWebsiteWithSnapshot: () => clearWebsiteWithSnapshot,
  copyWebsiteBuildFromPublic: () => copyWebsiteBuildFromPublic,
  createAgent: () => createAgent,
  createAgentConversation: () => createAgentConversation,
  createCreationSnapshot: () => createCreationSnapshot,
  createDocument: () => createDocument,
  deleteChatConversation: () => deleteChatConversation,
  deleteCreationSnapshot: () => deleteCreationSnapshot,
  deleteModuleFile: () => deleteModuleFile,
  downloadArchive: () => downloadArchive,
  downloadCreationSnapshot: () => downloadCreationSnapshot,
  downloadDocument: () => downloadDocument,
  fetchAgent: () => fetchAgent,
  fetchAgentConversation: () => fetchAgentConversation,
  fetchAgentConversations: () => fetchAgentConversations,
  fetchAgents: () => fetchAgents,
  fetchChatConversation: () => fetchChatConversation,
  fetchChatConversations: () => fetchChatConversations,
  fetchCreationSnapshotImage: () => fetchCreationSnapshotImage,
  fetchDocument: () => fetchDocument,
  fetchForms: () => fetchForms,
  fetchIntegrationSettings: () => fetchIntegrationSettings,
  fetchIntegrations: () => fetchIntegrations,
  fetchLayoutConfig: () => fetchLayoutConfig,
  fetchLogs: () => fetchLogs,
  fetchModuleList: () => fetchModuleList,
  fetchModules: () => fetchModules,
  fetchNavigation: () => fetchNavigation,
  fetchRealtimeTicket: () => fetchRealtimeTicket,
  fetchUiConfig: () => fetchUiConfig,
  loadAuth: () => loadAuth,
  loginWithApiKey: () => loginWithApiKey,
  loginWithPassword: () => loginWithPassword,
  publishWebsiteBuild: () => publishWebsiteBuild,
  request: () => request,
  requestAsset: () => requestAsset,
  requestBlob: () => requestBlob,
  requestForm: () => requestForm,
  restoreCreationSnapshot: () => restoreCreationSnapshot,
  saveAuth: () => saveAuth,
  startChatConversation: () => startChatConversation,
  syncIntegrationModels: () => syncIntegrationModels,
  updateAgent: () => updateAgent,
  updateDocument: () => updateDocument,
  updateIntegrationSettings: () => updateIntegrationSettings,
  uploadModuleFile: () => uploadModuleFile
});
var init_api = __esm({
  "web/src/api/index.ts"() {
    "use strict";
    init_types();
    init_client();
    init_auth();
    init_documents();
    init_navigation();
    init_ui();
    init_modules();
    init_integrations();
    init_logs();
    init_forms();
    init_agents();
    init_creations();
    init_website_build();
    init_realtime();
  }
});

// web/src/app/bootstrap.ts
init_api();

// web/src/app/state.ts
init_api();
var state = {
  auth: loadAuth(),
  currentDocument: null,
  editor: null,
  authDocumentId: null,
  layoutConfig: {},
  modules: [],
  integrations: [],
  integrationSettings: {},
  currentIntegration: null,
  openIntegrationModalHandler: null,
  agents: [],
  agentsAll: [],
  logs: [],
  forms: [],
  navigationPages: [],
  navigationGroups: [],
  activeLanguage: null,
  defaultLanguage: null,
  moduleSettingsCache: /* @__PURE__ */ new Map(),
  currentAgent: null,
  currentConversation: null,
  returnToDocumentId: null,
  onSelectAgentMenu: null
};
var editorRef = {
  get: () => state.editor,
  set: (next) => {
    state.editor = next;
  }
};

// web/src/features/auth/utils.ts
var isAuthData = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value;
  if (!Array.isArray(record.users)) {
    return false;
  }
  return record.users.every((user) => user && typeof user === "object");
};
var isTokenAuth = (value) => {
  return !!value && value.type === "token";
};

// web/src/app/layout.ts
var getUserLabel = () => {
  if (isTokenAuth(state.auth) && state.auth.user) {
    const name = `${state.auth.user.firstname} ${state.auth.user.lastname}`.trim();
    return name || state.auth.user.email;
  }
  if (state.auth?.type === "apiKey") {
    return "API Key";
  }
  return "Guest";
};
var headerCopy = () => ({
  title: state.layoutConfig.header?.title ?? "Manage",
  subtitle: state.layoutConfig.header?.subtitle ?? "Stateless Admin",
  settingsLabel: state.layoutConfig.header?.settingsLabel ?? "Settings",
  themeLabel: state.layoutConfig.header?.themeLabel ?? "Theme",
  createLabel: state.layoutConfig.header?.createLabel ?? "Create +",
  profileLabel: state.layoutConfig.header?.profileLabel ?? "Profile",
  logoutLabel: state.layoutConfig.header?.logoutLabel ?? "Logout"
});
var sidebarCopy = () => ({
  publicLabel: state.layoutConfig.sidebar?.publicLabel ?? "Public",
  privateLabel: state.layoutConfig.sidebar?.privateLabel ?? "Private"
});
var profileCopy = () => ({
  title: state.layoutConfig.profile?.title ?? "Profile",
  subtitle: state.layoutConfig.profile?.subtitle ?? "\u0395\u03BD\u03B7\u03BC\u03B5\u03C1\u03CE\u03C3\u03C4\u03B5 \u03C4\u03B1 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1 \u03C3\u03B1\u03C2.",
  saveLabel: state.layoutConfig.profile?.saveLabel ?? "Save Profile"
});

// web/src/ui/shell.ts
var renderAppShell = ({ moduleChecklistHtml: moduleChecklistHtml2 }) => {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing app container");
  }
  const header = headerCopy();
  const sidebar = sidebarCopy();
  const createIcon = `
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" width="16" height="16" focusable="false" aria-hidden="true">
        <path
          d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1z"
          fill="currentColor"
        ></path>
      </svg>
    </span>
  `;
  const builderIcon = `
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
        <path
          d="M4 7.5A2.5 2.5 0 0 1 6.5 5h6A2.5 2.5 0 0 1 15 7.5v3A2.5 2.5 0 0 1 12.5 13h-6A2.5 2.5 0 0 1 4 10.5zM9 16h8.5A2.5 2.5 0 0 1 20 18.5v0A2.5 2.5 0 0 1 17.5 21H9z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        ></path>
        <path
          d="M17.5 4.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z"
          fill="currentColor"
        ></path>
      </svg>
    </span>
  `;
  const downloadIcon = `
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
        <path
          d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        ></path>
        <path
          d="M14 2v5h5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        ></path>
        <path
          d="M10 7h2v2h-2V7zm0 3h2v2h-2v-2zm0 3h2v2h-2v-2zm0 3h2v2h-2v-2"
          fill="currentColor"
        ></path>
      </svg>
    </span>
  `;
  const themeIcon = `
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        ></circle>
        <path
          d="M12 3v2m0 14v2M3 12h2m14 0h2M6.5 6.5l1.4 1.4m8.2 8.2l1.4 1.4M6.5 17.5l1.4-1.4m8.2-8.2l1.4-1.4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        ></path>
      </svg>
    </span>
  `;
  app.innerHTML = `
    <nav class="navbar app-surface is-spaced" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <a class="navbar-item">
          <span class="title is-5 mb-0">${header.title}</span>
        </a>
        <a
          role="button"
          class="navbar-burger"
          aria-label="Open navigation"
          aria-expanded="false"
          aria-controls="mobileNavDrawer"
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
      <div id="adminNavbar" class="navbar-menu">
        <div class="navbar-start">
          <div class="navbar-item app-muted">${header.subtitle}</div>
        </div>
        <div class="navbar-end">
          <div class="navbar-item">
            <div class="app-nav-actions">
              <button
                id="create-action"
                class="button app-button app-primary app-icon-button"
                data-shell-action="create"
                aria-label="${header.createLabel}"
                title="${header.createLabel}"
              >
                ${createIcon}
              </button>
              <button
                class="button app-button app-ghost"
                type="button"
                data-shell-action="builder"
              >
                ${builderIcon}
                <span>Builder</span>
              </button>
              <button
                id="export-zip-header"
                class="button app-button app-ghost"
                data-shell-action="export"
                aria-label="Download content"
                title="Download content"
              >
                ${downloadIcon}
              </button>
              <button
                id="theme-toggle"
                class="button app-button app-ghost"
                data-shell-action="theme"
                aria-label="${header.themeLabel}"
                title="${header.themeLabel}"
              >
                ${themeIcon}
              </button>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="private-dropdown">
            <a class="navbar-link">${header.settingsLabel}</a>
            <div class="navbar-dropdown">
              <a class="navbar-item" id="modules-link" data-shell-action="modules">Modules</a>
              <a class="navbar-item" id="integrations-link" data-shell-action="integrations">Integrations</a>
              <a class="navbar-item" id="logs-link" data-shell-action="logs">Logs</a>
              <a class="navbar-item is-hidden" id="forms-link" data-shell-action="forms">Forms</a>
              <hr class="navbar-divider" />
              <div id="nav-system-pages"></div>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="agents-dropdown">
            <a class="navbar-link">Agents</a>
            <div class="navbar-dropdown">
              <div id="nav-agents"></div>
              <hr class="navbar-divider" />
              <a class="navbar-item" id="agents-create-link" data-shell-action="agents-create">Create agent</a>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="user-dropdown">
            <a class="navbar-link" id="user-label">${getUserLabel()}</a>
            <div class="navbar-dropdown">
              <a class="navbar-item" id="profile-link" data-shell-action="profile">${header.profileLabel}</a>
              <hr class="navbar-divider" />
              <a class="navbar-item" id="logout" data-shell-action="logout">${header.logoutLabel}</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div id="mobileNavDrawer" class="app-mobile-drawer" aria-hidden="true">
      <button
        class="app-mobile-drawer-backdrop"
        type="button"
        aria-label="Close navigation"
        data-mobile-drawer-close
      ></button>
      <div class="app-mobile-drawer-panel app-surface" role="dialog" aria-modal="true" aria-label="Navigation">
        <div class="app-mobile-drawer-header">
          <div>
            <p class="app-mobile-drawer-eyebrow">${header.title}</p>
            <p class="app-muted">${header.subtitle}</p>
          </div>
          <div class="app-mobile-drawer-header-actions">
            <button
              class="button app-button app-ghost app-icon-button"
              type="button"
              data-shell-action="theme"
              aria-label="${header.themeLabel}"
              title="${header.themeLabel}"
            >
              ${themeIcon}
            </button>
            <button
              class="delete app-mobile-drawer-close"
              type="button"
              aria-label="Close navigation"
              data-mobile-drawer-close
            ></button>
          </div>
        </div>
        <div class="app-mobile-drawer-body">
          <div class="app-mobile-drawer-top-action">
            <button class="button app-button app-primary app-mobile-builder-button" type="button" data-shell-action="builder">
              ${builderIcon}
              <span>Builder</span>
            </button>
          </div>

          <section class="app-mobile-accordion-section">
            <button
              class="app-mobile-accordion-toggle"
              type="button"
              data-mobile-accordion
              aria-expanded="false"
              aria-controls="mobile-public-panel"
            >
              <span>${sidebar.publicLabel}</span>
            </button>
            <div id="mobile-public-panel" class="app-mobile-accordion-panel">
              <ul id="nav-mobile-public" class="menu-list app-mobile-nav-list"></ul>
            </div>
          </section>

          <section class="app-mobile-accordion-section">
            <button
              class="app-mobile-accordion-toggle"
              type="button"
              data-mobile-accordion
              aria-expanded="false"
              aria-controls="mobile-private-panel"
            >
              <span>${sidebar.privateLabel}</span>
            </button>
            <div id="mobile-private-panel" class="app-mobile-accordion-panel">
              <ul id="nav-mobile-private" class="menu-list app-mobile-nav-list"></ul>
            </div>
          </section>

          <section class="app-mobile-accordion-section">
            <button
              class="app-mobile-accordion-toggle"
              type="button"
              data-mobile-accordion
              aria-expanded="false"
              aria-controls="mobile-settings-panel"
            >
              <span>${header.settingsLabel}</span>
            </button>
            <div id="mobile-settings-panel" class="app-mobile-accordion-panel">
              <div class="app-mobile-action-list">
                <a href="#" class="app-mobile-action-link" data-shell-action="modules">Modules</a>
                <a href="#" class="app-mobile-action-link" data-shell-action="integrations">Integrations</a>
                <a href="#" class="app-mobile-action-link" data-shell-action="logs">Logs</a>
                <a
                  href="#"
                  id="forms-link-mobile"
                  class="app-mobile-action-link is-hidden"
                  data-shell-action="forms"
                >
                  Forms
                </a>
              </div>
              <div id="nav-system-pages-mobile" class="app-mobile-action-list app-mobile-system-pages"></div>
            </div>
          </section>

          <section class="app-mobile-accordion-section">
            <button
              class="app-mobile-accordion-toggle"
              type="button"
              data-mobile-accordion
              aria-expanded="false"
              aria-controls="mobile-agents-panel"
            >
              <span>Agents</span>
            </button>
            <div id="mobile-agents-panel" class="app-mobile-accordion-panel">
              <div id="nav-agents-mobile" class="app-mobile-action-list"></div>
              <div class="app-mobile-action-list">
                <a href="#" class="app-mobile-action-link" data-shell-action="agents-create">Create agent</a>
              </div>
            </div>
          </section>

          <section class="app-mobile-accordion-section">
            <button
              class="app-mobile-accordion-toggle"
              type="button"
              data-mobile-accordion
              aria-expanded="false"
              aria-controls="mobile-account-panel"
            >
              <span>${getUserLabel()}</span>
            </button>
            <div id="mobile-account-panel" class="app-mobile-accordion-panel">
              <div class="app-mobile-action-list">
                <a href="#" class="app-mobile-action-link" data-shell-action="profile">
                  ${header.profileLabel}
                </a>
                <a href="#" class="app-mobile-action-link" data-shell-action="logout">
                  ${header.logoutLabel}
                </a>
              </div>
            </div>
          </section>

          <div class="app-mobile-drawer-footer">
            <div class="app-mobile-drawer-footer-row">
              <button class="button app-button app-primary" type="button" data-shell-action="create">
                ${createIcon}
                <span>${header.createLabel}</span>
              </button>
              <button class="button app-button app-ghost" type="button" data-shell-action="export">
                ${downloadIcon}
                <span>Download content</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <section class="section pt-4">
      <div class="container">
        <div class="columns is-variable is-4">
          <aside class="column is-one-quarter app-sidebar-column">
            <div class="box app-surface">
              <aside class="menu">
                <p class="menu-label">${sidebar.publicLabel}</p>
                <ul id="nav-public" class="menu-list"></ul>
                <p class="menu-label mt-4">${sidebar.privateLabel}</p>
                <ul id="nav-private" class="menu-list"></ul>
              </aside>
            </div>
          </aside>
          <div class="column">
            <div id="content" class="box app-surface">
              <p class="app-muted">\u0395\u03C0\u03B9\u03BB\u03AD\u03BE\u03C4\u03B5 \u03BC\u03B9\u03B1 \u03B5\u03BD\u03CC\u03C4\u03B7\u03C4\u03B1.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div id="app-notifications" class="app-notifications"></div>
    <div class="modal" id="create-modal">
      <div class="modal-background" data-close="create"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Create document</p>
          <button class="delete" aria-label="close" data-close="create"></button>
        </header>
        <section class="modal-card-body">
          <div id="create-error" class="notification is-danger is-light is-hidden"></div>
          <form id="create-form">
            <div class="columns is-variable is-4 is-multiline">
              <div class="column is-half">
                <div class="field">
                  <label class="label">Filename</label>
                  <div class="control">
                    <input
                      id="create-path"
                      class="input"
                      type="text"
                      placeholder="content.json"
                      autocomplete="off"
                    />
                  </div>
                  <p class="help">Must end with .json</p>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Order</label>
                  <div class="control">
                    <input
                      id="create-order"
                      class="input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                    />
                  </div>
                  <p class="help">Lower numbers appear first.</p>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Store</label>
                  <div class="control">
                    <div class="tabs is-toggle is-small is-fullwidth">
                      <ul>
                        <li class="is-active">
                          <a href="#" data-store="public">Public</a>
                        </li>
                        <li>
                          <a href="#" data-store="private">Private</a>
                        </li>
                      </ul>
                    </div>
                    <input id="create-store" type="hidden" value="public" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Page</label>
                  <div class="control">
                    <input id="create-page" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Name</label>
                  <div class="control">
                    <input id="create-name" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Language</label>
                  <div class="control">
                    <input id="create-language" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Modules</label>
                  <div class="control">
                    <div id="create-modules" class="app-module-picker">
                      ${moduleChecklistHtml2()}
                    </div>
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Section</label>
                  <div class="control">
                    <div class="select is-fullwidth">
                      <select id="create-section">
                        <option value="false" selected>false</option>
                        <option value="true">true</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div class="column is-full">
                <div class="field">
                  <label class="label">Data (JSON)</label>
                  <div class="control">
                    <textarea id="create-data" class="textarea" rows="6">{}</textarea>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
        <footer class="modal-card-foot">
          <button form="create-form" type="submit" class="button app-button app-primary">Create</button>
          <button id="create-cancel" type="button" class="button app-button app-ghost">Cancel</button>
        </footer>
      </div>
    </div>
    <div class="modal" id="agent-modal">
      <div class="modal-background" data-close="agent"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Create agent</p>
          <button class="delete" aria-label="close" data-close="agent"></button>
        </header>
        <section class="modal-card-body">
          <div id="agent-error" class="notification is-danger is-light is-hidden"></div>
          <form id="agent-form">
            <div class="tabs is-toggle is-fullwidth mb-4">
              <ul>
                <li class="is-active"><a data-agent-store="public">Public</a></li>
                <li><a data-agent-store="private">Private</a></li>
              </ul>
            </div>
            <input type="hidden" id="agent-store" value="public" />
            <div class="columns is-variable is-4 is-multiline">
              <div class="column is-half">
                <div class="field">
                  <label class="label">Name</label>
                  <div class="control">
                    <input id="agent-name" class="input" type="text" placeholder="Assistant" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Provider</label>
                  <div class="control">
                    <div class="select is-fullwidth">
                      <select id="agent-provider"></select>
                    </div>
                  </div>
                  <p id="agent-provider-help" class="help app-muted"></p>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Model</label>
                  <div class="control">
                    <input
                      id="agent-model-search"
                      class="input"
                      type="search"
                      placeholder="Search models"
                      autocomplete="off"
                    />
                  </div>
                  <div class="control mt-2">
                    <div class="select is-fullwidth">
                      <select id="agent-model"></select>
                    </div>
                  </div>
                </div>
              </div>
              <div class="column is-full">
                <div class="field">
                  <label class="label">System prompt</label>
                  <div class="control">
                    <textarea id="agent-system" class="textarea" rows="3" placeholder="System prompt"></textarea>
                  </div>
                </div>
              </div>
              <div class="column is-full">
                <div class="field">
                  <label class="label">Admin prompt</label>
                  <div class="control">
                    <textarea id="agent-admin" class="textarea" rows="3" placeholder="Admin prompt"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
        <footer class="modal-card-foot">
          <button id="agent-cancel" class="button app-button app-ghost">Cancel</button>
          <button
            id="agent-submit"
            form="agent-form"
            type="submit"
            class="button app-button app-primary"
          >
            Create agent
          </button>
        </footer>
      </div>
    </div>
    <div class="modal" id="integration-modal">
      <div class="modal-background" data-close="integration"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title" id="integration-modal-title">Configure integration</p>
          <button class="delete" aria-label="close" data-close="integration"></button>
        </header>
        <section class="modal-card-body">
          <div id="integration-error" class="notification is-danger is-light is-hidden"></div>
          <form id="integration-form">
            <div id="integration-fields" class="app-stack app-gap-md"></div>
          </form>
        </section>
        <footer class="modal-card-foot">
          <button id="integration-cancel" class="button app-button app-ghost">Cancel</button>
          <button form="integration-form" type="submit" class="button app-button app-primary">Save</button>
        </footer>
      </div>
    </div>
  `;
};

// web/src/ui/notifications.ts
var noticeTimer = null;
var noticeListenerAttached = false;
var showNotice = (type, message) => {
  const container = document.getElementById("app-notifications");
  if (!container) {
    return;
  }
  const toneClass = type === "error" ? "app-toast-error" : "app-toast-success";
  container.innerHTML = `
    <div class="notification app-toast ${toneClass}">
      <button class="delete" aria-label="close"></button>
      <span>${message}</span>
    </div>
  `;
  const closeButton = container.querySelector(".delete");
  closeButton?.addEventListener("click", () => {
    container.innerHTML = "";
  });
  if (noticeTimer !== null) {
    window.clearTimeout(noticeTimer);
  }
  noticeTimer = window.setTimeout(() => {
    container.classList.add("app-toast-hide");
    window.setTimeout(() => {
      container.classList.remove("app-toast-hide");
      container.innerHTML = "";
      noticeTimer = null;
    }, 200);
  }, 300);
};
var initNotifications = () => {
  if (noticeListenerAttached) {
    return;
  }
  noticeListenerAttached = true;
  window.addEventListener("app:notice", (event) => {
    const customEvent = event;
    showNotice(customEvent.detail.type, customEvent.detail.message);
  });
};

// web/src/ui/theme.ts
var THEME_KEY = "manage_theme";
var tokenRegistry = [
  "app-gap-xs",
  "app-gap-sm",
  "app-gap-md",
  "app-gap-lg",
  "app-radius-sm",
  "app-radius-md",
  "app-radius-lg",
  "app-shadow",
  "app-border",
  "app-bg",
  "app-surface",
  "app-text",
  "app-muted",
  "app-accent",
  "app-accent-contrast",
  "app-danger"
];
var uiTokens = {
  light: {},
  dark: {}
};
var getStoredTheme = () => {
  const value = localStorage.getItem(THEME_KEY);
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
};
var currentTheme = getStoredTheme() ?? "light";
var applyTokensForTheme = (theme) => {
  const root = document.documentElement;
  const tokens = uiTokens[theme];
  tokenRegistry.forEach((key) => {
    const cssKey = `--${key}`;
    if (tokens[key]) {
      root.style.setProperty(cssKey, tokens[key]);
    } else {
      root.style.removeProperty(cssKey);
    }
  });
};
var setTheme = (theme, persist = true) => {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  applyTokensForTheme(theme);
  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
};
var getCurrentTheme = () => currentTheme;
var applyUiConfig = (config) => {
  const normalize = (input) => {
    const output = {};
    if (!input)
      return output;
    tokenRegistry.forEach((key) => {
      if (input[key]) {
        output[key] = input[key];
      }
    });
    return output;
  };
  uiTokens.light = normalize(config.tokens);
  uiTokens.dark = normalize(config.darkTokens);
  const storedTheme = getStoredTheme();
  if (!storedTheme && (config.theme === "light" || config.theme === "dark")) {
    setTheme(config.theme, false);
    return;
  }
  setTheme(currentTheme, false);
};
var initTheme = () => {
  setTheme(currentTheme, false);
};

// web/src/features/auth/login.ts
init_api();
var renderLogin = (context, error) => {
  const { container, onAuth, onSuccess, onClearAgentState } = context;
  onClearAgentState();
  container.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="box app-surface">
          <div class="mb-4">
            <h1 class="title is-4">Admin Login</h1>
            <p class="app-muted">\u03A3\u03C5\u03BD\u03B4\u03B5\u03B8\u03B5\u03AF\u03C4\u03B5 \u03BC\u03B5 API key \u03AE email/password.</p>
          </div>
          ${error ? `<div class="notification is-danger is-light">${error}</div>` : ""}
          <div class="columns is-variable is-4">
            <div class="column">
              <form id="api-key-form">
                <div class="field">
                  <label class="label">API Key</label>
                  <div class="control">
                    <input class="input" type="password" name="apiKey" required />
                  </div>
                </div>
                <button type="submit" class="button app-button app-primary">\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7 \u03BC\u03B5 API Key</button>
              </form>
            </div>
            <div class="column">
              <form id="user-form">
                <div class="field">
                  <label class="label">Email</label>
                  <div class="control">
                    <input class="input" type="email" name="email" required />
                  </div>
                </div>
                <div class="field">
                  <label class="label">Password</label>
                  <div class="control">
                    <input class="input" type="password" name="password" required />
                  </div>
                </div>
                <button type="submit" class="button app-button app-primary">\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7 \u03C7\u03C1\u03AE\u03C3\u03C4\u03B7</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  const apiKeyForm = document.getElementById("api-key-form");
  const userForm = document.getElementById("user-form");
  apiKeyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(apiKeyForm);
    const apiKey = String(form.get("apiKey") || "");
    if (!apiKey) {
      return;
    }
    try {
      await loginWithApiKey(apiKey);
      const nextAuth = { type: "apiKey", value: apiKey };
      onAuth(nextAuth);
      saveAuth(nextAuth);
      await onSuccess();
    } catch (err) {
      renderLogin(context, err.message);
    }
  });
  userForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(userForm);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    if (!email || !password) {
      return;
    }
    try {
      const result = await loginWithPassword(email, password);
      const nextAuth = { type: "token", value: result.token, user: result.user };
      onAuth(nextAuth);
      saveAuth(nextAuth);
      await onSuccess();
    } catch (err) {
      renderLogin(context, err.message);
    }
  });
};

// web/src/features/auth/profile.ts
init_api();

// web/src/features/chat/runtime.ts
var agentChatCleanup = null;
var moduleChatCleanup = null;
var runCleanup = (cleanup) => {
  if (!cleanup) {
    return;
  }
  cleanup();
};
var registerAgentChatCleanup = (cleanup) => {
  const previous = agentChatCleanup;
  agentChatCleanup = null;
  runCleanup(previous);
  agentChatCleanup = cleanup;
};
var registerModuleChatCleanup = (cleanup) => {
  const previous = moduleChatCleanup;
  moduleChatCleanup = null;
  runCleanup(previous);
  moduleChatCleanup = cleanup;
};
var clearRegisteredChatCleanups = () => {
  const agentCleanup = agentChatCleanup;
  const moduleCleanup = moduleChatCleanup;
  agentChatCleanup = null;
  moduleChatCleanup = null;
  runCleanup(agentCleanup);
  runCleanup(moduleCleanup);
};

// web/src/features/agents/state.ts
var clearAgentState = () => {
  clearRegisteredChatCleanups();
  state.currentAgent = null;
  state.currentConversation = null;
};

// web/src/features/integrations/runtime.ts
var integrationCleanup = null;
var runCleanup2 = (cleanup) => {
  if (!cleanup) {
    return;
  }
  cleanup();
};
var registerIntegrationCleanup = (cleanup) => {
  const previous = integrationCleanup;
  integrationCleanup = null;
  runCleanup2(previous);
  integrationCleanup = cleanup;
};
var clearRegisteredIntegrationCleanup = () => {
  const cleanup = integrationCleanup;
  integrationCleanup = null;
  runCleanup2(cleanup);
};

// web/src/features/auth/profile.ts
var renderProfile = async () => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }
  clearAgentState();
  clearRegisteredIntegrationCleanup();
  const auth = state.auth;
  if (!isTokenAuth(auth) || !auth.user) {
    content.innerHTML = `<p class="app-muted">\u0394\u03B5\u03BD \u03C5\u03C0\u03AC\u03C1\u03C7\u03B5\u03B9 \u03C0\u03C1\u03BF\u03C6\u03AF\u03BB \u03B3\u03B9\u03B1 API key \u03C3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7.</p>`;
    return;
  }
  const currentUser = auth.user;
  if (!state.authDocumentId) {
    content.innerHTML = `<p class="app-muted">\u0394\u03B5\u03BD \u03B2\u03C1\u03AD\u03B8\u03B7\u03BA\u03B5 auth.json.</p>`;
    return;
  }
  let authDoc;
  try {
    authDoc = await fetchDocument(auth, state.authDocumentId);
  } catch (err) {
    content.innerHTML = `<p class="app-muted">${err.message}</p>`;
    return;
  }
  const data = authDoc.payload.data;
  if (!isAuthData(data)) {
    content.innerHTML = `<p class="app-muted">\u03A4\u03BF auth.json \u03B4\u03B5\u03BD \u03AD\u03C7\u03B5\u03B9 users.</p>`;
    return;
  }
  const users = data.users;
  const index = users.findIndex((user) => {
    if (user.email === currentUser.email)
      return true;
    if (user.id && user.id === currentUser.id)
      return true;
    if (user.uuid && user.uuid === currentUser.id)
      return true;
    return false;
  });
  if (index < 0) {
    content.innerHTML = `<p class="app-muted">\u039F \u03C7\u03C1\u03AE\u03C3\u03C4\u03B7\u03C2 \u03B4\u03B5\u03BD \u03B2\u03C1\u03AD\u03B8\u03B7\u03BA\u03B5 \u03C3\u03C4\u03BF auth.json.</p>`;
    return;
  }
  const current = users[index];
  const profile = profileCopy();
  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${profile.title}</h1>
      <p class="app-muted">${profile.subtitle}</p>
    </div>
    <div class="columns is-variable is-4 is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label">First Name</label>
          <div class="control">
            <input id="profile-firstname" class="input" type="text" value="${current.firstname || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Last Name</label>
          <div class="control">
            <input id="profile-lastname" class="input" type="text" value="${current.lastname || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Email</label>
          <div class="control">
            <input id="profile-email" class="input" type="email" value="${current.email || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Password</label>
          <div class="control">
            <input id="profile-password" class="input" type="password" placeholder="Leave blank to keep" />
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <button id="profile-save" class="button app-button app-primary">${profile.saveLabel}</button>
    </div>
  `;
  document.getElementById("profile-save")?.addEventListener("click", async () => {
    if (!isTokenAuth(state.auth) || !state.auth.user) {
      return;
    }
    const firstname = document.getElementById("profile-firstname")?.value.trim();
    const lastname = document.getElementById("profile-lastname")?.value.trim();
    const email = document.getElementById("profile-email")?.value.trim();
    const password = document.getElementById("profile-password")?.value.trim();
    const updatedUser = {
      ...current,
      firstname: firstname ?? current.firstname,
      lastname: lastname ?? current.lastname,
      email: email ?? current.email
    };
    if (password) {
      updatedUser.password = password;
    }
    const updatedUsers = [...users];
    updatedUsers[index] = updatedUser;
    const updatedPayload = {
      ...authDoc.payload,
      data: {
        ...data,
        users: updatedUsers
      }
    };
    try {
      await updateDocument(state.auth, authDoc.id, updatedPayload);
      state.auth = {
        ...state.auth,
        user: {
          ...state.auth.user,
          firstname: updatedUser.firstname,
          lastname: updatedUser.lastname,
          email: updatedUser.email
        }
      };
      saveAuth(state.auth);
      renderProfile();
    } catch (err) {
      alert(err.message);
    }
  });
};

// web/src/app/shell-events.ts
var MOBILE_DRAWER_CLOSE_EVENT = "app:mobile-drawer-close";
var initShellEvents = ({
  onLogout,
  onShowProfile,
  onShowModules,
  onShowIntegrations,
  onShowLogs,
  onShowForms,
  onExportAll,
  onOpenBuilder,
  onOpenCreate,
  onOpenAgentModal
}) => {
  const burger = document.querySelector(".navbar-burger");
  const drawer = document.getElementById("mobileNavDrawer");
  const dropdowns = [
    document.getElementById("private-dropdown"),
    document.getElementById("agents-dropdown"),
    document.getElementById("user-dropdown")
  ];
  const closeDropdowns = () => {
    dropdowns.forEach((dropdown) => dropdown?.classList.remove("is-active"));
  };
  const setMobileDrawerOpen = (isOpen) => {
    burger?.classList.toggle("is-active", isOpen);
    burger?.setAttribute("aria-expanded", String(isOpen));
    drawer?.classList.toggle("is-open", isOpen);
    drawer?.setAttribute("aria-hidden", String(!isOpen));
    document.body.classList.toggle("app-mobile-drawer-open", isOpen);
  };
  const closeAllNavigation = () => {
    closeDropdowns();
    setMobileDrawerOpen(false);
  };
  burger?.addEventListener("click", () => {
    const isOpen = !(drawer?.classList.contains("is-open") ?? false);
    closeDropdowns();
    setMobileDrawerOpen(isOpen);
  });
  drawer?.querySelectorAll("[data-mobile-drawer-close]").forEach((element) => {
    element.addEventListener("click", () => {
      setMobileDrawerOpen(false);
    });
  });
  document.addEventListener(MOBILE_DRAWER_CLOSE_EVENT, () => {
    setMobileDrawerOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllNavigation();
    }
  });
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (event) => {
    if (event.matches) {
      setMobileDrawerOpen(false);
    }
  });
  drawer?.querySelectorAll("[data-mobile-accordion]").forEach((button) => {
    const section = button.closest(".app-mobile-accordion-section");
    button.addEventListener("click", () => {
      if (!section) {
        return;
      }
      const isOpen = section.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });
  dropdowns.forEach((dropdown) => {
    const link = dropdown?.querySelector(".navbar-link");
    link?.addEventListener("click", (event) => {
      event.preventDefault();
      dropdown?.classList.toggle("is-active");
    });
  });
  document.addEventListener("click", (event) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown || dropdown.contains(event.target)) {
        return;
      }
      dropdown.classList.remove("is-active");
    });
  });
  const bindAction = (action, handler) => {
    document.querySelectorAll(`[data-shell-action="${action}"]`).forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        closeAllNavigation();
        handler();
      });
    });
  };
  bindAction("logout", onLogout);
  bindAction("profile", onShowProfile);
  bindAction("modules", onShowModules);
  bindAction("integrations", onShowIntegrations);
  bindAction("logs", onShowLogs);
  bindAction("forms", onShowForms);
  bindAction("export", onExportAll);
  bindAction("builder", onOpenBuilder);
  bindAction("create", onOpenCreate);
  bindAction("agents-create", onOpenAgentModal);
  bindAction("theme", () => {
    const next = getCurrentTheme() === "light" ? "dark" : "light";
    setTheme(next);
  });
};

// web/src/features/modals/create-document.ts
init_api();

// web/src/features/modules/helpers.ts
var normalizeModuleList = (modulesValue, fallback) => {
  const list = Array.isArray(modulesValue) ? [...modulesValue] : [];
  if (fallback && !list.includes(fallback)) {
    list.push(fallback);
  }
  return list.map((entry) => entry.trim()).filter((entry) => entry !== "").filter((entry, index, self) => self.indexOf(entry) === index);
};
var moduleChecklistHtml = (modules, selected = []) => {
  if (!modules.length) {
    return `<p class="help">No modules available.</p>`;
  }
  const selectedSet = new Set(selected);
  return modules.map((module) => {
    const isChecked = selectedSet.has(module.name);
    const description = module.description ? `<span class="app-module-option-meta">${module.description}</span>` : "";
    return `
        <label class="checkbox app-module-option">
          <input type="checkbox" value="${module.name}" ${isChecked ? "checked" : ""} />
          <span class="app-module-option-label">${module.name}</span>
          ${description}
        </label>
      `;
  }).join("");
};
var readSelectedModules = (container) => {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll("input[type='checkbox']")).filter((input) => input.checked).map((input) => input.value.trim()).filter((value) => value !== "");
};
var findModuleDefinition = (modules, name) => modules.find((module) => module.name === name) ?? null;

// web/src/features/modals/create-document.ts
var initCreateModal = ({ getAuth, onCreated, refreshNavigation: refreshNavigation2 }) => {
  const createModal = document.getElementById("create-modal");
  const createError = document.getElementById("create-error");
  const createForm = document.getElementById("create-form");
  const createStoreInput = document.getElementById("create-store");
  const createStoreTabs = Array.from(
    createModal?.querySelectorAll("[data-store]") ?? []
  );
  const showCreateError = (message) => {
    if (!createError) {
      alert(message);
      return;
    }
    createError.textContent = message;
    createError.classList.remove("is-hidden");
  };
  const clearCreateError = () => {
    if (!createError) {
      return;
    }
    createError.textContent = "";
    createError.classList.add("is-hidden");
  };
  const setCreateStore = (store) => {
    if (createStoreInput) {
      createStoreInput.value = store;
    }
    createStoreTabs.forEach((tab) => {
      const value = tab.getAttribute("data-store");
      tab.parentElement?.classList.toggle("is-active", value === store);
    });
  };
  const openCreateModal = () => {
    clearCreateError();
    createForm?.reset();
    const dataInput = document.getElementById("create-data");
    if (dataInput) {
      dataInput.value = "{}";
    }
    setCreateStore("public");
    createModal?.classList.add("is-active");
  };
  const closeCreateModal = () => {
    createModal?.classList.remove("is-active");
    clearCreateError();
  };
  document.getElementById("create-cancel")?.addEventListener("click", closeCreateModal);
  createModal?.querySelectorAll("[data-close='create']").forEach((el) => {
    el.addEventListener("click", closeCreateModal);
  });
  createStoreTabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const value = tab.getAttribute("data-store");
      if (value === "public" || value === "private") {
        setCreateStore(value);
      }
    });
  });
  createForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const auth = getAuth();
    if (!auth) {
      return;
    }
    clearCreateError();
    const path = document.getElementById("create-path")?.value.trim() || "";
    const orderRaw = document.getElementById("create-order")?.value.trim() || "";
    const page = document.getElementById("create-page")?.value.trim() || "";
    const name = document.getElementById("create-name")?.value.trim() || "";
    const language = document.getElementById("create-language")?.value.trim() || "";
    const modulesValue = readSelectedModules(document.getElementById("create-modules"));
    const section = document.getElementById("create-section")?.value === "true";
    const storeValue = document.getElementById("create-store")?.value === "private" ? "private" : "public";
    const dataRaw = document.getElementById("create-data")?.value.trim() || "";
    if (!path) {
      showCreateError("Filename is required.");
      return;
    }
    if (!path.endsWith(".json")) {
      showCreateError("Filename must end with .json.");
      return;
    }
    if (path.includes("/") || path.includes("\\") || path.includes("..")) {
      showCreateError("Filename must not include path separators.");
      return;
    }
    if (!page) {
      showCreateError("Page is required.");
      return;
    }
    if (!name) {
      showCreateError("Name is required.");
      return;
    }
    if (!orderRaw) {
      showCreateError("Order is required.");
      return;
    }
    const orderValue = Number(orderRaw);
    if (!Number.isInteger(orderValue)) {
      showCreateError("Order must be an integer.");
      return;
    }
    if (!dataRaw) {
      showCreateError("Data is required.");
      return;
    }
    let data;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      showCreateError("Data must be valid JSON.");
      return;
    }
    const payloadToCreate = {
      type: "page",
      page,
      name,
      language: language || void 0,
      order: orderValue,
      section,
      modules: modulesValue.length ? modulesValue : void 0,
      data
    };
    try {
      const created = await createDocument(auth, {
        store: storeValue,
        path,
        payload: payloadToCreate
      });
      closeCreateModal();
      await refreshNavigation2();
      await onCreated(created.id);
    } catch (err) {
      showCreateError(err.message);
    }
  });
  return { openCreateModal };
};

// web/src/features/modals/create-agent.ts
init_api();

// web/src/features/integrations/helpers.ts
var getEnabledIntegrations = (integrations) => integrations.filter((integration) => integration.enabled);
var getIntegrationModels = (integrationSettings, name) => {
  const settings = integrationSettings[name];
  const models = settings?.models;
  if (!Array.isArray(models)) {
    return [];
  }
  return models.filter((model) => typeof model === "string");
};
var populateProviderSelect = (select, integrations, selectedProvider, help, includeDisabledCurrent = false) => {
  const enabled = getEnabledIntegrations(integrations);
  select.innerHTML = "";
  if (!enabled.length) {
    const option = new Option("No integrations enabled", "", true, true);
    option.disabled = true;
    select.append(option);
    select.disabled = true;
    if (help) {
      help.textContent = "Enable an integration from Settings > Integrations.";
    }
    return "";
  }
  select.disabled = false;
  if (includeDisabledCurrent && selectedProvider) {
    const exists = enabled.some((integration) => integration.name === selectedProvider);
    if (!exists) {
      const option = new Option(`${selectedProvider} (disabled)`, selectedProvider, true, true);
      option.disabled = true;
      select.append(option);
      if (help) {
        help.textContent = "Current provider is disabled. Select an enabled provider.";
      }
    } else if (help) {
      help.textContent = "";
    }
  } else if (help) {
    help.textContent = "";
  }
  enabled.forEach((integration) => {
    const option = new Option(integration.name, integration.name);
    select.append(option);
  });
  const defaultProvider = enabled[0]?.name ?? "";
  const provider = selectedProvider && enabled.some((integration) => integration.name === selectedProvider) ? selectedProvider : defaultProvider;
  if (provider) {
    select.value = provider;
  }
  return select.value;
};
var populateModelSelect = (select, models, selectedModel, includeDisabledCurrent = false) => {
  select.innerHTML = "";
  if (!models.length) {
    const option = new Option("No models synced", "", true, true);
    option.disabled = true;
    select.append(option);
    select.disabled = true;
    return "";
  }
  select.disabled = false;
  if (includeDisabledCurrent && selectedModel && !models.includes(selectedModel)) {
    const option = new Option(`${selectedModel} (unavailable)`, selectedModel, true, true);
    option.disabled = true;
    select.append(option);
  }
  models.forEach((model2) => {
    const option = new Option(model2, model2);
    select.append(option);
  });
  const defaultModel = models[0] ?? "";
  const model = selectedModel && models.includes(selectedModel) ? selectedModel : defaultModel;
  if (model) {
    select.value = model;
  }
  return select.value;
};
var setupProviderModelControls = (providerSelect, modelSelect, modelSearch, providerHelp, integrations, integrationSettings, selectedProvider, selectedModel, includeDisabledCurrent = false) => {
  const modelsForProvider = (provider) => getIntegrationModels(integrationSettings, provider);
  let activeProvider = populateProviderSelect(
    providerSelect,
    integrations,
    selectedProvider,
    providerHelp,
    includeDisabledCurrent
  );
  let availableModels = modelsForProvider(activeProvider);
  let activeModel = populateModelSelect(
    modelSelect,
    availableModels,
    selectedModel,
    includeDisabledCurrent
  );
  const applySearch = () => {
    if (!modelSearch) {
      return;
    }
    const query = modelSearch.value.trim().toLowerCase();
    const filtered = query ? availableModels.filter((model) => model.toLowerCase().includes(query)) : availableModels;
    activeModel = populateModelSelect(modelSelect, filtered, activeModel, includeDisabledCurrent);
  };
  providerSelect.addEventListener("change", () => {
    activeProvider = providerSelect.value;
    availableModels = modelsForProvider(activeProvider);
    activeModel = populateModelSelect(modelSelect, availableModels, null, includeDisabledCurrent);
    applySearch();
  });
  modelSelect.addEventListener("change", () => {
    activeModel = modelSelect.value;
  });
  modelSearch?.addEventListener("input", applySearch);
  return {
    getProvider: () => activeProvider,
    getModel: () => activeModel
  };
};

// web/src/features/modals/create-agent.ts
var initAgentModal = ({ getAuth, reloadAgents, onAgentCreated }) => {
  const agentModal = document.getElementById("agent-modal");
  const agentError = document.getElementById("agent-error");
  const agentForm = document.getElementById("agent-form");
  const agentStoreInput = document.getElementById("agent-store");
  const agentStoreTabs = Array.from(
    agentModal?.querySelectorAll("[data-agent-store]") ?? []
  );
  const agentProviderSelect = document.getElementById("agent-provider");
  const agentModelSelect = document.getElementById("agent-model");
  const agentModelSearch = document.getElementById("agent-model-search");
  const agentProviderHelp = document.getElementById("agent-provider-help");
  const agentSubmit = document.getElementById("agent-submit");
  const showAgentError = (message) => {
    if (!agentError) {
      alert(message);
      return;
    }
    agentError.textContent = message;
    agentError.classList.remove("is-hidden");
  };
  const clearAgentError = () => {
    if (!agentError) {
      return;
    }
    agentError.textContent = "";
    agentError.classList.add("is-hidden");
  };
  const setAgentStore = (store) => {
    if (agentStoreInput) {
      agentStoreInput.value = store;
    }
    agentStoreTabs.forEach((tab) => {
      const value = tab.getAttribute("data-agent-store");
      tab.parentElement?.classList.toggle("is-active", value === store);
    });
  };
  const refreshControls = () => {
    if (!agentProviderSelect || !agentModelSelect) {
      return;
    }
    setupProviderModelControls(
      agentProviderSelect,
      agentModelSelect,
      agentModelSearch,
      agentProviderHelp,
      state.integrations,
      state.integrationSettings
    );
    if (agentSubmit) {
      agentSubmit.disabled = agentModelSelect.disabled || agentProviderSelect.disabled;
    }
  };
  const updateSubmitState = () => {
    if (agentSubmit && agentProviderSelect && agentModelSelect) {
      agentSubmit.disabled = agentModelSelect.disabled || agentProviderSelect.disabled;
    }
  };
  agentProviderSelect?.addEventListener("change", updateSubmitState);
  agentModelSelect?.addEventListener("change", updateSubmitState);
  const openAgentModal = () => {
    clearAgentError();
    agentForm?.reset();
    setAgentStore("public");
    refreshControls();
    agentModal?.classList.add("is-active");
  };
  const closeAgentModal = () => {
    agentModal?.classList.remove("is-active");
    clearAgentError();
  };
  document.getElementById("agent-cancel")?.addEventListener("click", closeAgentModal);
  agentModal?.querySelectorAll("[data-close='agent']").forEach((el) => {
    el.addEventListener("click", closeAgentModal);
  });
  agentStoreTabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const value = tab.getAttribute("data-agent-store");
      if (value === "public" || value === "private") {
        setAgentStore(value);
      }
    });
  });
  agentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const auth = getAuth();
    if (!auth) {
      return;
    }
    clearAgentError();
    const name = document.getElementById("agent-name")?.value.trim() || "";
    const provider = agentProviderSelect?.value.trim() || "";
    const model = agentModelSelect?.value.trim() || "";
    const systemPrompt = document.getElementById("agent-system")?.value.trim() || "";
    const adminPrompt = document.getElementById("agent-admin")?.value.trim() || "";
    const storeValue = document.getElementById("agent-store")?.value === "private" ? "private" : "public";
    if (!name || !provider || !model || !systemPrompt || !adminPrompt) {
      showAgentError("All fields are required.");
      return;
    }
    if (agentProviderSelect?.disabled || agentModelSelect?.disabled) {
      showAgentError("Enable an integration and sync models first.");
      return;
    }
    try {
      const created = await createAgent(auth, {
        store: storeValue,
        name,
        provider,
        model,
        systemPrompt,
        adminPrompt
      });
      closeAgentModal();
      await reloadAgents();
      await onAgentCreated(created.id);
    } catch (err) {
      showAgentError(err.message);
    }
  });
  return { openAgentModal, refreshControls };
};

// web/src/features/modals/integration.ts
init_api();
var initIntegrationModal = ({
  getAuth,
  reloadIntegrations,
  onAfterSave
}) => {
  const integrationModal = document.getElementById("integration-modal");
  const integrationForm = document.getElementById("integration-form");
  const integrationFields = document.getElementById("integration-fields");
  const integrationError = document.getElementById("integration-error");
  const integrationTitle = document.getElementById("integration-modal-title");
  const integrationCancel = document.getElementById("integration-cancel");
  let currentIntegration = null;
  const showIntegrationError = (message) => {
    if (!integrationError) {
      alert(message);
      return;
    }
    integrationError.textContent = message;
    integrationError.classList.remove("is-hidden");
  };
  const clearIntegrationError = () => {
    if (!integrationError) {
      return;
    }
    integrationError.textContent = "";
    integrationError.classList.add("is-hidden");
  };
  const closeIntegrationModal = () => {
    integrationModal?.classList.remove("is-active");
    clearIntegrationError();
    currentIntegration = null;
  };
  const getDefaultFieldValue = (integration, key) => {
    if (integration.name === "codex-cli") {
      switch (key) {
        case "authMode":
          return "cliAuth";
        case "binary":
          return "codex";
        case "args":
          return "--dangerously-bypass-approvals-and-sandbox exec --json --output-last-message {outputFile} --skip-git-repo-check --cd {workingDir} --model {model}";
        case "workingDir":
          return "/app";
        default:
          return "";
      }
    }
    return "";
  };
  const buildIntegrationFields = (integration) => {
    if (!integrationFields) {
      return;
    }
    integrationFields.innerHTML = "";
    const existing = state.integrationSettings[integration.name];
    if (integration.name === "codex-cli") {
      const notice = document.createElement("div");
      notice.className = "notification is-light app-muted";
      notice.innerHTML = "Development setup: use <code>CLI authentication</code> to avoid API costs, then run <code>docker compose exec manage codex login --device-auth</code> once. The Docker volume keeps the Codex credentials between restarts.";
      integrationFields.appendChild(notice);
    }
    integration.fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = "field";
      wrapper.dataset.integrationFieldKey = field.key;
      const label = document.createElement("label");
      label.className = "label";
      label.textContent = field.label;
      const existingValue = existing?.[field.key];
      const fallback = integration.name === "codex-cli" && field.key === "authMode" && typeof existing?.apiKey === "string" && existing.apiKey.trim() !== "" ? "apiKey" : getDefaultFieldValue(integration, field.key);
      const initialValue = typeof existingValue === "string" ? existingValue : fallback;
      if (field.type === "select") {
        const control = document.createElement("div");
        control.className = "control";
        const selectWrap = document.createElement("div");
        selectWrap.className = "select is-fullwidth";
        const select = document.createElement("select");
        select.id = `integration-${integration.name}-${field.key}`;
        select.required = field.required;
        (field.options ?? []).forEach((option) => {
          const optionEl = document.createElement("option");
          optionEl.value = option.value;
          optionEl.textContent = option.label;
          select.appendChild(optionEl);
        });
        if (initialValue) {
          select.value = initialValue;
        }
        selectWrap.appendChild(select);
        control.appendChild(selectWrap);
        wrapper.appendChild(label);
        wrapper.appendChild(control);
      } else {
        const input = document.createElement("input");
        input.className = "input";
        input.type = field.type === "password" ? "password" : "text";
        input.id = `integration-${integration.name}-${field.key}`;
        input.autocomplete = "off";
        input.required = field.required;
        if (initialValue && (field.type !== "password" || typeof existingValue === "string")) {
          input.value = initialValue;
        }
        wrapper.appendChild(label);
        if (field.type === "password") {
          const fieldRow = document.createElement("div");
          fieldRow.className = "field has-addons";
          const inputControl = document.createElement("div");
          inputControl.className = "control is-expanded";
          inputControl.appendChild(input);
          const buttonControl = document.createElement("div");
          buttonControl.className = "control";
          const toggleButton = document.createElement("button");
          toggleButton.type = "button";
          toggleButton.className = "button app-button app-ghost";
          toggleButton.innerHTML = `
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
                <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                ></path>
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"></circle>
              </svg>
            </span>
          `;
          toggleButton.addEventListener("click", () => {
            input.type = input.type === "password" ? "text" : "password";
          });
          buttonControl.appendChild(toggleButton);
          fieldRow.appendChild(inputControl);
          fieldRow.appendChild(buttonControl);
          wrapper.appendChild(fieldRow);
        } else {
          const control = document.createElement("div");
          control.className = "control";
          control.appendChild(input);
          wrapper.appendChild(control);
        }
      }
      if (field.required) {
        const help = document.createElement("p");
        help.className = "help app-muted";
        help.textContent = "Required";
        help.dataset.integrationRequired = field.key;
        wrapper.appendChild(help);
      }
      integrationFields.appendChild(wrapper);
    });
    if (integration.name === "codex-cli") {
      const authMode = document.getElementById("integration-codex-cli-authMode");
      const apiKeyWrapper = integrationFields.querySelector("[data-integration-field-key='apiKey']");
      const apiKeyInput = document.getElementById("integration-codex-cli-apiKey");
      const apiKeyHelp = integrationFields.querySelector("[data-integration-required='apiKey']");
      const syncCodexAuthMode = () => {
        const usingApiKey = authMode?.value === "apiKey";
        if (apiKeyWrapper) {
          apiKeyWrapper.classList.toggle("is-hidden", !usingApiKey);
        }
        if (apiKeyInput) {
          apiKeyInput.required = usingApiKey;
        }
        if (apiKeyHelp) {
          apiKeyHelp.classList.toggle("is-hidden", !usingApiKey);
        }
      };
      authMode?.addEventListener("change", syncCodexAuthMode);
      syncCodexAuthMode();
    }
  };
  const openIntegrationModal = (integration) => {
    currentIntegration = integration;
    clearIntegrationError();
    if (integrationTitle) {
      integrationTitle.textContent = `${integration.enabled ? "Edit" : "Enable"} ${integration.name}`;
    }
    buildIntegrationFields(integration);
    integrationModal?.classList.add("is-active");
  };
  integrationCancel?.addEventListener("click", closeIntegrationModal);
  integrationModal?.querySelectorAll("[data-close='integration']").forEach((el) => {
    el.addEventListener("click", closeIntegrationModal);
  });
  integrationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const auth = getAuth();
    if (!auth || !currentIntegration) {
      return;
    }
    clearIntegrationError();
    const payload = {};
    for (const field of currentIntegration.fields) {
      const input = document.getElementById(
        `integration-${currentIntegration.name}-${field.key}`
      );
      const value = input?.value.trim() || "";
      if (!value) {
        const codexApiKeyRequired = currentIntegration.name === "codex-cli" && field.key === "apiKey" && document.getElementById("integration-codex-cli-authMode")?.value === "apiKey";
        if (field.required || codexApiKeyRequired) {
          showIntegrationError(`${field.label} is required.`);
          return;
        }
        continue;
      }
      payload[field.key] = value;
    }
    try {
      await updateIntegrationSettings(auth, currentIntegration.name, payload);
      closeIntegrationModal();
      await reloadIntegrations();
      onAfterSave();
    } catch (err) {
      showIntegrationError(err.message);
    }
  });
  return { openIntegrationModal };
};

// web/src/features/realtime/client.ts
init_api();
var socket = null;
var authProvider = null;
var reconnectTimer = null;
var reconnectAttempt = 0;
var active = false;
var status = "idle";
var eventListeners = /* @__PURE__ */ new Set();
var statusListeners = /* @__PURE__ */ new Set();
var hasSubscribers = () => eventListeners.size > 0 || statusListeners.size > 0;
var setStatus = (next) => {
  status = next;
  statusListeners.forEach((listener) => listener(next));
};
var clearReconnectTimer = () => {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};
var closeSocket = () => {
  if (!socket) {
    return;
  }
  const current = socket;
  socket = null;
  current.close();
};
var scheduleReconnect = () => {
  if (!active || reconnectTimer !== null || !hasSubscribers()) {
    return;
  }
  const delay = Math.min(1e3 * 2 ** reconnectAttempt, 15e3);
  reconnectAttempt += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    void connect();
  }, delay);
};
var currentAuth = () => authProvider ? authProvider() : null;
var connect = async () => {
  if (!active || socket !== null || !hasSubscribers()) {
    return;
  }
  const auth = currentAuth();
  if (!auth) {
    setStatus("idle");
    return;
  }
  setStatus("connecting");
  try {
    const ticket = await fetchRealtimeTicket(auth);
    const url = new URL(ticket.url);
    url.searchParams.set("ticket", ticket.ticket);
    socket = new WebSocket(url.toString());
    socket.addEventListener("open", () => {
      reconnectAttempt = 0;
      setStatus("open");
    });
    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(String(event.data));
        eventListeners.forEach((listener) => listener(payload));
      } catch {
      }
    });
    socket.addEventListener("close", () => {
      socket = null;
      if (!active || !hasSubscribers()) {
        setStatus("idle");
        return;
      }
      setStatus("closed");
      scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      socket?.close();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Realtime connection failed.";
    if (message.toLowerCase() === "unauthorized") {
      active = false;
      setStatus("unauthorized");
      return;
    }
    setStatus("closed");
    scheduleReconnect();
  }
};
var startRealtime = (getAuth) => {
  authProvider = getAuth;
  active = true;
  clearReconnectTimer();
};
var stopRealtime = () => {
  active = false;
  reconnectAttempt = 0;
  clearReconnectTimer();
  setStatus("idle");
  closeSocket();
};
var subscribeRealtime = (listener) => {
  eventListeners.add(listener);
  if (active) {
    void connect();
  }
  return () => {
    eventListeners.delete(listener);
    if (!hasSubscribers()) {
      reconnectAttempt = 0;
      clearReconnectTimer();
      setStatus("idle");
      closeSocket();
    }
  };
};
var subscribeRealtimeStatus = (listener) => {
  statusListeners.add(listener);
  listener(status);
  if (active) {
    void connect();
  }
  return () => {
    statusListeners.delete(listener);
    if (!hasSubscribers()) {
      reconnectAttempt = 0;
      clearReconnectTimer();
      setStatus("idle");
      closeSocket();
    }
  };
};

// web/src/app/loaders.ts
init_api();

// web/src/app/navigation.ts
var MOBILE_DRAWER_CLOSE_EVENT2 = "app:mobile-drawer-close";
var findAuthDocumentId = (pages) => {
  for (const page of pages) {
    if (page.store === "private" && page.path?.endsWith("auth.json") && page.documentId) {
      return page.documentId;
    }
    for (const section of page.sections) {
      if (section.store === "private" && section.path.endsWith("auth.json")) {
        return section.id;
      }
    }
  }
  return null;
};
var closeMobileDrawer = () => {
  document.dispatchEvent(new CustomEvent(MOBILE_DRAWER_CLOSE_EVENT2));
};
var isCurrentDocument = (documentId, variants) => {
  const currentId = state.currentDocument?.id;
  return !!currentId && (documentId === currentId || (variants ?? []).some((variant) => variant.id === currentId));
};
var renderDesktopNavList = (container, pages, mode, onSelectDocument) => {
  container.innerHTML = "";
  pages.filter((page) => page.store === mode && page.position !== "system").forEach((page) => {
    const pageItem = document.createElement("li");
    const pageLink = document.createElement("a");
    pageLink.textContent = page.name;
    if (isCurrentDocument(page.documentId, page.variants)) {
      pageLink.classList.add("is-active");
    }
    pageLink.addEventListener("click", () => {
      if (page.documentId) {
        onSelectDocument(page.documentId);
      }
    });
    pageItem.append(pageLink);
    const sections = page.sections.filter(
      (section) => section.store === mode && section.position !== "system"
    );
    if (sections.length > 0) {
      const sectionList = document.createElement("ul");
      sections.forEach((section) => {
        const sectionItem = document.createElement("li");
        const sectionLink = document.createElement("a");
        sectionLink.textContent = section.name;
        if (isCurrentDocument(section.id, section.variants)) {
          sectionLink.classList.add("is-active");
        }
        sectionLink.addEventListener("click", () => {
          onSelectDocument(section.id);
        });
        sectionItem.append(sectionLink);
        sectionList.append(sectionItem);
      });
      pageItem.append(sectionList);
    }
    container.append(pageItem);
  });
};
var renderMobileNavList = (container, pages, mode, onSelectDocument) => {
  container.innerHTML = "";
  pages.filter((page) => page.store === mode && page.position !== "system").forEach((page, index) => {
    const pageItem = document.createElement("li");
    pageItem.className = "app-mobile-nav-item";
    const pageLink = document.createElement("a");
    pageLink.className = "app-mobile-nav-link";
    pageLink.href = "#";
    pageLink.textContent = page.name;
    if (isCurrentDocument(page.documentId, page.variants)) {
      pageLink.classList.add("is-active");
    }
    pageLink.addEventListener("click", (event) => {
      event.preventDefault();
      if (!page.documentId) {
        return;
      }
      onSelectDocument(page.documentId);
      closeMobileDrawer();
    });
    const sections = page.sections.filter(
      (section) => section.store === mode && section.position !== "system"
    );
    if (sections.length === 0) {
      pageItem.append(pageLink);
      container.append(pageItem);
      return;
    }
    const row = document.createElement("div");
    row.className = "app-mobile-nav-row";
    row.append(pageLink);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "app-mobile-nav-disclosure";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", `mobile-nav-submenu-${mode}-${index}`);
    toggle.setAttribute("aria-label", `Toggle ${page.name} sections`);
    toggle.innerHTML = `<span aria-hidden="true">+</span>`;
    toggle.addEventListener("click", () => {
      const isOpen = pageItem.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.innerHTML = `<span aria-hidden="true">${isOpen ? "-" : "+"}</span>`;
    });
    row.append(toggle);
    pageItem.append(row);
    const sectionList = document.createElement("ul");
    sectionList.id = `mobile-nav-submenu-${mode}-${index}`;
    sectionList.className = "app-mobile-nav-submenu";
    sections.forEach((section) => {
      const sectionItem = document.createElement("li");
      const sectionLink = document.createElement("a");
      sectionLink.className = "app-mobile-nav-sublink";
      sectionLink.href = "#";
      sectionLink.textContent = section.name;
      if (isCurrentDocument(section.id, section.variants)) {
        sectionLink.classList.add("is-active");
      }
      sectionLink.addEventListener("click", (event) => {
        event.preventDefault();
        onSelectDocument(section.id);
        closeMobileDrawer();
      });
      sectionItem.append(sectionLink);
      sectionList.append(sectionItem);
    });
    pageItem.append(sectionList);
    container.append(pageItem);
  });
};
var renderNavigation = (pages, onSelectDocument) => {
  const navPublic = document.getElementById("nav-public");
  const navPrivate = document.getElementById("nav-private");
  const navPublicMobile = document.getElementById("nav-mobile-public");
  const navPrivateMobile = document.getElementById("nav-mobile-private");
  const navSystem = document.getElementById("nav-system-pages");
  const navSystemMobile = document.getElementById("nav-system-pages-mobile");
  if (!navPublic || !navPrivate || !navSystem) {
    return;
  }
  state.authDocumentId = findAuthDocumentId(pages);
  renderDesktopNavList(navPublic, pages, "public", onSelectDocument);
  renderDesktopNavList(navPrivate, pages, "private", onSelectDocument);
  if (navPublicMobile) {
    renderMobileNavList(navPublicMobile, pages, "public", onSelectDocument);
  }
  if (navPrivateMobile) {
    renderMobileNavList(navPrivateMobile, pages, "private", onSelectDocument);
  }
  renderSystemPages(navSystem, pages, onSelectDocument, "desktop");
  if (navSystemMobile) {
    renderSystemPages(navSystemMobile, pages, onSelectDocument, "mobile");
  }
};
var renderSystemPages = (container, pages, onSelectDocument, variant) => {
  container.innerHTML = "";
  const systemPages = pages.filter((page) => page.store === "private" && page.position === "system").sort((a, b) => {
    const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (a.name || "").localeCompare(b.name || "");
  });
  if (systemPages.length === 0) {
    const empty = document.createElement("div");
    empty.className = variant === "desktop" ? "navbar-item is-size-7 app-muted" : "app-mobile-empty app-muted";
    empty.textContent = "No system pages.";
    container.append(empty);
    return;
  }
  systemPages.forEach((page) => {
    if (!page.documentId) {
      return;
    }
    const link = document.createElement("a");
    link.className = variant === "desktop" ? "navbar-item" : "app-mobile-action-link";
    link.href = "#";
    link.textContent = page.name;
    if (state.currentDocument?.id === page.documentId) {
      link.classList.add("is-active");
    }
    link.addEventListener("click", (event) => {
      event.preventDefault();
      onSelectDocument(page.documentId);
      document.getElementById("private-dropdown")?.classList.remove("is-active");
      closeMobileDrawer();
    });
    container.append(link);
  });
};

// web/src/features/agents/menu.ts
var renderAgentsMenu = (agents, onSelectAgent) => {
  const containers = [
    document.getElementById("nav-agents"),
    document.getElementById("nav-agents-mobile")
  ].filter((container) => !!container);
  if (!containers.length) {
    return;
  }
  containers.forEach((container) => {
    container.innerHTML = "";
    if (!agents.length) {
      container.innerHTML = container.id === "nav-agents" ? `<div class="navbar-item is-size-7 app-muted">No agents found.</div>` : `<div class="app-mobile-empty app-muted">No agents found.</div>`;
      return;
    }
    agents.forEach((agent) => {
      const link = document.createElement("a");
      link.className = container.id === "nav-agents" ? "navbar-item" : "app-mobile-action-link";
      link.href = "#";
      link.textContent = agent.name;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        onSelectAgent(agent.id);
        document.getElementById("agents-dropdown")?.classList.remove("is-active");
        document.dispatchEvent(new CustomEvent("app:mobile-drawer-close"));
      });
      container.append(link);
    });
  });
};

// web/src/features/forms/menu.ts
var renderFormsMenu = (forms) => {
  const links = [
    document.getElementById("forms-link"),
    document.getElementById("forms-link-mobile")
  ].filter((link) => !!link);
  if (!links.length) {
    return;
  }
  if (!forms.length) {
    links.forEach((link) => link.classList.add("is-hidden"));
    return;
  }
  links.forEach((link) => {
    link.classList.remove("is-hidden");
    link.textContent = "Forms";
  });
};

// web/src/app/language.ts
var normalizeLanguage = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
var collectLanguages = (variants) => {
  const seen = /* @__PURE__ */ new Set();
  const ordered = [];
  variants.forEach((variant) => {
    const lang = normalizeLanguage(variant.language);
    if (!lang || seen.has(lang)) {
      return;
    }
    seen.add(lang);
    ordered.push(lang);
  });
  return ordered;
};
var pickVariant = (variants, language) => {
  if (!variants.length) {
    return null;
  }
  if (language) {
    const match = variants.find((variant) => normalizeLanguage(variant.language) === language);
    if (match) {
      return match;
    }
  }
  return variants[variants.length - 1];
};
var pickFirstLanguage = (groups) => {
  for (const page of groups) {
    for (const variant of page.variants) {
      const lang = normalizeLanguage(variant.language);
      if (lang) {
        return lang;
      }
    }
    for (const section of page.sections) {
      for (const variant of section.variants) {
        const lang = normalizeLanguage(variant.language);
        if (lang) {
          return lang;
        }
      }
    }
  }
  return null;
};
var resolveNavigationPages = (groups, defaultLanguage, activeLanguage) => {
  const normalizedDefault = normalizeLanguage(defaultLanguage);
  const seedLanguage = normalizedDefault ?? activeLanguage ?? pickFirstLanguage(groups);
  const resolvedLanguage = seedLanguage ?? null;
  const resolvedPages = groups.map((group) => {
    const pageVariant = pickVariant(group.variants, resolvedLanguage);
    const pageLanguages = collectLanguages(group.variants);
    const resolvedSections = group.sections.map((section) => resolveSection(section, resolvedLanguage)).filter(Boolean);
    return {
      page: group.page,
      name: pageVariant?.name ?? group.page,
      language: normalizeLanguage(pageVariant?.language),
      order: pageVariant?.order ?? null,
      documentId: pageVariant?.id ?? null,
      store: pageVariant?.store ?? null,
      path: pageVariant?.path ?? null,
      position: pageVariant?.position ?? null,
      languages: pageLanguages,
      variants: group.variants,
      sections: resolvedSections
    };
  });
  resolvedPages.sort(compareByOrder);
  resolvedPages.forEach((page) => {
    page.sections.sort(compareByOrder);
  });
  return {
    pages: resolvedPages,
    activeLanguage: resolvedLanguage
  };
};
var resolveSection = (section, language) => {
  const variant = pickVariant(section.variants, language);
  if (!variant) {
    return null;
  }
  return {
    id: variant.id,
    name: variant.name,
    language: normalizeLanguage(variant.language),
    order: variant.order ?? section.order ?? null,
    store: variant.store ?? "public",
    path: variant.path ?? "",
    position: variant.position ?? null,
    languages: collectLanguages(section.variants),
    variants: section.variants
  };
};
var findDocumentVariants = (groups, documentId) => {
  for (const page of groups) {
    const pageMatch = page.variants.find((variant) => variant.id === documentId);
    if (pageMatch) {
      return {
        variants: page.variants,
        languages: collectLanguages(page.variants)
      };
    }
    for (const section of page.sections) {
      const sectionMatch = section.variants.find((variant) => variant.id === documentId);
      if (sectionMatch) {
        return {
          variants: section.variants,
          languages: collectLanguages(section.variants)
        };
      }
    }
  }
  return null;
};
var compareByOrder = (a, b) => {
  const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return (a.name || "").localeCompare(b.name || "");
};
var filterAgentsByLanguage = (agents, language) => {
  if (!language) {
    return agents;
  }
  const matching = agents.filter((agent) => normalizeLanguage(agent.language) === language);
  if (matching.length) {
    return matching;
  }
  const untagged = agents.filter((agent) => !normalizeLanguage(agent.language));
  return untagged.length ? untagged : agents;
};
var normalizeLanguageValue = normalizeLanguage;

// web/src/app/loaders.ts
var loadUiConfig = async () => {
  if (!state.auth) {
    return;
  }
  try {
    const response = await fetchUiConfig(state.auth);
    applyUiConfig(response.config ?? {});
  } catch {
    setTheme(getCurrentTheme(), false);
  }
};
var loadLayoutConfig = async () => {
  if (!state.auth) {
    return;
  }
  try {
    const response = await fetchLayoutConfig(state.auth);
    state.layoutConfig = response.config ?? {};
  } catch {
    state.layoutConfig = {};
  }
};
var loadModules = async () => {
  if (!state.auth) {
    return;
  }
  try {
    const response = await fetchModules(state.auth);
    if (Array.isArray(response.modules)) {
      state.modules = response.modules;
    } else if (response.modules && typeof response.modules === "object") {
      state.modules = Object.values(response.modules);
    } else {
      state.modules = [];
    }
  } catch {
    state.modules = [];
  }
};
var loadIntegrations = async ({ onAfterLoad } = {}) => {
  if (!state.auth) {
    return;
  }
  try {
    const response = await fetchIntegrations(state.auth);
    state.integrations = Array.isArray(response.integrations) ? response.integrations : [];
  } catch {
    state.integrations = [];
  }
  Object.keys(state.integrationSettings).forEach((key) => {
    delete state.integrationSettings[key];
  });
  if (!state.auth) {
    return;
  }
  const enabled = state.integrations.filter((integration) => integration.enabled);
  await Promise.all(
    enabled.map(async (integration) => {
      try {
        const response = await fetchIntegrationSettings(state.auth, integration.name);
        state.integrationSettings[integration.name] = response.settings ?? {};
      } catch {
        state.integrationSettings[integration.name] = {};
      }
    })
  );
  onAfterLoad?.();
};
var loadAgents = async (onSelectAgent) => {
  if (!state.auth) {
    return;
  }
  state.onSelectAgentMenu = onSelectAgent;
  try {
    const response = await fetchAgents(state.auth);
    state.agentsAll = Array.isArray(response.agents) ? response.agents : [];
    state.agents = filterAgentsByLanguage(state.agentsAll, state.activeLanguage);
  } catch {
    state.agentsAll = [];
    state.agents = [];
  }
  renderAgentsMenu(state.agents, onSelectAgent);
};
var loadForms = async () => {
  if (!state.auth) {
    return;
  }
  try {
    const response = await fetchForms(state.auth);
    state.forms = Array.isArray(response.forms) ? response.forms : [];
  } catch {
    state.forms = [];
  }
  renderFormsMenu(state.forms);
};
var refreshNavigation = async (onSelectDocument) => {
  if (!state.auth) {
    return;
  }
  try {
    const nav = await fetchNavigation(state.auth);
    const pages = Array.isArray(nav.pages) ? nav.pages : [];
    const defaultLanguage = normalizeLanguageValue(nav.defaultLanguage ?? null);
    state.navigationGroups = pages;
    state.defaultLanguage = defaultLanguage;
    const resolved = resolveNavigationPages(pages, defaultLanguage, state.activeLanguage);
    state.activeLanguage = resolved.activeLanguage;
    state.navigationPages = resolved.pages;
    state.agents = filterAgentsByLanguage(state.agentsAll, state.activeLanguage);
    if (state.onSelectAgentMenu) {
      renderAgentsMenu(state.agents, state.onSelectAgentMenu);
    }
    renderNavigation(resolved.pages, onSelectDocument);
    await loadForms();
  } catch (err) {
    alert(err.message);
  }
};

// web/src/ui/notice.ts
var pushNotice = (type, message) => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("app:notice", { detail: { type, message } }));
};

// web/src/views/integrations.ts
var renderIntegrationsView = ({
  content,
  auth,
  integrations,
  getIntegrations,
  getIntegrationModels: getIntegrationModels2,
  clearAgentState: clearAgentState2,
  openIntegrationModal,
  syncIntegrationModels: syncIntegrationModels2,
  reloadIntegrations
}) => {
  if (!content) {
    return;
  }
  clearAgentState2();
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
  const list = integrations.map((integration) => {
    const enabledLabel = integration.enabled ? "Enabled" : "Disabled";
    const models = integration.supportsModels ? getIntegrationModels2(integration.name).length : null;
    const modelsLine = integration.supportsModels ? `<div class="app-module-row-meta">Models: ${models}</div>` : "";
    const syncState = integration.syncing ? "Sync: running" : integration.lastSyncError ? `Last sync failed: ${integration.lastSyncError}` : integration.lastSyncedAt ? `Last synced: ${integration.lastSyncedAt}` : "Sync: idle";
    const syncDisabled = integration.enabled && !integration.syncing ? "" : "disabled";
    const settingsLabel = integration.enabled ? "Edit settings" : "Enable integration";
    const syncLabel = integration.syncing ? "Syncing..." : "Sync models";
    return `
        <div class="app-module-row">
          <div class="app-module-row-title">${integration.name}</div>
          <div class="app-module-row-meta">${integration.description}</div>
          <div class="app-module-row-meta">Status: ${enabledLabel}</div>
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
            ${integration.supportsModels ? `<button class="button app-button app-ghost" data-integration-sync="${integration.name}" ${syncDisabled}>
                    ${syncLabel}
                  </button>` : ""}
          </div>
        </div>
      `;
  }).join("");
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
        const result = await syncIntegrationModels2(auth, name);
        pushNotice("success", result.alreadyRunning ? "Model sync already running." : "Model sync started.");
        await reloadIntegrations();
        renderIntegrationsView({
          content,
          auth,
          integrations: getIntegrations(),
          getIntegrations,
          getIntegrationModels: getIntegrationModels2,
          clearAgentState: clearAgentState2,
          openIntegrationModal,
          syncIntegrationModels: syncIntegrationModels2,
          reloadIntegrations
        });
      } catch (err) {
        pushNotice("error", err.message);
      }
    });
  });
};

// web/src/utils.ts
var isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
};
var encodeDocumentId = (store, path) => {
  const raw = `${store}:${path}`;
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

// web/src/views/logs.ts
var buildLogSelector = (logs, currentId) => {
  if (!logs.length) {
    return `
      <div class="field">
        <label class="label">Log file</label>
        <div class="control">
          <div class="select is-fullwidth">
            <select disabled>
              <option>No logs available</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }
  const options = logs.map((log) => {
    const selected = log.id === currentId ? "selected" : "";
    return `<option value="${log.id}" ${selected}>${log.name}</option>`;
  }).join("");
  return `
    <div class="field">
      <label class="label">Log file</label>
      <div class="control">
        <div class="select is-fullwidth">
          <select id="log-file-select">${options}</select>
        </div>
      </div>
    </div>
  `;
};
var renderLogsView = async ({
  content,
  auth,
  logs,
  setLogs,
  fetchLogs: fetchLogs2,
  loadDocument: loadDocument2,
  clearAgentState: clearAgentState2,
  openLoggerSettings: openLoggerSettings2
}) => {
  if (!content) {
    return;
  }
  clearAgentState2();
  if (!auth) {
    content.innerHTML = `<p class="app-muted">Authentication required.</p>`;
    return;
  }
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">Logs</h1>
        <p class="app-muted">Recent backend errors stored in manage/store/logs.</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="Logger settings"
          title="Logger settings"
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
    <div class="notification is-light">Loading logs...</div>
  `;
  try {
    const response = await fetchLogs2(auth);
    logs = Array.isArray(response.logs) ? response.logs : [];
    setLogs(logs);
  } catch (err) {
    content.innerHTML = `<p class="app-muted">${err.message}</p>`;
    return;
  }
  if (!logs.length) {
    content.innerHTML = `
      <div class="app-view-header mb-4">
        <div>
          <h1 class="title is-4">Logs</h1>
          <p class="app-muted">Recent backend errors stored in manage/store/logs.</p>
        </div>
        <div class="app-view-actions">
          <button
            id="logger-settings-open"
            class="button app-button app-ghost app-icon-button"
            aria-label="Logger settings"
            title="Logger settings"
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
      <div class="notification is-light">No logs found.</div>
    `;
    document.getElementById("logger-settings-open")?.addEventListener("click", () => {
      openLoggerSettings2();
    });
    return;
  }
  const list = logs.map((log) => {
    const metaParts = [];
    if (log.count !== void 0) {
      metaParts.push(`${log.count} items`);
    }
    if (log.updatedAt) {
      metaParts.push(`updated ${log.updatedAt}`);
    }
    const meta = metaParts.length ? metaParts.join(" \xB7 ") : "";
    return `
        <div class="app-module-row">
          <div class="app-module-row-title">${log.name}</div>
          <div class="app-module-row-meta">${log.path}</div>
          ${meta ? `<div class="app-module-row-meta">${meta}</div>` : ""}
          <div class="buttons">
            <button class="button app-button app-ghost" data-log-id="${encodeURIComponent(
      log.id
    )}">Open</button>
          </div>
        </div>
      `;
  }).join("");
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">Logs</h1>
        <p class="app-muted">Recent backend errors stored in manage/store/logs.</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="Logger settings"
          title="Logger settings"
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
    <div class="app-log-toolbar mb-4">
      ${buildLogSelector(logs)}
    </div>
    <div class="app-module-list">${list}</div>
  `;
  document.getElementById("logger-settings-open")?.addEventListener("click", () => {
    openLoggerSettings2();
  });
  const select = document.getElementById("log-file-select");
  select?.addEventListener("change", () => {
    const id = select.value.trim();
    if (id) {
      loadDocument2(id);
    }
  });
  document.querySelectorAll("[data-log-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const encoded = button.getAttribute("data-log-id") || "";
      const id = decodeURIComponent(encoded);
      if (id) {
        loadDocument2(id);
      }
    });
  });
};
var renderLogDocument = ({
  content,
  auth,
  doc,
  logs,
  loadDocument: loadDocument2,
  openLoggerSettings: openLoggerSettings2,
  downloadDocument: downloadDocument2
}) => {
  if (!content) {
    return;
  }
  const payload = doc.payload;
  const data = isRecord(payload.data) ? payload.data : {};
  const items = Array.isArray(data.items) ? data.items : [];
  const createdAt = typeof data.createdAt === "string" ? data.createdAt : "";
  const updatedAt = typeof data.updatedAt === "string" ? data.updatedAt : "";
  const count = items.length;
  const listHtml = items.length ? items.map((item) => {
    const record = isRecord(item) ? item : {};
    const timestamp = typeof record.timestamp === "string" ? record.timestamp : "";
    const endpoint = typeof record.endpoint === "string" ? record.endpoint : "";
    const message = typeof record.message === "string" ? record.message : "";
    const type = typeof record.type === "string" ? record.type : "";
    const status2 = typeof record.status === "number" ? record.status : null;
    const statusLabel = status2 !== null ? `${status2}` : "";
    return `
            <div class="app-log-item">
              <div class="app-log-header">
                <div class="app-log-title">${endpoint || "Request"}</div>
                <div class="app-log-meta">${statusLabel}</div>
              </div>
              <div class="app-log-message">${message}</div>
              <div class="app-log-meta">
                ${timestamp ? `${timestamp} \xB7 ` : ""}${type}
              </div>
            </div>
          `;
  }).join("") : `<div class="notification is-light">No log entries yet.</div>`;
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">Logs \xB7 ${doc.store}/${doc.path}</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="Logger settings"
          title="Logger settings"
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
    <div class="app-log-toolbar mb-4">
      ${buildLogSelector(logs, doc.id)}
    </div>
    <div class="app-log-summary">
      <div class="app-log-summary-item"><span class="app-muted">Items</span> ${count}</div>
      ${createdAt ? `<div class="app-log-summary-item"><span class="app-muted">Created</span> ${createdAt}</div>` : ""}
      ${updatedAt ? `<div class="app-log-summary-item"><span class="app-muted">Updated</span> ${updatedAt}</div>` : ""}
    </div>
    <div class="mb-4 buttons">
      <button id="export-json" class="button app-button app-ghost">Export JSON</button>
    </div>
    <div class="app-log-list">
      ${listHtml}
    </div>
  `;
  document.getElementById("logger-settings-open")?.addEventListener("click", () => {
    openLoggerSettings2();
  });
  const select = document.getElementById("log-file-select");
  select?.addEventListener("change", () => {
    const id = select.value.trim();
    if (id) {
      loadDocument2(id);
    }
  });
  document.getElementById("export-json")?.addEventListener("click", async () => {
    if (!auth) {
      return;
    }
    try {
      const result = await downloadDocument2(auth, doc.id);
      const filename = result.filename ?? `${doc.path.split("/").pop() || "log"}.json`;
      triggerDownload(result.blob, filename);
    } catch (err) {
      alert(err.message);
    }
  });
};

// web/src/modules/utils.ts
var slug = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
  value
);
var moduleSettingsKey = (payload, moduleName) => {
  const moduleSlug = slug(moduleName) || "module";
  const docId = typeof payload.id === "string" ? payload.id.trim().toLowerCase() : "";
  if (!docId || !isUuid(docId)) {
    throw new Error("Document id is required for module settings.");
  }
  return `${docId}-${moduleSlug}`;
};

// web/src/modules/chat/layout.ts
var buildHeader = (module, agentName, openSettings) => {
  const header = document.createElement("div");
  header.className = "app-module-header";
  const headerRow = document.createElement("div");
  headerRow.className = "app-module-header-row";
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  headerRow.append(title);
  if (openSettings) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button app-button app-ghost app-icon-button app-module-settings-button";
    button.title = "Module settings";
    button.setAttribute("aria-label", "Module settings");
    button.innerHTML = `
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
        </svg>
      </span>
    `;
    button.addEventListener("click", openSettings);
    headerRow.append(button);
  }
  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} \xB7 ${module.author}` : module.description;
  header.append(headerRow, meta);
  if (agentName) {
    const agentMeta = document.createElement("div");
    agentMeta.className = "app-module-meta";
    agentMeta.textContent = `Agent: ${agentName}`;
    header.append(agentMeta);
  }
  return header;
};
var renderChatLayout = (panel, module, agentName, openSettings) => {
  const card = document.createElement("div");
  card.className = "app-module";
  card.append(buildHeader(module, agentName, openSettings));
  const body = document.createElement("div");
  body.className = "app-module-body";
  body.innerHTML = `
    <div class="app-chat-layout">
      <div class="app-panel app-chat">
        <div class="app-chat-header">
          <div>
            <div class="app-chat-title" data-role="chat-title">No conversation selected</div>
            <div class="app-chat-meta app-muted" data-role="chat-meta">Select or create a conversation.</div>
          </div>
          <div class="app-chat-actions">
            <div class="select is-small">
              <select data-role="chat-select">
                <option value="">Select chat</option>
              </select>
            </div>
            <button class="button app-button app-ghost" data-action="new">New</button>
            <button class="button app-button app-ghost app-icon-button" data-action="delete" title="Delete chat" aria-label="Delete chat" disabled>
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                  <path d="M9 6h6M10 6V4h4v2M6 6h12M8 6v12m4-12v12m4-12v12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div class="app-chat-scroll" data-role="chat-scroll">
          <div class="app-chat-messages" data-role="chat-messages"></div>
          <button type="button" class="button app-button app-ghost app-chat-jump" data-role="chat-jump" aria-label="Jump to latest message" title="Jump to latest message">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </span>
          </button>
        </div>
        <div class="app-chat-input">
          <form data-role="chat-form">
            <div class="field">
              <div class="control">
                <textarea class="textarea" rows="2" placeholder="Write a message" data-role="chat-input" disabled></textarea>
              </div>
            </div>
            <div class="buttons">
              <button class="button app-button app-primary" data-role="chat-send" disabled>Send</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <p class="help" data-role="chat-status"></p>
  `;
  card.append(body);
  panel.append(card);
  const title = body.querySelector("[data-role='chat-title']");
  const meta = body.querySelector("[data-role='chat-meta']");
  const scroll = body.querySelector("[data-role='chat-scroll']");
  const messages = body.querySelector("[data-role='chat-messages']");
  const status2 = body.querySelector("[data-role='chat-status']");
  const form = body.querySelector("[data-role='chat-form']");
  const input = body.querySelector("[data-role='chat-input']");
  const send = body.querySelector("[data-role='chat-send']");
  const select = body.querySelector("[data-role='chat-select']");
  const jump = body.querySelector("[data-role='chat-jump']");
  if (!title || !meta || !scroll || !messages || !status2 || !form || !input || !send || !select || !jump) {
    return null;
  }
  return {
    title,
    meta,
    scroll,
    messages,
    status: status2,
    form,
    input,
    send,
    select,
    jump,
    create: body.querySelector("[data-action='new']"),
    remove: body.querySelector("[data-action='delete']")
  };
};

// web/src/modules/chat/controller.ts
init_api();

// web/src/features/chat/conversation.ts
var currentData = (conversation) => {
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  conversation.payload.data = payloadData;
  return payloadData;
};
var conversationHasPendingResponse = (conversation) => {
  if (!conversation) {
    return false;
  }
  const data = currentData(conversation);
  if (typeof data.pendingResponse === "boolean") {
    return data.pendingResponse;
  }
  const messages = Array.isArray(data.messages) ? data.messages : [];
  if (!messages.length) {
    return false;
  }
  const last = messages[messages.length - 1];
  if (!isRecord(last)) {
    return false;
  }
  return String(last.role || "").trim().toLowerCase() === "user";
};
var appendConversationMessage = (conversation, role, content) => {
  const data = currentData(conversation);
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  messages.push({ role, content, createdAt });
  data.messages = messages;
  data.updatedAt = createdAt;
  data.pendingResponse = role === "user";
};
var markConversationPending = (conversation, pending) => {
  const data = currentData(conversation);
  data.pendingResponse = pending;
  data.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
};

// web/src/features/chat/progress.ts
var getConversationProgress = (conversation) => {
  if (!conversation) {
    return null;
  }
  const data = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const progress = isRecord(data.progress) ? data.progress : null;
  if (!progress) {
    return null;
  }
  const items = [];
  (Array.isArray(progress.items) ? progress.items : []).forEach((item) => {
    const record = isRecord(item) ? item : {};
    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (!message) {
      return;
    }
    items.push({
      message,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : null
    });
  });
  const recentItems = items.slice(-4);
  const status2 = (typeof progress.status === "string" ? progress.status.trim() : "") || recentItems[recentItems.length - 1]?.message || "";
  const updatedAt = typeof progress.updatedAt === "string" ? progress.updatedAt : null;
  if (!status2 && recentItems.length === 0) {
    return null;
  }
  return {
    status: status2,
    updatedAt,
    items: recentItems
  };
};
var appendConversationProgress = (container, progress) => {
  if (!progress) {
    return;
  }
  const card = document.createElement("div");
  card.className = "app-chat-progress";
  const title = document.createElement("div");
  title.className = "app-chat-progress-title";
  title.textContent = "Codex is working";
  const status2 = document.createElement("div");
  status2.className = "app-chat-progress-status";
  status2.textContent = progress.status || "Working...";
  card.append(title, status2);
  if (progress.items.length > 0) {
    const list = document.createElement("div");
    list.className = "app-chat-progress-items";
    progress.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "app-chat-progress-item";
      row.textContent = item.message;
      list.append(row);
    });
    card.append(list);
  }
  container.append(card);
};

// web/src/features/chat/processing.ts
var PHRASES = ["Processing...", "Sailing...", "Swimming...", "Floating..."];
var ROTATE_MS = 3e4;
var nextPhrase = (current) => {
  const pool = PHRASES.filter((phrase) => phrase !== current);
  return pool[Math.floor(Math.random() * pool.length)] ?? PHRASES[0];
};
var createProcessingStatus = (setStatus2) => {
  let timer = null;
  let current = "";
  let detail = "";
  const render = () => {
    if (current === "") {
      setStatus2("");
      return;
    }
    setStatus2(detail ? `${current} ${detail}` : current);
  };
  const stop = () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    current = "";
    detail = "";
    setStatus2("");
  };
  const start = (nextDetail = "") => {
    detail = nextDetail;
    if (timer !== null) {
      if (current === "") {
        current = nextPhrase(current);
      }
      render();
      return;
    }
    current = nextPhrase(current);
    render();
    timer = window.setInterval(() => {
      current = nextPhrase(current);
      render();
    }, ROTATE_MS);
  };
  const update = (nextDetail = "") => {
    detail = nextDetail;
    if (timer !== null) {
      render();
    }
  };
  return {
    start,
    stop,
    update
  };
};

// web/src/modules/chat/utils.ts
var messageId = (conversationId, createdAt, index) => `${conversationId}:${createdAt ?? index}`;
var extractMessages = (conversation) => {
  if (!conversation) {
    return [];
  }
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const rawMessages = Array.isArray(payloadData.messages) ? payloadData.messages : [];
  if (!rawMessages.length) {
    return [];
  }
  return rawMessages.map((message, index) => {
    const record = isRecord(message) ? message : {};
    const role = typeof record.role === "string" ? record.role : "user";
    const content = typeof record.content === "string" ? record.content : "";
    const createdAt = typeof record.createdAt === "string" ? record.createdAt : null;
    return {
      id: messageId(conversation.id, createdAt, index),
      role,
      content,
      createdAt
    };
  });
};
var renderMessages = (container, messages, options = {}) => {
  if (!messages.length) {
    const label = options.emptyState ?? "Select or create a conversation.";
    container.innerHTML = `<p class="app-muted">${label}</p>`;
    appendConversationProgress(container, options.progress ?? null);
    return;
  }
  const enableActions = options.enableActions ?? false;
  const messageMap = new Map(messages.map((message) => [message.id, message]));
  container.innerHTML = messages.map((message) => {
    const role = message.role === "assistant" ? "assistant" : "user";
    const label = role === "assistant" ? "Agent" : "You";
    const roleClass = role === "assistant" ? "is-assistant" : "is-user";
    const selectable = enableActions && role === "assistant";
    const selected = selectable && options.isSelected ? options.isSelected(message) : false;
    const selectedClass = selected ? "is-selected" : "";
    const toggleTitle = selected ? "Remove from data" : "Add to data";
    const toggleIcon = selected ? `<path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>` : `<path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>`;
    const actions = selectable ? `
          <div class="app-chat-message-actions">
            <button
              type="button"
              class="app-chat-action ${selected ? "is-active" : ""}"
              data-chat-action="toggle"
              data-message-id="${message.id}"
              title="${toggleTitle}"
              aria-label="${toggleTitle}"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                ${toggleIcon}
              </svg>
            </button>
            <button
              type="button"
              class="app-chat-action"
              data-chat-action="copy"
              data-message-id="${message.id}"
              title="Copy"
              aria-label="Copy"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                <path
                  d="M9 9h9v10H9zM6 5h9v3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
              </svg>
            </button>
          </div>
        ` : "";
    return `
        <div class="app-chat-message ${roleClass} ${selectedClass}" data-message-id="${message.id}">
          <div class="app-chat-message-role">${label}</div>
          ${actions}
          <div class="app-chat-message-content">${message.content}</div>
        </div>
      `;
  }).join("");
  if (enableActions) {
    container.querySelectorAll("[data-chat-action]").forEach((button) => {
      const id = button.getAttribute("data-message-id");
      if (!id) {
        return;
      }
      const message = messageMap.get(id);
      if (!message) {
        return;
      }
      const action = button.getAttribute("data-chat-action");
      if (action === "toggle") {
        button.addEventListener("click", () => {
          const selected = options.isSelected ? options.isSelected(message) : false;
          options.onToggle?.(message, selected);
        });
      }
      if (action === "copy") {
        button.addEventListener("click", () => {
          options.onCopy?.(message);
        });
      }
    });
  }
  appendConversationProgress(container, options.progress ?? null);
};
var updateConversationHeader = (titleEl, metaEl, conversation) => {
  if (!conversation) {
    titleEl.textContent = "No conversation selected";
    metaEl.textContent = "Select or create a conversation.";
    return;
  }
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const createdAt = typeof payloadData.createdAt === "string" ? payloadData.createdAt : "";
  titleEl.textContent = conversation.payload.name || "Conversation";
  metaEl.textContent = createdAt ? `Started ${createdAt}` : "Conversation loaded.";
};
var updateChatInputState = (input, send, active2) => {
  input.disabled = !active2;
  send.disabled = !active2;
};

// web/src/modules/chat/controller.ts
var mountChatController = (runtime) => {
  let conversations = [];
  let currentConversation = null;
  let pendingNew = false;
  let disposeRealtime = null;
  let disposeRealtimeStatus = null;
  const ensureDataObject = () => {
    if (isRecord(runtime.payload.data)) {
      return runtime.payload.data;
    }
    runtime.payload.data = {};
    runtime.editor?.setValue(runtime.payload.data);
    return runtime.payload.data;
  };
  const ensureOutputList = () => {
    const data = ensureDataObject();
    const existing = data[runtime.targetKey];
    if (!Array.isArray(existing)) {
      data[runtime.targetKey] = [];
      return data[runtime.targetKey];
    }
    return existing;
  };
  const isMessageSelected = (message) => {
    const data = ensureDataObject();
    const list = Array.isArray(data[runtime.targetKey]) ? data[runtime.targetKey] : [];
    return list.some((entry) => isRecord(entry) && entry.id === message.id);
  };
  const renderCurrentMessages = () => {
    const emptyState = currentConversation ? "No messages yet." : "Select or create a conversation.";
    renderMessages(runtime.dom.messages, extractMessages(currentConversation), {
      enableActions: true,
      progress: getConversationProgress(currentConversation),
      isSelected: (message) => isMessageSelected(message),
      onToggle: (message, selected) => {
        const data = ensureDataObject();
        const list = ensureOutputList();
        if (selected) {
          data[runtime.targetKey] = list.filter((entry) => !(isRecord(entry) && entry.id === message.id));
        } else if (currentConversation) {
          list.push({
            id: message.id,
            conversationId: currentConversation.id,
            agent: runtime.agentName,
            content: message.content,
            createdAt: message.createdAt ?? null,
            role: message.role
          });
        }
        runtime.editor?.setValue(data);
        renderCurrentMessages();
      },
      onCopy: (message) => void copyMessage(message),
      emptyState
    });
  };
  const setStatus2 = (message) => {
    runtime.dom.status.textContent = message;
  };
  const processingStatus = createProcessingStatus(setStatus2);
  const isNearBottom = () => runtime.dom.scroll.scrollHeight - runtime.dom.scroll.scrollTop - runtime.dom.scroll.clientHeight <= 48;
  const scrollToBottom = () => {
    runtime.dom.scroll.scrollTop = runtime.dom.scroll.scrollHeight;
  };
  const updateJumpVisibility = () => {
    runtime.dom.jump.classList.toggle("is-visible", pendingNew);
  };
  const stopRealtimeBindings = () => {
    disposeRealtime?.();
    disposeRealtimeStatus?.();
    disposeRealtime = null;
    disposeRealtimeStatus = null;
  };
  const emitProgress = (conversation, pending, progress) => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("app:chat-progress", {
        detail: {
          moduleName: runtime.moduleName,
          settingsKey: runtime.settingsKey,
          conversationId: conversation?.id ?? null,
          pending,
          progress
        }
      })
    );
  };
  const syncConversation = (conversation, forceScroll = false) => {
    currentConversation = conversation;
    updateConversationHeader(runtime.dom.title, runtime.dom.meta, conversation);
    const shouldScroll = forceScroll || isNearBottom();
    renderCurrentMessages();
    const pending = conversationHasPendingResponse(conversation);
    const progress = getConversationProgress(conversation);
    emitProgress(conversation, pending, progress);
    updateChatInputState(runtime.dom.input, runtime.dom.send, !!conversation && !pending);
    if (conversation) {
      runtime.dom.select.value = conversation.id;
      if (runtime.dom.remove) {
        runtime.dom.remove.disabled = false;
      }
    } else {
      runtime.dom.select.value = "";
      if (runtime.dom.remove) {
        runtime.dom.remove.disabled = true;
      }
    }
    if (shouldScroll) {
      scrollToBottom();
      pendingNew = false;
    }
    updateJumpVisibility();
    if (pending) {
      processingStatus.start(progress?.status ?? "");
      syncRealtimeBindings();
      return;
    }
    processingStatus.stop();
    syncRealtimeBindings();
  };
  const updateSelectOptions = () => {
    runtime.dom.select.innerHTML = `<option value="">Select chat</option>` + conversations.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    if (currentConversation) {
      runtime.dom.select.value = currentConversation.id;
    }
  };
  const refreshList = async () => {
    if (!runtime.auth) {
      setStatus2("Login required.");
      return;
    }
    try {
      const response = await fetchChatConversations(runtime.auth, runtime.moduleName, {
        settings: runtime.settingsKey
      });
      conversations = Array.isArray(response.items) ? response.items : [];
      updateSelectOptions();
      if (!conversationHasPendingResponse(currentConversation)) {
        setStatus2("");
      }
    } catch (error) {
      setStatus2(error.message);
    }
  };
  const loadConversation = async (conversationId) => {
    if (!runtime.auth) {
      setStatus2("Login required.");
      return;
    }
    try {
      const conversation = await fetchChatConversation(runtime.auth, runtime.moduleName, {
        id: conversationId,
        settings: runtime.settingsKey
      });
      pendingNew = false;
      syncConversation(conversation, true);
      updateSelectOptions();
    } catch (error) {
      setStatus2(error.message);
    }
  };
  const startConversation = async () => {
    if (!runtime.auth) {
      setStatus2("Login required.");
      return;
    }
    try {
      const conversation = await startChatConversation(runtime.auth, runtime.moduleName, {
        settings: runtime.settingsKey
      });
      pendingNew = false;
      syncConversation(conversation, true);
      await refreshList();
      setStatus2("");
    } catch (error) {
      setStatus2(error.message);
    }
  };
  const sendMessage = async (content) => {
    if (!runtime.auth || !currentConversation || conversationHasPendingResponse(currentConversation)) {
      return;
    }
    appendConversationMessage(currentConversation, "user", content);
    syncConversation(currentConversation, true);
    try {
      const updated = await appendChatMessage(runtime.auth, runtime.moduleName, {
        id: currentConversation.id,
        content,
        settings: runtime.settingsKey
      });
      pendingNew = false;
      syncConversation(updated, true);
      await refreshList();
    } catch (error) {
      if (currentConversation) {
        markConversationPending(currentConversation, false);
        appendConversationMessage(
          currentConversation,
          "assistant",
          `Something went wrong while I was replying: ${error.message || "Please try again."}`
        );
        syncConversation(currentConversation, true);
      }
    }
  };
  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setStatus2("Copied.");
      window.setTimeout(() => {
        if (!conversationHasPendingResponse(currentConversation)) {
          setStatus2("");
        }
      }, 1200);
    } catch {
      setStatus2("Copy failed.");
    }
  };
  const handleRealtimeEvent = (event) => {
    if (event.type !== "chat.conversation.updated") {
      return;
    }
    const data = isRecord(event.conversation.payload.data) ? event.conversation.payload.data : {};
    if (data.moduleKey !== runtime.settingsKey) {
      return;
    }
    if (currentConversation && currentConversation.id === event.conversation.id) {
      pendingNew = !isNearBottom();
      syncConversation(event.conversation, !pendingNew);
    }
    void refreshList();
  };
  const handleRealtimeStatus = (status2) => {
    if (status2 === "open") {
      void refreshList();
      if (currentConversation) {
        void loadConversation(currentConversation.id);
      }
    }
  };
  const syncRealtimeBindings = () => {
    if (!currentConversation) {
      stopRealtimeBindings();
      return;
    }
    if (disposeRealtime === null) {
      disposeRealtime = subscribeRealtime(handleRealtimeEvent);
    }
    if (disposeRealtimeStatus === null) {
      disposeRealtimeStatus = subscribeRealtimeStatus(handleRealtimeStatus);
    }
  };
  runtime.dom.create?.addEventListener("click", () => {
    void startConversation();
  });
  runtime.dom.remove?.addEventListener("click", () => {
    if (!runtime.auth || !currentConversation) {
      return;
    }
    const conversationId = currentConversation.id;
    setStatus2("Deleting conversation...");
    void deleteChatConversation(runtime.auth, runtime.moduleName, {
      id: conversationId,
      settings: runtime.settingsKey
    }).then(async () => {
      syncConversation(null, true);
      await refreshList();
      setStatus2("");
    }).catch((error) => {
      setStatus2(error.message);
    });
  });
  runtime.dom.select.addEventListener("change", () => {
    const conversationId = runtime.dom.select.value.trim();
    if (conversationId !== "") {
      void loadConversation(conversationId);
      return;
    }
    pendingNew = false;
    syncConversation(null, true);
    setStatus2("");
  });
  runtime.dom.scroll.addEventListener("scroll", () => {
    if (isNearBottom()) {
      pendingNew = false;
      updateJumpVisibility();
    }
  });
  runtime.dom.jump.addEventListener("click", () => {
    scrollToBottom();
    pendingNew = false;
    updateJumpVisibility();
  });
  runtime.dom.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const content = runtime.dom.input.value.trim();
    if (content === "") {
      return;
    }
    runtime.dom.input.value = "";
    void sendMessage(content);
  });
  runtime.dom.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      runtime.dom.form.requestSubmit();
    }
  });
  registerModuleChatCleanup(() => {
    stopRealtimeBindings();
    processingStatus.stop();
  });
  updateChatInputState(runtime.dom.input, runtime.dom.send, false);
  renderCurrentMessages();
  void refreshList();
};

// web/src/modules/chat/index.ts
var renderChatModule = (panel, context) => {
  const settings = isRecord(context.settings) ? context.settings : null;
  const agentSettings = settings && isRecord(settings.agent) ? settings.agent : null;
  const agentName = typeof agentSettings?.name === "string" ? agentSettings.name.trim() : "";
  const agentId = typeof agentSettings?.id === "string" ? agentSettings.id.trim() : "";
  if (!agentName || !agentId) {
    const card = document.createElement("div");
    card.className = "app-module";
    const header = document.createElement("div");
    header.className = "app-module-header";
    const headerRow = document.createElement("div");
    headerRow.className = "app-module-header-row";
    const title = document.createElement("div");
    title.className = "app-module-title";
    title.textContent = context.module.name;
    headerRow.append(title);
    if (context.openSettings) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button app-button app-ghost app-icon-button app-module-settings-button";
      button.title = "Module settings";
      button.setAttribute("aria-label", "Module settings");
      button.innerHTML = `
        <span class="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
            <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
          </svg>
        </span>
      `;
      button.addEventListener("click", context.openSettings);
      headerRow.append(button);
    }
    const meta = document.createElement("div");
    meta.className = "app-module-meta";
    meta.textContent = context.module.description;
    header.append(headerRow, meta);
    const body = document.createElement("div");
    body.className = "app-module-body";
    const note = document.createElement("div");
    note.className = "app-module-note";
    note.innerHTML = `
      <strong>Chat needs an agent.</strong>
      <p class="app-muted">Select an agent in module settings to start chatting.</p>
    `;
    body.append(note);
    card.append(header, body);
    panel.append(card);
    return;
  }
  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const targetKey = typeof outputSettings?.target === "string" && outputSettings.target.trim() !== "" ? outputSettings.target.trim() : context.module.name;
  const dom = renderChatLayout(panel, context.module, agentName, context.openSettings);
  if (!dom) {
    return;
  }
  mountChatController({
    moduleName: context.module.name,
    settingsKey: moduleSettingsKey(context.payload, context.module.name),
    agentName,
    auth: context.auth,
    payload: context.payload,
    editor: context.editor,
    dom,
    targetKey
  });
};

// web/src/modules/form/index.ts
var resolveLabel = (settings, fallback) => {
  const name = settings?.name;
  if (typeof name === "string" && name.trim() !== "") {
    return name.trim();
  }
  return `${fallback} - form`;
};
var resolveFlag = (settings, key) => {
  return settings?.[key] === true;
};
var renderFormModule = (panel, context) => {
  const settings = isRecord(context.settings) ? context.settings : null;
  const label = resolveLabel(settings, context.payload.name);
  const pageId = typeof context.payload.id === "string" ? context.payload.id : "";
  const wrapper = document.createElement("div");
  wrapper.className = "app-module";
  const flags = [
    { key: "sendadminemail", label: "Send admin email" },
    { key: "senduseremail", label: "Send user email" },
    { key: "captcha", label: "Captcha" }
  ];
  const flagMarkup = flags.map((flag) => {
    const value = resolveFlag(settings, flag.key) ? "enabled" : "disabled";
    return `<div class="app-form-flag"><span>${flag.label}</span><strong>${value}</strong></div>`;
  }).join("");
  wrapper.innerHTML = `
    <div class="app-module-header">
      <div>
        <h3 class="title is-6">${label}</h3>
        <p class="app-muted">Form page id: <code>${pageId || "missing"}</code></p>
      </div>
      <div class="buttons">
        <button class="button app-button app-ghost" data-form-settings>Settings</button>
      </div>
    </div>
    <div class="app-form-flags">${flagMarkup}</div>
    <p class="app-muted">Entries appear under Settings \u2192 Forms.</p>
  `;
  const settingsButton = wrapper.querySelector("[data-form-settings]");
  settingsButton?.addEventListener("click", () => {
    context.openSettings?.();
  });
  panel.append(wrapper);
};

// web/src/modules/gallery/index.ts
init_api();

// web/src/modules/uploader/utils.ts
var isRecord2 = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var describeStorage = (module) => {
  const parameters = module.parameters ?? {};
  if (!isRecord2(parameters)) {
    return "";
  }
  const storage = parameters.storage;
  if (!isRecord2(storage)) {
    return "";
  }
  const visibility = typeof storage.visibility === "string" ? storage.visibility : "public";
  const root = typeof storage.root === "string" ? storage.root : "media";
  const folder = typeof storage.folder === "string" && storage.folder ? `/${storage.folder}` : "";
  const location = `${root}${folder}`;
  return `Storage: ${visibility} \xB7 ${location}`;
};

// web/src/modules/gallery/index.ts
var resolveSchemaKeys = (schema) => {
  const properties = schema?.properties ?? {};
  const entries = Object.entries(properties);
  let urlKey = null;
  for (const [key, value] of entries) {
    if (!value || value.type !== "string") {
      continue;
    }
    if (value.format === "uri" || value.contentMediaType?.startsWith("image/")) {
      urlKey = key;
      break;
    }
  }
  if (!urlKey && properties.url?.type === "string") {
    urlKey = "url";
  }
  if (!urlKey && entries.length > 0) {
    urlKey = entries[0][0];
  }
  const altKey = properties.alt?.type === "string" ? "alt" : null;
  return { urlKey, altKey };
};
var coerceDataObject = (payload, editor) => {
  if (isRecord2(payload.data)) {
    return payload.data;
  }
  payload.data = {};
  editor?.setValue(payload.data);
  return payload.data;
};
var isSelected = (list, urlKey, url) => {
  if (!Array.isArray(list)) {
    return false;
  }
  return list.some((entry) => isRecord2(entry) && entry[urlKey] === url);
};
var renderGalleryModule = (panel, context) => {
  const { module, payload, editor, auth } = context;
  const schema = isRecord2(module.schema) ? module.schema : null;
  const data = coerceDataObject(payload, editor);
  const { urlKey, altKey } = resolveSchemaKeys(schema);
  const settings = isRecord2(context.settings) ? context.settings : null;
  const outputSettings = settings && isRecord2(settings.output) ? settings.output : null;
  const sourceSettings = settings && isRecord2(settings.source) ? settings.source : null;
  const targetKey = typeof outputSettings?.target === "string" && outputSettings.target.trim() !== "" ? outputSettings.target.trim() : module.name;
  const settingsKey = moduleSettingsKey(payload, module.name);
  const initialVisibility = typeof sourceSettings?.visibility === "string" ? sourceSettings.visibility : "all";
  if (!urlKey) {
    const notice = document.createElement("div");
    notice.className = "notification is-warning is-light";
    notice.textContent = "Gallery schema must define a string field for the image.";
    panel.append(notice);
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "app-module";
  const header = document.createElement("div");
  header.className = "app-module-header";
  const headerRow = document.createElement("div");
  headerRow.className = "app-module-header-row";
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  headerRow.append(title);
  if (context.openSettings) {
    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "button app-button app-ghost app-icon-button app-module-settings-button";
    settingsButton.title = "Module settings";
    settingsButton.setAttribute("aria-label", "Module settings");
    settingsButton.innerHTML = `
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
    `;
    settingsButton.addEventListener("click", context.openSettings);
    headerRow.append(settingsButton);
  }
  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} \xB7 ${module.author}` : module.description;
  header.append(headerRow, meta);
  const body = document.createElement("div");
  body.className = "app-module-body";
  const toggleField = document.createElement("div");
  toggleField.className = "field";
  const toggleLabel = document.createElement("label");
  toggleLabel.className = "label";
  toggleLabel.textContent = "Source";
  const toggleControl = document.createElement("div");
  toggleControl.className = "control";
  const toggleTabs = document.createElement("div");
  toggleTabs.className = "tabs is-toggle is-small";
  toggleTabs.innerHTML = `
    <ul>
      <li data-visibility="all"><a>All</a></li>
      <li data-visibility="public"><a>Public</a></li>
      <li data-visibility="private"><a>Private</a></li>
    </ul>
  `;
  toggleControl.append(toggleTabs);
  toggleField.append(toggleLabel, toggleControl);
  const grid = document.createElement("div");
  grid.className = "app-gallery-grid";
  const status2 = document.createElement("p");
  status2.className = "help";
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-background"></div>
    <div class="modal-card app-gallery-modal">
      <header class="modal-card-head">
        <p class="modal-card-title">Image</p>
        <button class="delete" aria-label="close"></button>
      </header>
      <section class="modal-card-body">
        <div class="app-gallery-modal-body"></div>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button class="button app-button app-primary" data-action="add">Add to data</button>
          <button class="button app-button app-ghost" data-action="remove">Remove from data</button>
          <button class="button app-button app-danger" data-action="delete">Delete file</button>
        </div>
      </footer>
    </div>
  `;
  body.append(toggleField, grid, status2);
  wrapper.append(header, body);
  panel.append(wrapper, modal);
  const modalBody = modal.querySelector(".app-gallery-modal-body");
  const modalClose = modal.querySelector(".delete");
  const modalBackdrop = modal.querySelector(".modal-background");
  const addButton = modal.querySelector("[data-action='add']");
  const removeButton = modal.querySelector("[data-action='remove']");
  const deleteButton = modal.querySelector("[data-action='delete']");
  let currentVisibility = initialVisibility === "private" || initialVisibility === "public" || initialVisibility === "all" ? initialVisibility : "all";
  let currentItem = null;
  const setVisibilityActive = () => {
    toggleTabs.querySelectorAll("li").forEach((item) => {
      const value = item.getAttribute("data-visibility");
      item.classList.toggle("is-active", value === currentVisibility);
    });
  };
  const closeModal = () => {
    modal.classList.remove("is-active");
    currentItem = null;
  };
  const openModal = (item) => {
    currentItem = item;
    if (modalBody) {
      modalBody.innerHTML = "";
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = "";
      modalBody.append(img);
    }
    const list = data[targetKey];
    const selected = isSelected(list, urlKey, item.url);
    if (addButton) {
      addButton.disabled = selected;
    }
    if (removeButton) {
      removeButton.disabled = !selected;
    }
    modal.classList.add("is-active");
  };
  modalClose?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", closeModal);
  addButton?.addEventListener("click", () => {
    if (!currentItem) {
      return;
    }
    const list = Array.isArray(data[targetKey]) ? data[targetKey] : [];
    if (!Array.isArray(data[targetKey])) {
      data[targetKey] = list;
    }
    if (!isSelected(list, urlKey, currentItem.url)) {
      const entry = { [urlKey]: currentItem.url };
      if (altKey) {
        entry[altKey] = "";
      }
      list.push(entry);
    }
    editor?.setValue(data);
    closeModal();
    renderGrid();
  });
  removeButton?.addEventListener("click", () => {
    if (!currentItem) {
      return;
    }
    if (!Array.isArray(data[targetKey])) {
      closeModal();
      return;
    }
    const list = data[targetKey];
    data[targetKey] = list.filter(
      (entry) => !(isRecord2(entry) && entry[urlKey] === currentItem?.url)
    );
    editor?.setValue(data);
    closeModal();
    renderGrid();
  });
  deleteButton?.addEventListener("click", async () => {
    if (!auth || !currentItem) {
      return;
    }
    if (!confirm("Delete this file? This cannot be undone.")) {
      return;
    }
    try {
      await deleteModuleFile(auth, module.name, {
        path: currentItem.path,
        visibility: currentItem.visibility,
        settings: settingsKey
      });
      if (Array.isArray(data[targetKey])) {
        data[targetKey] = data[targetKey].filter(
          (entry) => !(isRecord2(entry) && entry[urlKey] === currentItem?.url)
        );
        editor?.setValue(data);
      }
      closeModal();
      void loadItems();
    } catch (err) {
      alert(err.message);
    }
  });
  const renderGrid = () => {
    const list = data[targetKey];
    const selectedUrls = /* @__PURE__ */ new Set();
    if (Array.isArray(list)) {
      list.forEach((entry) => {
        if (isRecord2(entry) && typeof entry[urlKey] === "string") {
          selectedUrls.add(entry[urlKey]);
        }
      });
    }
    grid.querySelectorAll(".app-gallery-item").forEach((node) => {
      const url = node.getAttribute("data-url") || "";
      node.classList.toggle("is-selected", selectedUrls.has(url));
    });
  };
  const loadItems = async () => {
    if (!auth) {
      status2.textContent = "Login required.";
      return;
    }
    status2.textContent = "Loading media...";
    grid.innerHTML = "";
    try {
      const response = await fetchModuleList(auth, module.name, {
        visibility: currentVisibility,
        settings: settingsKey
      });
      const items = response.items ?? [];
      if (!items.length) {
        status2.textContent = "No images found.";
        return;
      }
      status2.textContent = "";
      items.forEach((item) => {
        if (!isRecord2(item) || typeof item.url !== "string" || typeof item.path !== "string") {
          return;
        }
        const url = item.url;
        const path = item.path;
        const card = document.createElement("button");
        card.type = "button";
        card.className = "app-gallery-item";
        card.setAttribute("data-url", url);
        card.setAttribute("data-path", path);
        const img = document.createElement("img");
        img.src = url;
        img.alt = typeof item.filename === "string" ? item.filename : "";
        card.append(img);
        const itemVisibility = typeof item.visibility === "string" ? item.visibility : currentVisibility;
        card.addEventListener("click", () => openModal({ url, path, visibility: itemVisibility }));
        grid.append(card);
      });
      renderGrid();
    } catch (err) {
      status2.textContent = err.message;
    }
  };
  toggleTabs.querySelectorAll("li").forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const value = tab.getAttribute("data-visibility");
      if (value !== "public" && value !== "private" && value !== "all") {
        return;
      }
      if (value === currentVisibility) {
        return;
      }
      currentVisibility = value;
      setVisibilityActive();
      void loadItems();
    });
  });
  setVisibilityActive();
  void loadItems();
};

// web/src/modules/uploader/index.ts
init_api();
var resolveUploaderKeys = (schema) => {
  const properties = schema?.properties ?? {};
  const entries = Object.entries(properties);
  let urlKey = null;
  for (const [key, value] of entries) {
    if (!value || value.type !== "string") {
      continue;
    }
    if (value.format === "data-url" || value.format === "uri" || value.contentMediaType?.startsWith("image/")) {
      urlKey = key;
      break;
    }
  }
  if (!urlKey && properties.url?.type === "string") {
    urlKey = "url";
  }
  if (!urlKey && entries.length > 0) {
    urlKey = entries[0][0];
  }
  const altKey = properties.alt?.type === "string" ? "alt" : null;
  return { urlKey, altKey };
};
var coerceDataObject2 = (payload, editor) => {
  if (isRecord2(payload.data)) {
    return payload.data;
  }
  payload.data = {};
  editor?.setValue(payload.data);
  return payload.data;
};
var buildHeader2 = (module, openSettings) => {
  const header = document.createElement("div");
  header.className = "app-module-header";
  const headerRow = document.createElement("div");
  headerRow.className = "app-module-header-row";
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  headerRow.append(title);
  if (openSettings) {
    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "button app-button app-ghost app-icon-button app-module-settings-button";
    settingsButton.title = "Module settings";
    settingsButton.setAttribute("aria-label", "Module settings");
    settingsButton.innerHTML = `
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
    `;
    settingsButton.addEventListener("click", openSettings);
    headerRow.append(settingsButton);
  }
  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} \xB7 ${module.author}` : module.description;
  header.append(headerRow, meta);
  const storageHint = describeStorage(module);
  if (storageHint) {
    const storageMeta = document.createElement("div");
    storageMeta.className = "app-module-meta";
    storageMeta.textContent = storageHint;
    header.append(storageMeta);
  }
  return header;
};
var renderUploaderModule = (panel, context) => {
  const { module, payload, editor, auth } = context;
  const schema = isRecord2(module.schema) ? module.schema : null;
  const data = coerceDataObject2(payload, editor);
  const { urlKey, altKey } = resolveUploaderKeys(schema);
  const settings = isRecord2(context.settings) ? context.settings : null;
  const outputSettings = settings && isRecord2(settings.output) ? settings.output : null;
  const targetKey = typeof outputSettings?.target === "string" && outputSettings.target.trim() !== "" ? outputSettings.target.trim() : module.name;
  if (!urlKey) {
    const notice = document.createElement("div");
    notice.className = "notification is-warning is-light";
    notice.textContent = "Uploader schema must define a string field for the image.";
    panel.append(notice);
    return;
  }
  const moduleCard = document.createElement("div");
  moduleCard.className = "app-module";
  const body = document.createElement("div");
  body.className = "app-module-body";
  const preview = document.createElement("div");
  preview.className = "app-module-preview";
  let pendingUrl = "";
  let pendingAlt = "";
  const updatePreview = () => {
    preview.innerHTML = "";
    if (!pendingUrl) {
      const empty = document.createElement("span");
      empty.className = "app-muted";
      empty.textContent = "No image selected.";
      preview.append(empty);
      return;
    }
    const img = document.createElement("img");
    img.src = pendingUrl;
    img.alt = pendingAlt;
    preview.append(img);
  };
  const setPendingUrl = (value) => {
    pendingUrl = value.trim();
    updatePreview();
    addButton.disabled = pendingUrl === "";
    discardButton.disabled = pendingUrl === "";
  };
  const setPendingAlt = (value) => {
    pendingAlt = value;
    updatePreview();
  };
  updatePreview();
  const fileField = document.createElement("div");
  fileField.className = "field";
  const fileLabel = document.createElement("label");
  fileLabel.className = "label";
  fileLabel.textContent = "Upload image";
  const fileControl = document.createElement("div");
  fileControl.className = "control";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "input";
  const fileHelp = document.createElement("p");
  fileHelp.className = "help";
  const setUploadStatus = (message) => {
    fileHelp.textContent = message;
  };
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file || !auth) {
      return;
    }
    fileInput.disabled = true;
    setUploadStatus("Uploading...");
    try {
      const settingsKey = moduleSettingsKey(payload, module.name);
      const result = await uploadModuleFile(auth, module.name, file, settingsKey);
      urlInput.value = result.url;
      setPendingUrl(result.url);
      setUploadStatus("Upload complete.");
    } catch (err) {
      setUploadStatus("");
      alert(err.message);
    } finally {
      fileInput.disabled = false;
    }
  });
  fileControl.append(fileInput);
  fileField.append(fileLabel, fileControl, fileHelp);
  const urlField = document.createElement("div");
  urlField.className = "field";
  const urlLabel = document.createElement("label");
  urlLabel.className = "label";
  urlLabel.textContent = schema?.properties?.[urlKey]?.title ?? "Image URL";
  const urlControl = document.createElement("div");
  urlControl.className = "control";
  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "input";
  urlInput.value = pendingUrl;
  urlInput.addEventListener("input", () => setPendingUrl(urlInput.value));
  urlControl.append(urlInput);
  urlField.append(urlLabel, urlControl);
  const actionsField = document.createElement("div");
  actionsField.className = "field";
  const actionsControl = document.createElement("div");
  actionsControl.className = "control buttons";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "button app-button app-primary";
  addButton.textContent = "Add to data";
  addButton.disabled = true;
  const discardButton = document.createElement("button");
  discardButton.type = "button";
  discardButton.className = "button app-button app-ghost";
  discardButton.textContent = "Discard";
  discardButton.disabled = true;
  addButton.addEventListener("click", () => {
    if (!pendingUrl) {
      return;
    }
    const entry = { [urlKey]: pendingUrl };
    if (altKey && pendingAlt.trim() !== "") {
      entry[altKey] = pendingAlt.trim();
    }
    const existing = data[targetKey];
    const list = Array.isArray(existing) ? existing : [];
    if (!Array.isArray(existing)) {
      data[targetKey] = list;
    }
    list.push(entry);
    editor?.setValue(data);
    urlInput.value = "";
    if (altInput) {
      altInput.value = "";
    }
    setPendingAlt("");
    setPendingUrl("");
  });
  discardButton.addEventListener("click", () => {
    urlInput.value = "";
    if (altInput) {
      altInput.value = "";
    }
    setPendingAlt("");
    setPendingUrl("");
  });
  actionsControl.append(addButton, discardButton);
  actionsField.append(actionsControl);
  const targetHelp = document.createElement("p");
  targetHelp.className = "help";
  targetHelp.textContent = `Adds to data.${targetKey}[]`;
  body.append(preview, fileField, urlField, actionsField, targetHelp);
  let altInput = null;
  if (altKey) {
    const altField = document.createElement("div");
    altField.className = "field";
    const altLabel = document.createElement("label");
    altLabel.className = "label";
    altLabel.textContent = schema?.properties?.[altKey]?.title ?? "Alt text";
    const altControl = document.createElement("div");
    altControl.className = "control";
    altInput = document.createElement("input");
    altInput.type = "text";
    altInput.className = "input";
    altInput.value = pendingAlt;
    const linkedAltInput = altInput;
    linkedAltInput.addEventListener("input", () => setPendingAlt(linkedAltInput.value));
    altControl.append(altInput);
    altField.append(altLabel, altControl);
    body.insertBefore(altField, actionsField);
  }
  moduleCard.append(buildHeader2(module, context.openSettings), body);
  panel.append(moduleCard);
};

// web/src/modules/registry.ts
var registry = {
  chat: renderChatModule,
  form: renderFormModule,
  gallery: renderGalleryModule,
  uploader: renderUploaderModule
};
var renderModule = (name, panel, context) => {
  const renderer = registry[name];
  if (!renderer) {
    return false;
  }
  renderer(panel, context);
  return true;
};

// web/src/views/modules.ts
var renderModulePanel = async ({
  auth,
  doc,
  editor,
  normalizeModuleList: normalizeModuleList2,
  fetchModuleSettings: fetchModuleSettings2,
  findModuleDefinition: findModuleDefinition2,
  ensureModuleSettingsDocument: ensureModuleSettingsDocument2,
  openModuleSettings
}) => {
  const panel = document.getElementById("module-panel");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  const moduleNames = normalizeModuleList2(doc.payload.modules, doc.payload.module ?? null);
  if (!moduleNames.length) {
    panel.classList.add("is-hidden");
    return;
  }
  panel.classList.remove("is-hidden");
  const moduleSettingsList = await Promise.all(
    moduleNames.map(async (moduleName) => ({
      name: moduleName,
      settings: await fetchModuleSettings2(moduleName, doc.payload)
    }))
  );
  moduleSettingsList.forEach(({ name: moduleName, settings }) => {
    const module = findModuleDefinition2(moduleName);
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
      openSettings: () => {
        void ensureModuleSettingsDocument2(module, doc.payload).then((resolved) => {
          openModuleSettings(resolved.id);
        }).catch((err) => {
          alert(err.message);
        });
      }
    });
    if (!handled) {
      const placeholder = document.createElement("div");
      placeholder.className = "notification is-light";
      placeholder.textContent = `${module.name} module is available but has no renderer yet.`;
      panel.append(placeholder);
    }
  });
};
var renderModulesView = ({
  content,
  modules,
  navigationPages,
  clearAgentState: clearAgentState2,
  loadDocument: loadDocument2
}) => {
  if (!content) {
    return;
  }
  clearAgentState2();
  const list = modules.map((module) => {
    const author = module.author ? ` \xB7 ${module.author}` : "";
    const storage = describeStorage(module);
    const storageLine = storage ? `<div class="app-module-row-meta">${storage}</div>` : "";
    return `
        <div class="app-module-row">
          <div class="app-module-row-title">${module.name}</div>
          <div class="app-module-row-meta">${module.description}${author}</div>
          <div class="app-module-row-meta">Input: ${module.input} \xB7 Output: ${module.output}</div>
          ${storageLine}
        </div>
      `;
  }).join("");
  const settingsDocs = navigationPages.filter((page) => page.page === "modules").flatMap((page) => page.sections).filter((section) => section.store === "private").map((section) => ({
    id: section.id,
    name: section.name,
    path: section.path
  }));
  const settingsList = settingsDocs.map(
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
  ).join("");
  const settingsSection = `
    <div id="module-settings-panel" class="app-module-settings is-hidden">
      <div class="mb-3">
        <h2 class="title is-5">Settings</h2>
        <p class="app-muted">Edit per-page or per-section module settings saved in manage/store/modules.</p>
      </div>
      ${settingsDocs.length ? `<div class="app-module-list">${settingsList}</div>` : `<div class="notification is-light">No module settings found yet.</div>`}
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
  document.querySelectorAll("[data-module-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      const encoded = button.getAttribute("data-module-settings") || "";
      const id = decodeURIComponent(encoded);
      if (id) {
        loadDocument2(id);
      }
    });
  });
};

// web/src/views/forms.ts
init_api();
var escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
var formatTimestamp = (value) => {
  if (!value) {
    return "Unknown time";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};
var buildFormSelect = (forms, currentId) => {
  const options = forms.map((form) => {
    const label = form.label || form.name;
    const source = form.source?.name ? ` \xB7 ${form.source.name}` : "";
    const selected = form.id === currentId ? "selected" : "";
    return `<option value="${form.id}" ${selected}>${escapeHtml(label)}${escapeHtml(source)}</option>`;
  }).join("");
  return `
    <div class="field">
      <label class="label">Form</label>
      <div class="control">
        <div class="select is-fullwidth">
          <select id="forms-select">${options}</select>
        </div>
      </div>
    </div>
  `;
};
var renderEntries = (doc, target) => {
  const data = doc.payload.data;
  const entries = Array.isArray(data?.entries) ? data?.entries : [];
  if (!entries.length) {
    target.innerHTML = `<div class="notification is-light">No entries yet.</div>`;
    return;
  }
  const list = entries.map((entry) => {
    if (!entry || typeof entry !== "object") {
      return "";
    }
    const record = entry;
    const submittedAt = formatTimestamp(record.submittedAt);
    const actor = record.actor && typeof record.actor === "object" ? record.actor : null;
    const actorLabel = actor ? `${actor.sub ?? ""}${actor.role ? ` \xB7 ${actor.role}` : ""}`.trim() : "anonymous";
    const payload = record.data ?? {};
    const payloadJson = escapeHtml(JSON.stringify(payload, null, 2));
    return `
        <article class="app-form-entry app-surface">
          <div class="app-form-entry-header">
            <div>
              <span class="app-form-entry-label">Submitted</span>
              <span class="app-form-entry-value">${escapeHtml(submittedAt)}</span>
            </div>
            <div>
              <span class="app-form-entry-label">Actor</span>
              <span class="app-form-entry-value">${escapeHtml(actorLabel || "anonymous")}</span>
            </div>
          </div>
          <pre class="app-form-entry-json">${payloadJson}</pre>
        </article>
      `;
  }).join("");
  target.innerHTML = `<div class="app-form-entry-list">${list}</div>`;
};
var renderFormsView = async ({
  content,
  auth,
  forms,
  setForms,
  fetchForms: fetchForms2,
  clearAgentState: clearAgentState2
}) => {
  if (!content) {
    return;
  }
  clearAgentState2();
  if (!auth) {
    content.innerHTML = `<p class="app-muted">Authentication required.</p>`;
    return;
  }
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">Forms</h1>
        <p class="app-muted">Collected form submissions stored in manage/store/system/forms/submissions.</p>
      </div>
    </div>
    <div class="notification is-light">Loading forms...</div>
  `;
  try {
    const response = await fetchForms2(auth);
    forms = Array.isArray(response.forms) ? response.forms : [];
    setForms(forms);
  } catch (err) {
    content.innerHTML = `<p class="app-muted">${err.message}</p>`;
    return;
  }
  if (!forms.length) {
    content.innerHTML = `
      <div class="app-view-header mb-4">
        <div>
          <h1 class="title is-4">Forms</h1>
          <p class="app-muted">Collected form submissions stored in manage/store/system/forms/submissions.</p>
        </div>
      </div>
      <div class="notification is-light">No forms found yet.</div>
    `;
    return;
  }
  const selectedId = forms[0]?.id || "";
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">Forms</h1>
        <p class="app-muted">Collected form submissions stored in manage/store/system/forms/submissions.</p>
      </div>
      <div class="app-view-actions">
        <span class="app-muted">${forms.length} total</span>
      </div>
    </div>
    <div class="app-forms-toolbar mb-4">${buildFormSelect(forms, selectedId)}</div>
    <div id="forms-entries" class="app-forms-entries"></div>
  `;
  const entriesTarget = document.getElementById("forms-entries");
  const select = document.getElementById("forms-select");
  const loadSelected = async (id) => {
    if (!entriesTarget || !auth) {
      return;
    }
    entriesTarget.innerHTML = `<div class="notification is-light">Loading entries...</div>`;
    try {
      const doc = await fetchDocument(auth, id);
      renderEntries(doc, entriesTarget);
    } catch (err) {
      entriesTarget.innerHTML = `<p class="app-muted">${err.message}</p>`;
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

// web/src/app/documents.ts
init_api();

// web/src/json-editor.ts
var isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var clone = (value) => JSON.parse(JSON.stringify(value));
var buildJsonEditor = (container, initialValue) => {
  let data = clone(initialValue ?? {});
  const openState = /* @__PURE__ */ new Map();
  const getPath = (parentPath, key) => {
    if (key === null) {
      return parentPath;
    }
    if (typeof key === "number") {
      return `${parentPath}[${key}]`;
    }
    return parentPath ? `${parentPath}.${key}` : String(key);
  };
  const snapshot = () => {
    openState.clear();
    container.querySelectorAll("details[data-path]").forEach((el) => {
      const details = el;
      openState.set(details.dataset.path || "", details.open);
    });
  };
  const restore = () => {
    container.querySelectorAll("details[data-path]").forEach((el) => {
      const details = el;
      const key = details.dataset.path || "";
      if (openState.has(key)) {
        details.open = openState.get(key) ?? false;
      }
    });
  };
  const createPrimitiveInput = (value, onChange) => {
    const type = typeof value;
    if (type === "boolean") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "checkbox";
      checkbox.checked = value;
      checkbox.addEventListener("change", () => onChange(checkbox.checked));
      return checkbox;
    }
    if (type === "number") {
      const input = document.createElement("input");
      input.type = "number";
      input.className = "input";
      input.step = "0.01";
      input.value = Number.isFinite(value) ? String(value) : "0";
      input.addEventListener("input", () => {
        const parsed = Number(input.value);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      });
      return input;
    }
    const textValue = value ?? "";
    if (typeof textValue === "string" && (textValue.length > 80 || textValue.includes("\n"))) {
      const textarea = document.createElement("textarea");
      textarea.className = "textarea";
      textarea.value = textValue;
      textarea.rows = Math.min(6, Math.max(3, textValue.split("\n").length));
      textarea.addEventListener("input", () => onChange(textarea.value));
      return textarea;
    }
    const text = document.createElement("input");
    text.type = "text";
    text.className = "input";
    text.value = String(textValue ?? "");
    text.addEventListener("input", () => onChange(text.value));
    return text;
  };
  const createRemoveButton = (handler) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button app-button app-danger is-small json-remove";
    button.textContent = "\u0391\u03C6\u03B1\u03AF\u03C1\u03B5\u03C3\u03B7";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    });
    return button;
  };
  const defaultValueForType = (type) => {
    switch (type) {
      case "number":
        return 0;
      case "boolean":
        return false;
      case "object":
        return {};
      case "array":
        return [];
      case "string":
      default:
        return "";
    }
  };
  const renderPrimitive = (value, parent, key, removeHandler) => {
    const row = document.createElement("div");
    row.className = "json-row";
    const keyEl = document.createElement("div");
    keyEl.className = "json-key";
    keyEl.textContent = typeof key === "number" ? `#${key + 1}` : key;
    const valueEl = document.createElement("div");
    valueEl.className = "json-value";
    const input = createPrimitiveInput(value, (next) => {
      if (Array.isArray(parent)) {
        parent[key] = next;
      } else {
        parent[key] = next;
      }
    });
    valueEl.append(input);
    const actions = document.createElement("div");
    actions.className = "json-actions";
    if (removeHandler) {
      actions.append(removeHandler);
    }
    row.append(keyEl, valueEl, actions);
    return row;
  };
  const renderObject = (obj, parent, key, path) => {
    const details = document.createElement("details");
    details.className = "json-node";
    details.open = true;
    details.dataset.path = path;
    const summary = document.createElement("summary");
    summary.className = "json-summary";
    const summaryLabel = document.createElement("span");
    summaryLabel.textContent = `${key ?? "object"} \xB7 ${Object.keys(obj).length} \u03C0\u03B5\u03B4\u03AF\u03B1`;
    summary.append(summaryLabel);
    details.append(summary);
    if (Array.isArray(parent) && key !== null) {
      const removeBtn = createRemoveButton(() => {
        parent.splice(key, 1);
        rerender();
      });
      removeBtn.classList.add("json-remove-inline");
      details.append(removeBtn);
    }
    const body = document.createElement("div");
    body.className = "json-children";
    Object.keys(obj).forEach((childKey) => {
      const child = obj[childKey];
      const childPath = getPath(path, childKey);
      if (Array.isArray(child) || isObject(child)) {
        const block = document.createElement("div");
        block.className = "json-block";
        block.append(renderNode(child, obj, childKey, childPath));
        body.append(block);
      } else {
        body.append(renderPrimitive(child, obj, childKey));
      }
    });
    details.append(body);
    return details;
  };
  const renderArray = (arr, parent, key, path) => {
    const details = document.createElement("details");
    details.className = "json-node";
    details.open = true;
    details.dataset.path = path;
    const summary = document.createElement("summary");
    summary.className = "json-summary";
    const summaryLabel = document.createElement("span");
    summaryLabel.textContent = `${key ?? "array"} \xB7 ${arr.length} \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1`;
    summary.append(summaryLabel);
    details.append(summary);
    if (Array.isArray(parent) && key !== null) {
      const removeBtn = createRemoveButton(() => {
        parent.splice(key, 1);
        rerender();
      });
      removeBtn.classList.add("json-remove-inline");
      details.append(removeBtn);
    }
    const body = document.createElement("div");
    body.className = "json-children";
    arr.forEach((item, index) => {
      const childPath = getPath(path, index);
      if (Array.isArray(item) || isObject(item)) {
        const wrapper = document.createElement("div");
        wrapper.className = "json-block";
        wrapper.append(renderNode(item, arr, index, childPath));
        body.append(wrapper);
      } else {
        const removeBtn = createRemoveButton(() => {
          arr.splice(index, 1);
          rerender();
        });
        body.append(renderPrimitive(item, arr, index, removeBtn));
      }
    });
    const addRow = document.createElement("div");
    addRow.className = "json-add";
    const typeSelect = document.createElement("select");
    ["string", "number", "boolean", "object", "array"].forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      typeSelect.append(option);
    });
    const selectWrap = document.createElement("div");
    selectWrap.className = "select is-small";
    selectWrap.append(typeSelect);
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "button app-button app-ghost is-small";
    addBtn.textContent = "\u03A0\u03C1\u03BF\u03C3\u03B8\u03AE\u03BA\u03B7 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03BF\u03C5";
    addBtn.addEventListener("click", () => {
      if (arr.length > 0) {
        arr.push(clone(arr[0]));
      } else {
        arr.push(defaultValueForType(typeSelect.value));
      }
      rerender();
    });
    addRow.append(selectWrap, addBtn);
    body.append(addRow);
    details.append(body);
    return details;
  };
  const renderNode = (node, parent, key, path) => {
    if (Array.isArray(node)) {
      return renderArray(node, parent, key, path);
    }
    if (isObject(node)) {
      return renderObject(node, parent, key, path);
    }
    return renderPrimitive(node, parent, key);
  };
  const render = () => {
    container.innerHTML = "";
    container.append(renderNode(data, null, "data", "data"));
    restore();
  };
  const rerender = () => {
    snapshot();
    render();
  };
  render();
  return {
    getValue: () => clone(data),
    setValue: (value) => {
      data = clone(value ?? {});
      rerender();
    }
  };
};

// web/src/features/modules/settings-form.ts
var slugify = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var resolveModuleForSettings = (modules, path) => {
  const filename = path.split("/").pop() ?? "";
  const base = filename.replace(/\.json$/i, "");
  if (!base) {
    return null;
  }
  const candidates = modules.map((module) => ({ module, slug: slugify(module.name) }));
  const direct = candidates.find((entry) => entry.slug === base);
  if (direct) {
    return direct.module;
  }
  const matched = candidates.find((entry) => base.endsWith(`-${entry.slug}`));
  return matched ? matched.module : null;
};
var humanizeKey = (value) => value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
var valueAtPath = (settings, key) => {
  if (!isRecord(settings)) {
    return void 0;
  }
  return settings[key];
};
var setValueAtPath = (target, path, value) => {
  let current = target;
  path.forEach((segment, index) => {
    if (index === path.length - 1) {
      current[segment] = value;
      return;
    }
    if (!isRecord(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  });
};
var cloneSettings = (settings) => settings ? JSON.parse(JSON.stringify(settings)) : {};
var renderModuleSettingsForm = ({
  container,
  module,
  settings,
  agents
}) => {
  const parameters = isRecord(module.parameters) ? module.parameters : {};
  const fields = [];
  const form = document.createElement("div");
  form.className = "app-module-settings-form";
  container.append(form);
  const agentsByName = new Map(agents.map((agent) => [agent.name, agent]));
  const agentsByUid = new Map(
    agents.map((agent) => [typeof agent.uid === "string" ? agent.uid : "", agent]).filter(([uid]) => uid !== "")
  );
  let agentNameSelect = null;
  let agentIdInput = null;
  let agentProviderInput = null;
  let pendingAgentId = "";
  let pendingAgentProvider = "";
  const renderField = (parent, path, defaultValue, currentValue) => {
    const field = document.createElement("div");
    field.className = "field";
    const labelText = humanizeKey(path[path.length - 1] ?? "");
    if (typeof defaultValue === "boolean") {
      const control2 = document.createElement("div");
      control2.className = "control";
      const checkboxLabel = document.createElement("label");
      checkboxLabel.className = "checkbox";
      const input2 = document.createElement("input");
      input2.type = "checkbox";
      input2.checked = Boolean(currentValue ?? defaultValue);
      checkboxLabel.append(input2, document.createTextNode(` ${labelText}`));
      control2.append(checkboxLabel);
      field.append(control2);
      fields.push({ path, type: "boolean", element: input2, defaultValue });
      parent.append(field);
      return;
    }
    const label = document.createElement("label");
    label.className = "label";
    label.textContent = labelText;
    field.append(label);
    const control = document.createElement("div");
    control.className = "control";
    if (module.name === "chat" && path.join(".") === "agent.name") {
      const select = document.createElement("select");
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = agents.length ? "Select agent" : "No agents available";
      select.append(emptyOption);
      if (!agents.length) {
        select.disabled = true;
      }
      agents.forEach((agent) => {
        const option = document.createElement("option");
        option.value = agent.name;
        option.textContent = agent.name;
        select.append(option);
      });
      const currentName = typeof currentValue === "string" ? currentValue : "";
      if (currentName && !agentsByName.has(currentName)) {
        const option = document.createElement("option");
        option.value = currentName;
        option.textContent = currentName;
        select.append(option);
      }
      select.value = currentName;
      select.addEventListener("change", () => {
        if (!agentIdInput) {
          return;
        }
        const selected = agentsByName.get(select.value);
        agentIdInput.value = selected?.uid ?? pendingAgentId;
        if (agentProviderInput) {
          agentProviderInput.value = selected?.provider ?? pendingAgentProvider;
        }
      });
      const selectWrapper = document.createElement("div");
      selectWrapper.className = "select is-fullwidth";
      selectWrapper.append(select);
      control.append(selectWrapper);
      agentNameSelect = select;
      fields.push({ path, type: "select", element: select, defaultValue });
      field.append(control);
      parent.append(field);
      return;
    }
    if (module.name === "chat" && path.join(".") === "agent.id") {
      const input2 = document.createElement("input");
      input2.type = "text";
      input2.className = "input";
      input2.value = typeof currentValue === "string" ? currentValue : "";
      input2.readOnly = true;
      pendingAgentId = input2.value;
      agentIdInput = input2;
      control.append(input2);
      field.append(control);
      parent.append(field);
      fields.push({ path, type: "text", element: input2, defaultValue });
      return;
    }
    if (module.name === "chat" && path.join(".") === "agent.provider") {
      const input2 = document.createElement("input");
      input2.type = "text";
      input2.className = "input";
      input2.value = typeof currentValue === "string" ? currentValue : "";
      input2.readOnly = true;
      agentProviderInput = input2;
      pendingAgentProvider = input2.value;
      control.append(input2);
      field.append(control);
      parent.append(field);
      fields.push({ path, type: "text", element: input2, defaultValue });
      return;
    }
    if (Array.isArray(defaultValue)) {
      const input2 = document.createElement("input");
      input2.type = "text";
      input2.className = "input";
      const list = Array.isArray(currentValue) ? currentValue : defaultValue;
      input2.value = list.map((entry) => String(entry)).join(", ");
      control.append(input2);
      const help = document.createElement("p");
      help.className = "help";
      help.textContent = "Comma separated values.";
      field.append(control, help);
      const itemType = defaultValue.length > 0 && typeof defaultValue[0] === "number" ? "number" : defaultValue.length > 0 && typeof defaultValue[0] === "boolean" ? "boolean" : "string";
      fields.push({ path, type: "list", element: input2, defaultValue, itemType });
      parent.append(field);
      return;
    }
    if (typeof defaultValue === "number") {
      const input2 = document.createElement("input");
      input2.type = "number";
      input2.step = Number.isInteger(defaultValue) ? "1" : "any";
      input2.className = "input";
      const numericValue = typeof currentValue === "number" || typeof currentValue === "string" ? String(currentValue) : String(defaultValue);
      input2.value = numericValue;
      control.append(input2);
      field.append(control);
      fields.push({ path, type: "number", element: input2, defaultValue });
      parent.append(field);
      return;
    }
    const input = document.createElement("input");
    input.type = "text";
    input.className = "input";
    input.value = typeof currentValue === "string" ? currentValue : currentValue == null ? String(defaultValue ?? "") : String(currentValue);
    control.append(input);
    field.append(control);
    fields.push({ path, type: "text", element: input, defaultValue });
    parent.append(field);
  };
  const renderGroup = (parent, group, current, path) => {
    Object.entries(group).forEach(([key, defaultValue]) => {
      const nextPath = [...path, key];
      const currentValue = valueAtPath(current, key);
      if (isRecord(defaultValue)) {
        const section = document.createElement("div");
        section.className = "app-module-settings-group";
        const heading = document.createElement("div");
        heading.className = "app-module-settings-title";
        heading.textContent = humanizeKey(key);
        section.append(heading);
        renderGroup(section, defaultValue, currentValue, nextPath);
        parent.append(section);
        return;
      }
      renderField(parent, nextPath, defaultValue, currentValue);
    });
  };
  if (!Object.keys(parameters).length) {
    const empty = document.createElement("p");
    empty.className = "app-muted";
    empty.textContent = "No module settings available.";
    form.append(empty);
  } else {
    renderGroup(form, parameters, settings, []);
  }
  const linkedAgentNameSelect = agentNameSelect;
  const linkedAgentIdInput = agentIdInput;
  const linkedAgentProviderInput = agentProviderInput;
  if (linkedAgentNameSelect && linkedAgentIdInput) {
    if (!linkedAgentNameSelect.value && pendingAgentId) {
      const match = agentsByUid.get(pendingAgentId);
      if (match) {
        linkedAgentNameSelect.value = match.name;
      }
    }
    if (linkedAgentNameSelect.value) {
      const match = agentsByName.get(linkedAgentNameSelect.value);
      if (match) {
        linkedAgentIdInput.value = match?.uid ?? "";
        if (linkedAgentProviderInput) {
          linkedAgentProviderInput.value = match?.provider ?? "";
        }
      } else {
        linkedAgentIdInput.value = pendingAgentId;
        if (linkedAgentProviderInput) {
          linkedAgentProviderInput.value = pendingAgentProvider;
        }
      }
    } else {
      linkedAgentIdInput.value = pendingAgentId;
      if (linkedAgentProviderInput) {
        linkedAgentProviderInput.value = pendingAgentProvider;
      }
    }
  }
  const getValue = () => {
    const output = cloneSettings(settings);
    fields.forEach((field) => {
      let value;
      if (field.type === "boolean") {
        value = field.element.checked;
      } else if (field.type === "number") {
        const raw = field.element.value.trim();
        const parsed = raw === "" ? NaN : Number(raw);
        value = Number.isFinite(parsed) ? parsed : field.defaultValue;
      } else if (field.type === "list") {
        const raw = field.element.value;
        const parts = raw.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
        if (field.itemType === "number") {
          value = parts.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
        } else if (field.itemType === "boolean") {
          value = parts.map((entry) => entry === "true");
        } else {
          value = parts;
        }
      } else {
        value = field.element.value.trim();
      }
      setValueAtPath(output, field.path, value);
    });
    return output;
  };
  return { getValue };
};

// web/src/views/documents.ts
var renderDocument = ({
  content,
  auth,
  modules,
  agents,
  doc,
  languageOptions,
  clearAgentState: clearAgentState2,
  moduleChecklistHtml: moduleChecklistHtml2,
  readSelectedModules: readSelectedModules2,
  normalizeModuleList: normalizeModuleList2,
  buildJsonEditor: buildJsonEditor2,
  editorRef: editorRef2,
  updateDocument: updateDocument2,
  downloadDocument: downloadDocument2,
  refreshNavigation: refreshNavigation2,
  renderModulePanel: renderModulePanel2,
  renderLogDocument: renderLogDocument2,
  onDocumentUpdated,
  onModuleSettingsSaved,
  returnToDocumentId,
  onReturnToDocument,
  rerender
}) => {
  if (!content) {
    return;
  }
  clearAgentState2();
  const payload = doc.payload;
  const selectedModules = normalizeModuleList2(payload.modules, payload.module ?? null);
  const isModuleSettings = payload.page === "modules" && doc.store === "private";
  const isLogSettings = doc.store === "private" && doc.path === "logs/logger-settings.json";
  const isLogDocument = doc.store === "private" && doc.path.startsWith("logs/") && !isLogSettings;
  const isSystemPage = doc.store === "private" && payload.position === "system";
  const isConfigurationPage = doc.store === "private" && doc.path === "system/configuration.json";
  const pageId = typeof payload.id === "string" && payload.id.trim() !== "" ? payload.id : null;
  const idMeta = pageId ? `
      <div class="app-doc-meta">
        <span class="app-doc-meta-label">ID</span>
        <code class="app-doc-meta-value">${pageId}</code>
        <button class="app-doc-meta-copy" type="button" aria-label="Copy ID" data-copy-doc-id="${pageId}">
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true">
              <rect x="9" y="9" width="10" height="10" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect>
              <rect x="5" y="5" width="10" height="10" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect>
            </svg>
          </span>
        </button>
      </div>
    ` : "";
  const languageMeta = languageOptions && languageOptions.options.length > 1 ? `
      <div class="field app-doc-language">
        <label class="label">Language</label>
        <div class="control">
          <div class="select">
            <select id="doc-language-select">
              ${languageOptions.options.map((option) => {
    const selected = option.language === languageOptions.currentLanguage ? "selected" : "";
    return `<option value="${option.id}" ${selected}>${option.label}</option>`;
  }).join("")}
            </select>
          </div>
        </div>
      </div>
    ` : "";
  const bindIdCopy = () => {
    document.querySelectorAll("[data-copy-doc-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const value = button.getAttribute("data-copy-doc-id") || "";
        if (!value) {
          return;
        }
        try {
          await navigator.clipboard.writeText(value);
          button.classList.add("is-copied");
          window.setTimeout(() => button.classList.remove("is-copied"), 1200);
        } catch {
          button.classList.add("is-error");
          window.setTimeout(() => button.classList.remove("is-error"), 1200);
        }
      });
    });
  };
  const bindLanguageSelect = () => {
    if (!languageOptions || languageOptions.options.length <= 1) {
      return;
    }
    const select = document.getElementById("doc-language-select");
    select?.addEventListener("change", () => {
      const id = select.value;
      const choice = languageOptions.options.find((option) => option.id === id) ?? null;
      if (choice) {
        languageOptions.onSelect(choice.id, choice.language ?? null);
      }
    });
  };
  if (isLogDocument) {
    renderLogDocument2(doc);
    bindIdCopy();
    return;
  }
  if (isModuleSettings) {
    editorRef2.set(null);
    const moduleDefinition = resolveModuleForSettings(modules, doc.path);
    content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">Module settings \xB7 ${doc.store}/${doc.path}</p>
        ${idMeta}
        ${languageMeta}
      </div>
      <div class="mb-4 buttons">
        ${returnToDocumentId ? `<button id="module-back" class="button app-button app-ghost">Back</button>` : ""}
        <button id="save" class="button app-button app-primary">\u0391\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7</button>
        <button id="export-json" class="button app-button app-ghost">Export JSON</button>
      </div>
      <div class="mt-4">
        <h2 class="title is-5">Settings</h2>
        <div id="module-settings-form" class="app-module-settings-surface"></div>
      </div>
    `;
    const formContainer = document.getElementById("module-settings-form");
    const settingsForm = formContainer && moduleDefinition ? renderModuleSettingsForm({
      container: formContainer,
      module: moduleDefinition,
      settings: typeof payload.data === "object" && payload.data !== null ? payload.data : null,
      agents
    }) : null;
    if (!moduleDefinition && formContainer) {
      formContainer.innerHTML = `<div class="notification is-light">Module definition not found.</div>`;
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
      const payloadToSave = {
        ...payload,
        type: payload.type ?? "module",
        data: settingsForm?.getValue() ?? payload.data
      };
      try {
        const updated = await updateDocument2(auth, doc.id, payloadToSave);
        onDocumentUpdated(updated);
        onModuleSettingsSaved();
        rerender(updated);
        await refreshNavigation2();
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById("export-json")?.addEventListener("click", async () => {
      if (!auth) {
        return;
      }
      try {
        const result = await downloadDocument2(auth, doc.id);
        const filename = result.filename ?? `${doc.path.split("/").pop() || "document"}.json`;
        triggerDownload(result.blob, filename);
      } catch (err) {
        alert(err.message);
      }
    });
    bindIdCopy();
    bindLanguageSelect();
    return;
  }
  if (isSystemPage) {
    content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">${payload.page} \xB7 ${doc.store}/${doc.path}</p>
        ${idMeta}
        ${languageMeta}
      </div>
      ${isConfigurationPage ? `<div class="notification is-light app-muted">The admin path is fixed at <strong>/manage/</strong>.</div>` : ""}
      <div class="mb-4 buttons">
        <button id="save" class="button app-button app-primary">\u0391\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7</button>
        <button id="export-json" class="button app-button app-ghost">Export JSON</button>
      </div>
      <div class="mt-4">
        <div id="module-panel" class="mb-4"></div>
        <h2 class="title is-5">Data</h2>
        <div id="json-editor" class="json-editor"></div>
      </div>
    `;
    const editorContainer2 = document.getElementById("json-editor");
    if (editorContainer2) {
      editorRef2.set(buildJsonEditor2(editorContainer2, payload.data));
    }
    const modulePanel = document.getElementById("module-panel");
    if (modulePanel && selectedModules.length > 0) {
      void renderModulePanel2(doc);
    }
    document.getElementById("save")?.addEventListener("click", async () => {
      if (!auth) {
        return;
      }
      const editor = editorRef2.get();
      const payloadToSave = {
        ...payload,
        data: editor ? editor.getValue() : payload.data
      };
      try {
        const updated = await updateDocument2(auth, doc.id, payloadToSave);
        onDocumentUpdated(updated);
        rerender(updated);
        await refreshNavigation2();
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById("export-json")?.addEventListener("click", async () => {
      if (!auth) {
        return;
      }
      try {
        const result = await downloadDocument2(auth, doc.id);
        const filename = result.filename ?? `${doc.path.split("/").pop() || "document"}.json`;
        triggerDownload(result.blob, filename);
      } catch (err) {
        alert(err.message);
      }
    });
    bindIdCopy();
    bindLanguageSelect();
    return;
  }
  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${payload.name}</h1>
      <p class="app-muted">${payload.page} \xB7 ${doc.store}/${doc.path}</p>
      ${idMeta}
      ${languageMeta}
    </div>
    <div class="mb-4 buttons">
      <button id="save" class="button app-button app-primary">\u0391\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7</button>
      <button id="export-json" class="button app-button app-ghost">Export JSON</button>
    </div>
    <div class="columns is-variable is-4 is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label">Order</label>
          <div class="control">
            <input
              id="field-order"
              class="input"
              type="number"
              min="0"
              step="1"
              value="${payload.order}"
            />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Page</label>
          <div class="control">
            <input id="field-page" class="input" type="text" value="${payload.page}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Name</label>
          <div class="control">
            <input id="field-name" class="input" type="text" value="${payload.name}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Language</label>
          <div class="control">
            <input id="field-language" class="input" type="text" value="${payload.language ?? ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Modules</label>
          <div class="control">
            <div id="field-modules" class="app-module-picker">
              ${moduleChecklistHtml2(selectedModules)}
            </div>
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Section</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select id="field-section">
                <option value="false" ${payload.section ? "" : "selected"}>false</option>
                <option value="true" ${payload.section ? "selected" : ""}>true</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <div id="module-panel" class="mb-4"></div>
      <h2 class="title is-5">Data</h2>
      <div id="json-editor" class="json-editor"></div>
    </div>
  `;
  const editorContainer = document.getElementById("json-editor");
  if (editorContainer) {
    editorRef2.set(buildJsonEditor2(editorContainer, payload.data));
  }
  void renderModulePanel2(doc);
  bindIdCopy();
  bindLanguageSelect();
  const moduleInput = document.getElementById("field-modules");
  moduleInput?.addEventListener("change", () => {
    payload.modules = readSelectedModules2(moduleInput);
    void renderModulePanel2(doc);
  });
  document.getElementById("save")?.addEventListener("click", async () => {
    if (!auth) {
      return;
    }
    const pageInput = document.getElementById("field-page");
    const nameInput = document.getElementById("field-name");
    const languageInput = document.getElementById("field-language");
    const sectionInput = document.getElementById("field-section");
    const orderInput = document.getElementById("field-order");
    const moduleInput2 = document.getElementById("field-modules");
    const orderRaw = orderInput?.value.trim() || "";
    if (!orderRaw) {
      alert("Order is required.");
      return;
    }
    const parsedOrder = Number(orderRaw);
    if (!Number.isInteger(parsedOrder)) {
      alert("Order must be an integer.");
      return;
    }
    const orderValue = parsedOrder;
    const payloadToSave = {
      type: payload.type ?? "page",
      page: pageInput?.value.trim() || payload.page,
      name: nameInput?.value.trim() || payload.name,
      language: languageInput?.value.trim() || void 0,
      order: orderValue,
      section: sectionInput?.value === "true",
      modules: readSelectedModules2(moduleInput2),
      data: editorRef2.get()?.getValue() ?? payload.data
    };
    try {
      const updated = await updateDocument2(auth, doc.id, payloadToSave);
      onDocumentUpdated(updated);
      rerender(updated);
      await refreshNavigation2();
    } catch (err) {
      alert(err.message);
    }
  });
  document.getElementById("export-json")?.addEventListener("click", async () => {
    if (!auth) {
      return;
    }
    try {
      const result = await downloadDocument2(auth, doc.id);
      const filename = result.filename ?? `${doc.path.split("/").pop() || "document"}.json`;
      triggerDownload(result.blob, filename);
    } catch (err) {
      alert(err.message);
    }
  });
};

// web/src/features/modules/settings.ts
init_api();
var fetchModuleSettings = async (auth, payload, moduleName, cache) => {
  if (!auth) {
    return null;
  }
  const key = moduleSettingsKey(payload, moduleName);
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }
  const path = `modules/${key}.json`;
  const id = encodeDocumentId("private", path);
  try {
    const doc = await fetchDocument(auth, id);
    const settings = isRecord(doc.payload.data) ? doc.payload.data : null;
    cache.set(key, settings);
    return settings;
  } catch {
    cache.set(key, null);
    return null;
  }
};
var ensureModuleSettingsDocument = async (auth, payload, module, cache) => {
  if (!auth) {
    throw new Error("Authentication required.");
  }
  const key = moduleSettingsKey(payload, module.name);
  const path = `modules/${key}.json`;
  const id = encodeDocumentId("private", path);
  try {
    const doc = await fetchDocument(auth, id);
    const settings = isRecord(doc.payload.data) ? doc.payload.data : null;
    cache.set(key, settings);
    return doc;
  } catch {
    const defaults = isRecord(module.parameters) ? module.parameters : {};
    const name = `${payload.name} \xB7 ${module.name}`;
    const created = await createDocument(auth, {
      store: "private",
      path,
      payload: {
        type: "module",
        page: "modules",
        name,
        order: 1,
        section: true,
        data: defaults
      }
    });
    const createdSettings = isRecord(created.payload.data) ? created.payload.data : null;
    cache.set(key, createdSettings);
    return created;
  }
};

// web/src/features/creations/controller.ts
init_api();

// web/src/views/creations.ts
var timestampFormatter = new Intl.DateTimeFormat(void 0, {
  dateStyle: "medium",
  timeStyle: "short"
});
var escapeHtml2 = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var reasonLabel = (reason) => {
  if (reason === "before-clear") {
    return "Pre-clear snapshot";
  }
  return "Manual snapshot";
};
var targetLabel = (target) => target === "build" ? "Build" : "Public";
var formatTimestamp2 = (value) => {
  if (!value) {
    return "Unknown time";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return timestampFormatter.format(date);
};
var runButtonAction = async (button, pendingLabel, action) => {
  const originalLabel = button.textContent ?? pendingLabel;
  button.disabled = true;
  button.textContent = pendingLabel;
  try {
    await action();
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
};
var buildCard = (creation) => {
  const article = document.createElement("article");
  article.className = "app-creation-card app-surface";
  article.innerHTML = `
    <div class="app-creation-preview is-loading">
      <div class="app-creation-preview-glow"></div>
      <img alt="${escapeHtml2(creation.id)}" loading="lazy" />
    </div>
    <div class="app-creation-copy">
      <div class="app-creation-copy-top">
        <span class="app-creation-badge">${escapeHtml2(`${targetLabel(creation.target)} \xB7 ${reasonLabel(creation.reason)}`)}</span>
        <span class="app-creation-date">${escapeHtml2(formatTimestamp2(creation.createdAt))}</span>
      </div>
      <h2 class="app-creation-title">${escapeHtml2(creation.id)}</h2>
      <div class="app-creation-paths">
        <div>
          <span class="app-creation-label">Backup</span>
          <code>manage/store/${escapeHtml2(creation.backupPath)}</code>
        </div>
        <div>
          <span class="app-creation-label">Preview</span>
          <code>manage/store/${escapeHtml2(creation.snapshotPath)}</code>
        </div>
      </div>
    </div>
    <div class="app-creation-actions">
      <button data-action="download" class="button app-button app-primary">Download</button>
      <button data-action="restore" class="button app-button app-ghost">Restore</button>
      <button data-action="delete" class="button app-button app-danger">Delete</button>
    </div>
  `;
  return article;
};
var renderCreationsView = ({
  content,
  doc,
  creations,
  onSnapshot,
  onClearAll,
  onDelete,
  onRestore,
  onDownload,
  onExportJson,
  loadPreview
}) => {
  if (!content) {
    return;
  }
  content.innerHTML = `
    <section class="app-creations-shell">
      <div class="app-creations-hero app-surface">
        <div>
          <p class="app-creations-kicker">System page</p>
          <h1 class="title is-4">${escapeHtml2(doc.payload.name)}</h1>
          <p class="app-muted app-creations-subtitle">
            Capture visual snapshots of the public website and store a restorable tar.gz backup of the website files.
          </p>
        </div>
        <div class="app-creations-stats">
          <div>
            <span class="app-creations-stat-value">${creations.length}</span>
            <span class="app-creations-stat-label">Snapshots</span>
          </div>
          <div>
            <span class="app-creations-stat-value">${escapeHtml2(doc.store)}</span>
            <span class="app-creations-stat-label">Store</span>
          </div>
        </div>
      </div>
      <div class="app-creations-toolbar">
        <div class="buttons">
          <button id="creation-snapshot" class="button app-button app-primary">Get Snapshot</button>
          <button id="creation-clear" class="button app-button app-danger">Clear All</button>
          <button id="creation-export" class="button app-button app-ghost">Export JSON</button>
        </div>
        <p class="app-muted app-creations-note">
          Public snapshots restore to the public site. Build snapshots restore to the build directory.
        </p>
      </div>
      <div id="creation-grid" class="app-creation-grid"></div>
    </section>
  `;
  const grid = document.getElementById("creation-grid");
  if (!grid) {
    return;
  }
  if (creations.length === 0) {
    grid.innerHTML = `
      <div class="app-creation-empty app-surface">
        <h2 class="title is-5">No snapshots yet</h2>
        <p class="app-muted">Use Get Snapshot to capture the current public website and save its backup archive.</p>
      </div>
    `;
  } else {
    creations.forEach((creation) => {
      const card = buildCard(creation);
      const preview = card.querySelector(".app-creation-preview");
      const image = card.querySelector("img");
      const downloadButton = card.querySelector('[data-action="download"]');
      const restoreButton = card.querySelector('[data-action="restore"]');
      const deleteButton = card.querySelector('[data-action="delete"]');
      void loadPreview(creation.id).then((url) => {
        if (!image || !preview) {
          URL.revokeObjectURL(url);
          return;
        }
        image.addEventListener(
          "load",
          () => {
            preview.classList.remove("is-loading");
            URL.revokeObjectURL(url);
          },
          { once: true }
        );
        image.addEventListener(
          "error",
          () => {
            preview.classList.remove("is-loading");
            preview.classList.add("is-error");
            URL.revokeObjectURL(url);
          },
          { once: true }
        );
        image.src = url;
      }).catch(() => {
        preview?.classList.remove("is-loading");
        preview?.classList.add("is-error");
      });
      downloadButton?.addEventListener("click", () => {
        void runButtonAction(downloadButton, "Downloading...", () => onDownload(creation.id));
      });
      restoreButton?.addEventListener("click", () => {
        if (!window.confirm(`Restore ${creation.id}? This will clean the public website first.`)) {
          return;
        }
        void runButtonAction(restoreButton, "Restoring...", () => onRestore(creation.id));
      });
      deleteButton?.addEventListener("click", () => {
        if (!window.confirm(`Delete ${creation.id}? This removes the preview and backup archive.`)) {
          return;
        }
        void runButtonAction(deleteButton, "Deleting...", () => onDelete(creation.id));
      });
      grid.append(card);
    });
  }
  const snapshotButton = document.getElementById("creation-snapshot");
  const clearButton = document.getElementById("creation-clear");
  const exportButton = document.getElementById("creation-export");
  snapshotButton?.addEventListener("click", () => {
    void runButtonAction(snapshotButton, "Capturing...", onSnapshot);
  });
  clearButton?.addEventListener("click", () => {
    if (!window.confirm("Clear the public website? A fresh snapshot will be created first.")) {
      return;
    }
    void runButtonAction(clearButton, "Clearing...", onClearAll);
  });
  exportButton?.addEventListener("click", () => {
    void runButtonAction(exportButton, "Preparing...", onExportJson);
  });
};

// web/src/features/creations/capture.ts
var CAPTURE_WIDTH = 1440;
var CAPTURE_HEIGHT = 900;
var CAPTURE_TIMEOUT_MS = 15e3;
var wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
var loadIframe = (iframe) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => {
    cleanup();
    reject(new Error("Snapshot timed out while loading the website."));
  }, CAPTURE_TIMEOUT_MS);
  const cleanup = () => {
    window.clearTimeout(timer);
    iframe.removeEventListener("load", handleLoad);
    iframe.removeEventListener("error", handleError);
  };
  const handleLoad = () => {
    cleanup();
    const doc = iframe.contentDocument;
    if (!doc) {
      reject(new Error("Snapshot failed because the website document is unavailable."));
      return;
    }
    resolve(doc);
  };
  const handleError = () => {
    cleanup();
    reject(new Error("Snapshot failed while loading the website."));
  };
  iframe.addEventListener("load", handleLoad, { once: true });
  iframe.addEventListener("error", handleError, { once: true });
});
var waitForImages = async (doc) => {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      (image) => new Promise((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }
        image.loading = "eager";
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })
    )
  );
};
var rewriteCssUrls = (cssText, baseUrl) => cssText.replace(/url\((["']?)(.*?)\1\)/gi, (_match, quote, rawUrl) => {
  const url = rawUrl.trim();
  if (!url || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("#") || /^[a-z]+:/i.test(url) || url.startsWith("//")) {
    return `url(${quote}${url}${quote})`;
  }
  try {
    return `url(${quote}${new URL(url, baseUrl).href}${quote})`;
  } catch {
    return `url(${quote}${url}${quote})`;
  }
});
var collectStyles = (doc) => {
  let css = "";
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules);
      const baseUrl = sheet.href ?? doc.baseURI;
      css += `${rules.map((rule) => rewriteCssUrls(rule.cssText, baseUrl)).join("\n")}
`;
    } catch {
    }
  }
  return css;
};
var absolutizeAttribute = (value, baseUrl) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("#") || /^[a-z]+:/i.test(trimmed) || trimmed.startsWith("//")) {
    return trimmed;
  }
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
};
var inlineCanvasSnapshots = (sourceDoc, clonedRoot) => {
  const sourceCanvases = Array.from(sourceDoc.querySelectorAll("canvas"));
  const clonedCanvases = Array.from(clonedRoot.querySelectorAll("canvas"));
  sourceCanvases.forEach((canvas, index) => {
    const clone2 = clonedCanvases[index];
    if (!clone2) {
      return;
    }
    try {
      const image = sourceDoc.createElement("img");
      image.setAttribute("src", canvas.toDataURL("image/png"));
      image.setAttribute("alt", "");
      clone2.replaceWith(image);
    } catch {
    }
  });
};
var cloneWebsiteDocument = (doc) => {
  const clonedRoot = doc.documentElement.cloneNode(true);
  clonedRoot.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clonedRoot.querySelectorAll("script").forEach((script) => script.remove());
  const head = clonedRoot.querySelector("head");
  if (head) {
    const base = doc.createElement("base");
    base.setAttribute("href", doc.baseURI);
    head.prepend(base);
    const style = doc.createElement("style");
    style.textContent = collectStyles(doc);
    head.append(style);
  }
  inlineCanvasSnapshots(doc, clonedRoot);
  clonedRoot.querySelectorAll("*").forEach((element) => {
    ["src", "href", "poster"].forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current) {
        return;
      }
      element.setAttribute(attribute, absolutizeAttribute(current, doc.baseURI));
    });
    const inlineStyle = element.getAttribute("style");
    if (inlineStyle) {
      element.setAttribute("style", rewriteCssUrls(inlineStyle, doc.baseURI));
    }
  });
  return clonedRoot;
};
var svgMarkup = (root) => {
  const serialized = new XMLSerializer().serializeToString(root);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CAPTURE_WIDTH}" height="${CAPTURE_HEIGHT}" viewBox="0 0 ${CAPTURE_WIDTH} ${CAPTURE_HEIGHT}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;
};
var drawSvgToCanvas = async (svg) => {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "sync";
      img.addEventListener("load", () => resolve(img), { once: true });
      img.addEventListener("error", () => reject(new Error("Snapshot image could not be rendered.")), {
        once: true
      });
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Snapshot capture is not supported in this browser.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    context.drawImage(image, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    try {
      return canvas.toDataURL("image/png");
    } catch {
      throw new Error("Snapshot capture failed because the website uses blocked external assets.");
    }
  } finally {
    URL.revokeObjectURL(url);
  }
};
var svgToDataUrl = (svg) => {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
};
var captureWebsiteSnapshot = async (path = "/") => {
  const iframe = document.createElement("iframe");
  iframe.src = path;
  iframe.width = String(CAPTURE_WIDTH);
  iframe.height = String(CAPTURE_HEIGHT);
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-200vw";
  iframe.style.top = "0";
  iframe.style.width = `${CAPTURE_WIDTH}px`;
  iframe.style.height = `${CAPTURE_HEIGHT}px`;
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";
  document.body.append(iframe);
  try {
    const doc = await loadIframe(iframe);
    iframe.contentWindow?.scrollTo(0, 0);
    await doc.fonts?.ready;
    await waitForImages(doc);
    await wait(450);
    const cloned = cloneWebsiteDocument(doc);
    const svg = svgMarkup(cloned);
    try {
      return await drawSvgToCanvas(svg);
    } catch {
      return svgToDataUrl(svg);
    }
  } finally {
    iframe.remove();
  }
};

// web/src/features/creations/controller.ts
var readCreations = (value) => {
  const records = isRecord(value) && Array.isArray(value.creations) ? value.creations : Array.isArray(value) ? value : [];
  return records.filter((record) => {
    if (!isRecord(record)) {
      return false;
    }
    return typeof record.id === "string" && typeof record.createdAt === "string" && typeof record.snapshotPath === "string" && typeof record.backupPath === "string";
  }).map((record) => ({
    id: record.id,
    createdAt: record.createdAt,
    reason: typeof record.reason === "string" ? record.reason : null,
    target: record.target === "build" ? "build" : "public",
    snapshotPath: record.snapshotPath,
    snapshotMimeType: typeof record.snapshotMimeType === "string" ? record.snapshotMimeType : null,
    backupPath: record.backupPath
  }));
};
var applyResult = async (result, onDocumentUpdated, rerender, refreshNavigation2) => {
  onDocumentUpdated(result.document);
  rerender(result.document);
  await refreshNavigation2();
};
var isCreationsDocument = (doc) => doc.store === "private" && doc.path === "creations.json";
var renderCreationsPage = ({
  content,
  auth,
  doc,
  onDocumentUpdated,
  refreshNavigation: refreshNavigation2,
  rerender
}) => {
  const creations = readCreations(doc.payload.data);
  renderCreationsView({
    content,
    doc,
    creations,
    onSnapshot: async () => {
      if (!auth) {
        return;
      }
      try {
        const snapshot = await captureWebsiteSnapshot();
        const result = await createCreationSnapshot(auth, snapshot);
        await applyResult(result, onDocumentUpdated, rerender, refreshNavigation2);
      } catch (err) {
        alert(err.message);
      }
    },
    onClearAll: async () => {
      if (!auth) {
        return;
      }
      try {
        const snapshot = await captureWebsiteSnapshot();
        const result = await clearWebsiteWithSnapshot(auth, snapshot);
        await applyResult(result, onDocumentUpdated, rerender, refreshNavigation2);
      } catch (err) {
        alert(err.message);
      }
    },
    onDelete: async (id) => {
      if (!auth) {
        return;
      }
      try {
        const result = await deleteCreationSnapshot(auth, id);
        await applyResult(result, onDocumentUpdated, rerender, refreshNavigation2);
      } catch (err) {
        alert(err.message);
      }
    },
    onRestore: async (id) => {
      if (!auth) {
        return;
      }
      try {
        const result = await restoreCreationSnapshot(auth, id);
        await applyResult(result, onDocumentUpdated, rerender, refreshNavigation2);
      } catch (err) {
        alert(err.message);
      }
    },
    onDownload: async (id) => {
      if (!auth) {
        return;
      }
      try {
        const result = await downloadCreationSnapshot(auth, id);
        triggerDownload(result.blob, result.filename ?? `${id}.tar.gz`);
      } catch (err) {
        alert(err.message);
      }
    },
    onExportJson: async () => {
      if (!auth) {
        return;
      }
      try {
        const result = await downloadDocument(auth, doc.id);
        const filename = result.filename ?? `${doc.path.split("/").pop() || "document"}.json`;
        triggerDownload(result.blob, filename);
      } catch (err) {
        alert(err.message);
      }
    },
    loadPreview: async (id) => {
      if (!auth) {
        throw new Error("Unauthorized");
      }
      const result = await fetchCreationSnapshotImage(auth, id);
      return URL.createObjectURL(result.blob);
    }
  });
};

// web/src/features/website-build/controller.ts
init_api();

// web/src/views/website-build.ts
var escapeHtml3 = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var runButtonAction2 = async (button, pendingLabel, action) => {
  const originalLabel = button.textContent ?? pendingLabel;
  button.disabled = true;
  button.textContent = pendingLabel;
  try {
    await action();
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
};
var renderWebsiteBuildView = ({
  content,
  doc,
  onVisit,
  onPublish,
  onClean,
  onCopyFromPublic,
  onTabChange
}) => {
  if (!content) {
    return;
  }
  content.innerHTML = `
    <section class="app-build-shell">
      <div class="app-build-header">
        <div>
          <p class="app-build-kicker app-muted">System page</p>
          <h1 class="title is-4">${escapeHtml3(doc.payload.name)}</h1>
          <p class="app-muted app-build-subtitle">Chat with the builder and preview the output.</p>
        </div>
        <div class="app-build-actions buttons">
          <button id="build-visit" class="button app-button app-ghost">Visit</button>
          <button id="build-copy-public" class="button app-button app-ghost">Copy from public</button>
          <button id="build-publish" class="button app-button app-primary">Publish</button>
          <button id="build-clean" class="button app-button app-danger">Clean</button>
        </div>
      </div>
      <div class="tabs is-toggle is-small app-build-tabs">
        <ul>
          <li class="is-active"><a data-build-tab="chat">Chat</a></li>
          <li><a data-build-tab="preview">Preview</a></li>
        </ul>
      </div>
      <div class="app-build-body">
        <div id="build-chat" class="app-build-panel is-active">
          <div id="module-panel"></div>
        </div>
        <div id="build-preview" class="app-build-panel">
          <div class="app-build-preview">
            <div id="build-preview-loading" class="app-build-preview-loading is-hidden">
              <div class="app-build-spinner" aria-hidden="true"></div>
              <div class="app-build-preview-copy">
                <div class="app-build-preview-title">Codex is working</div>
                <div id="build-preview-reasoning" class="app-build-preview-reasoning">Waiting for updates...</div>
              </div>
            </div>
            <div id="build-preview-frame" class="app-build-preview-frame">
              <iframe id="build-preview-iframe" title="Build preview"></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  const visitButton = document.getElementById("build-visit");
  const copyFromPublicButton = document.getElementById("build-copy-public");
  const publishButton = document.getElementById("build-publish");
  const cleanButton = document.getElementById("build-clean");
  visitButton?.addEventListener("click", onVisit);
  copyFromPublicButton?.addEventListener("click", () => {
    if (!copyFromPublicButton) {
      return;
    }
    void runButtonAction2(copyFromPublicButton, "Copying...", onCopyFromPublic);
  });
  publishButton?.addEventListener("click", () => {
    if (!publishButton) {
      return;
    }
    void runButtonAction2(publishButton, "Publishing...", onPublish);
  });
  cleanButton?.addEventListener("click", () => {
    if (!cleanButton) {
      return;
    }
    void runButtonAction2(cleanButton, "Cleaning...", onClean);
  });
  const tabLinks = Array.from(content.querySelectorAll("[data-build-tab]"));
  const panels = {
    chat: document.getElementById("build-chat"),
    preview: document.getElementById("build-preview")
  };
  const activate = (tab) => {
    tabLinks.forEach((link) => {
      const parent = link.closest("li");
      if (!parent) {
        return;
      }
      parent.classList.toggle("is-active", link.dataset.buildTab === tab);
    });
    Object.entries(panels).forEach(([key, panel]) => {
      panel?.classList.toggle("is-active", key === tab);
    });
    onTabChange?.(tab);
  };
  tabLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const tab = link.dataset.buildTab === "preview" ? "preview" : "chat";
      activate(tab);
    });
  });
};

// web/src/features/website-build/controller.ts
var isWebsiteBuildDocument = (doc) => doc.store === "private" && doc.path === "website-build.json";
var disposeProgressListener = null;
var renderWebsiteBuildPage = ({
  content,
  auth,
  doc,
  renderModulePanel: renderModulePanel2
}) => {
  const buildUrl = `${window.location.origin}/build/`;
  const settingsKey = moduleSettingsKey(doc.payload, "chat");
  renderWebsiteBuildView({
    content,
    doc,
    onVisit: () => {
      window.open(buildUrl, "_blank", "noopener");
    },
    onPublish: async () => {
      if (!auth) {
        return;
      }
      try {
        await publishWebsiteBuild(auth);
      } catch (err) {
        alert(err.message);
      }
    },
    onClean: async () => {
      if (!auth) {
        return;
      }
      try {
        const snapshot = await captureWebsiteSnapshot("/build/");
        await cleanWebsiteBuild(auth, snapshot);
        refreshPreview();
      } catch (err) {
        alert(err.message);
      }
    },
    onCopyFromPublic: async () => {
      if (!auth) {
        return;
      }
      try {
        const snapshot = await captureWebsiteSnapshot("/build/");
        await copyWebsiteBuildFromPublic(auth, snapshot);
        refreshPreview();
      } catch (err) {
        alert(err.message);
      }
    },
    onTabChange: (tab) => {
      if (tab === "preview") {
        refreshPreviewIfReady();
      }
    }
  });
  const previewLoading = document.getElementById("build-preview-loading");
  const previewReasoning = document.getElementById("build-preview-reasoning");
  const previewFrameWrap = document.getElementById("build-preview-frame");
  const previewIframe = document.getElementById("build-preview-iframe");
  const previewPanel = document.getElementById("build-preview");
  const refreshPreview = () => {
    if (!previewIframe) {
      return;
    }
    const cacheBuster = `cb=${Date.now()}`;
    previewIframe.src = buildUrl.includes("?") ? `${buildUrl}&${cacheBuster}` : `${buildUrl}?${cacheBuster}`;
  };
  const refreshPreviewIfReady = () => {
    if (!previewPanel?.classList.contains("is-active")) {
      return;
    }
    if (previewLoading?.classList.contains("is-hidden")) {
      refreshPreview();
    }
  };
  const setPreviewPending = (pending, progress) => {
    if (previewLoading) {
      previewLoading.classList.toggle("is-hidden", !pending);
    }
    if (previewFrameWrap) {
      previewFrameWrap.classList.toggle("is-hidden", pending);
    }
    if (previewReasoning) {
      const latestItem = progress?.items?.[progress.items.length - 1]?.message;
      const message = progress?.status || latestItem || "Working...";
      previewReasoning.textContent = pending ? message : "Ready.";
    }
    if (!pending) {
      refreshPreviewIfReady();
    }
  };
  if (disposeProgressListener) {
    disposeProgressListener();
    disposeProgressListener = null;
  }
  const onProgress = (event) => {
    const detail = event.detail;
    if (!detail || detail.settingsKey !== settingsKey) {
      return;
    }
    setPreviewPending(Boolean(detail.pending), detail.progress ?? null);
  };
  window.addEventListener("app:chat-progress", onProgress);
  disposeProgressListener = () => {
    window.removeEventListener("app:chat-progress", onProgress);
  };
  void renderModulePanel2(doc).catch((err) => {
    alert(err.message);
  });
};

// web/src/app/documents.ts
var openLoggerSettings = () => {
  if (!state.auth) {
    return;
  }
  const id = encodeDocumentId("private", "logs/logger-settings.json");
  void loadDocument(id);
};
var renderDocumentView = (doc) => {
  const content = document.getElementById("content");
  const isWebsiteBuild = isWebsiteBuildDocument(doc);
  document.body?.classList.toggle("app-build-mode", isWebsiteBuild);
  const languageMatch = doc.id ? findDocumentVariants(state.navigationGroups, doc.id) : null;
  const languageOptions = languageMatch ? {
    currentLanguage: normalizeLanguageValue(doc.payload.language),
    options: languageMatch.variants.map((variant) => ({
      id: variant.id,
      language: normalizeLanguageValue(variant.language),
      label: normalizeLanguageValue(variant.language) ?? "default"
    }))
  } : null;
  if (isWebsiteBuild) {
    clearAgentState();
    editorRef.set(null);
    renderWebsiteBuildPage({
      content,
      auth: state.auth,
      doc,
      renderModulePanel: (moduleDoc) => renderModulePanel({
        auth: state.auth,
        doc: moduleDoc,
        editor: null,
        normalizeModuleList,
        fetchModuleSettings: (moduleName, payload) => fetchModuleSettings(state.auth, payload, moduleName, state.moduleSettingsCache),
        findModuleDefinition: (name) => findModuleDefinition(state.modules, name),
        ensureModuleSettingsDocument: (module, payload) => ensureModuleSettingsDocument(state.auth, payload, module, state.moduleSettingsCache),
        openModuleSettings: (settingsId) => {
          if (!moduleDoc?.id) {
            return;
          }
          state.returnToDocumentId = moduleDoc.id;
          loadDocument(settingsId);
        }
      })
    });
    return;
  }
  if (isCreationsDocument(doc)) {
    clearAgentState();
    renderCreationsPage({
      content,
      auth: state.auth,
      doc,
      onDocumentUpdated: (updated) => {
        state.currentDocument = updated;
      },
      refreshNavigation: () => refreshNavigation(loadDocument),
      rerender: (updated) => {
        renderDocumentView(updated);
      }
    });
    return;
  }
  renderDocument({
    content,
    auth: state.auth,
    modules: state.modules,
    agents: state.agents,
    doc,
    languageOptions: languageOptions ? {
      ...languageOptions,
      onSelect: async (id, language) => {
        state.activeLanguage = language ? language : null;
        await refreshNavigation(loadDocument);
        loadDocument(id);
      }
    } : null,
    clearAgentState,
    moduleChecklistHtml: (selected) => moduleChecklistHtml(state.modules, selected),
    readSelectedModules,
    normalizeModuleList,
    buildJsonEditor,
    editorRef,
    updateDocument,
    downloadDocument,
    refreshNavigation: () => refreshNavigation(loadDocument),
    renderModulePanel: (moduleDoc) => renderModulePanel({
      auth: state.auth,
      doc: moduleDoc,
      editor: editorRef.get(),
      normalizeModuleList,
      fetchModuleSettings: (moduleName, payload) => fetchModuleSettings(state.auth, payload, moduleName, state.moduleSettingsCache),
      findModuleDefinition: (name) => findModuleDefinition(state.modules, name),
      ensureModuleSettingsDocument: (module, payload) => ensureModuleSettingsDocument(state.auth, payload, module, state.moduleSettingsCache),
      openModuleSettings: (settingsId) => {
        if (!moduleDoc?.id) {
          return;
        }
        state.returnToDocumentId = moduleDoc.id;
        loadDocument(settingsId);
      }
    }),
    renderLogDocument: (logDoc) => renderLogDocument({
      content,
      auth: state.auth,
      doc: logDoc,
      logs: state.logs,
      loadDocument,
      openLoggerSettings,
      downloadDocument
    }),
    onDocumentUpdated: (updated) => {
      state.currentDocument = updated;
    },
    onModuleSettingsSaved: () => {
      state.moduleSettingsCache.clear();
    },
    returnToDocumentId: state.returnToDocumentId,
    onReturnToDocument: (id) => {
      state.returnToDocumentId = null;
      loadDocument(id);
    },
    rerender: (updated) => {
      renderDocumentView(updated);
    }
  });
};
var loadDocument = async (id) => {
  if (!state.auth) {
    return;
  }
  clearRegisteredIntegrationCleanup();
  try {
    const doc = await fetchDocument(state.auth, id);
    state.currentDocument = doc;
    if (!(doc.store === "private" && doc.payload.page === "modules")) {
      state.returnToDocumentId = null;
    }
    if (doc.store === "private" && doc.path.startsWith("logs/") && !state.logs.length) {
      try {
        const { fetchLogs: fetchLogs2 } = await Promise.resolve().then(() => (init_api(), api_exports));
        const response = await fetchLogs2(state.auth);
        state.logs = Array.isArray(response.logs) ? response.logs : [];
      } catch {
      }
    }
    renderDocumentView(doc);
  } catch (err) {
    alert(err.message);
  }
};

// web/src/app/screens.ts
init_api();
var showModulesView = () => {
  clearRegisteredIntegrationCleanup();
  renderModulesView({
    content: document.getElementById("content"),
    modules: state.modules,
    navigationPages: state.navigationPages,
    clearAgentState,
    loadDocument
  });
};
var showIntegrationsView = (onAfterLoad) => {
  const render = () => renderIntegrationsView({
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
    reloadIntegrations: () => loadIntegrations({ onAfterLoad })
  });
  render();
  const reloadAndRender = async () => {
    await loadIntegrations({ onAfterLoad });
    render();
  };
  const handleRealtimeEvent = (event) => {
    if (event.type !== "integration.sync.updated") {
      return;
    }
    void reloadAndRender();
    if (event.syncing) {
      return;
    }
    if (event.ok === false) {
      pushNotice("error", event.error || `Model sync failed for ${event.name}.`);
      return;
    }
    if (event.ok === true) {
      const suffix = typeof event.models === "number" ? ` (${event.models} models)` : "";
      pushNotice("success", `Models synced for ${event.name}${suffix}.`);
    }
  };
  const handleRealtimeStatus = (status2) => {
    if (status2 === "open") {
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
var showLogsView = () => {
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
    openLoggerSettings
  });
};
var showFormsView = () => {
  clearRegisteredIntegrationCleanup();
  renderFormsView({
    content: document.getElementById("content"),
    auth: state.auth,
    forms: state.forms,
    setForms: (next) => {
      state.forms = next;
    },
    fetchForms,
    clearAgentState
  });
};

// web/src/features/agents/controller.ts
init_api();

// web/src/features/agents/view.ts
init_api();

// web/src/features/agents/chat.ts
var renderMessages2 = (conversation) => {
  const messagesContainer = document.getElementById("agent-chat-messages");
  if (!messagesContainer) {
    return;
  }
  if (!conversation) {
    messagesContainer.innerHTML = `<p class="app-muted">Start a conversation with your next message.</p>`;
    return;
  }
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const messages = Array.isArray(payloadData.messages) ? payloadData.messages : [];
  if (!messages.length) {
    messagesContainer.innerHTML = `<p class="app-muted">No messages yet.</p>`;
    return;
  }
  messagesContainer.innerHTML = messages.map((message) => {
    const record = isRecord(message) ? message : {};
    const role = typeof record.role === "string" ? record.role : "user";
    const content = typeof record.content === "string" ? record.content : "";
    const label = role === "assistant" ? "Agent" : "You";
    const roleClass = role === "assistant" ? "is-assistant" : "is-user";
    return `
        <div class="app-chat-message ${roleClass}">
          <div class="app-chat-message-role">${label}</div>
          <div class="app-chat-message-content">${content}</div>
        </div>
      `;
  }).join("");
  appendConversationProgress(messagesContainer, getConversationProgress(conversation));
};
var updateConversationHeader2 = (conversation) => {
  const title = document.getElementById("agent-chat-title");
  const meta = document.getElementById("agent-chat-meta");
  if (!title || !meta) {
    return;
  }
  if (!conversation) {
    title.textContent = "No conversation selected";
    meta.textContent = "Select or create a conversation.";
    return;
  }
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const createdAt = typeof payloadData.createdAt === "string" ? payloadData.createdAt : "";
  title.textContent = conversation.payload.name || "Conversation";
  meta.textContent = createdAt ? `Started ${createdAt}` : "Conversation loaded.";
};
var updateChatInputState2 = (active2) => {
  const input = document.getElementById("agent-chat-text");
  const send = document.getElementById("agent-chat-send");
  if (input) {
    input.disabled = !active2;
  }
  if (send) {
    send.disabled = !active2;
  }
};
var renderConversationList = (items, currentConversationId, onSelect) => {
  const list = document.getElementById("agent-conversation-list");
  if (!list) {
    return;
  }
  if (!items.length) {
    list.innerHTML = `<p class="app-muted">No conversations yet.</p>`;
    return;
  }
  list.innerHTML = items.map((item) => {
    const active2 = currentConversationId === item.id ? "is-active" : "";
    const meta = item.createdAt ? `<div class="app-conversation-meta">${item.createdAt}</div>` : "";
    return `
        <button class="button app-button app-ghost app-conversation-item ${active2}" data-conversation-id="${item.id}">
          <div class="app-conversation-title">${item.name}</div>
          ${meta}
        </button>
      `;
  }).join("");
  list.querySelectorAll("[data-conversation-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-conversation-id");
      if (id) {
        onSelect(id);
      }
    });
  });
};

// web/src/features/agents/layout.ts
var renderAgentLayout = (agentDoc, systemPrompt, adminPrompt) => `
  <div class="mb-4">
    <h1 class="title is-4">${agentDoc.payload.name}</h1>
    <p class="app-muted">Agent \xB7 ${agentDoc.store}/${agentDoc.path}</p>
  </div>
  <div class="columns is-variable is-4">
    <div class="column is-one-third">
      <div class="app-panel">
        <div class="mb-3">
          <h2 class="title is-6">Settings</h2>
          <p class="app-muted">Provider, model, and prompts.</p>
        </div>
        <div class="field">
          <label class="label">Name</label>
          <div class="control">
            <input id="agent-edit-name" class="input" type="text" value="${agentDoc.payload.name}" />
          </div>
        </div>
        <div class="field">
          <label class="label">Provider</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select id="agent-edit-provider"></select>
            </div>
          </div>
          <p id="agent-edit-provider-help" class="help app-muted"></p>
        </div>
        <div class="field">
          <label class="label">Model</label>
          <div class="control">
            <input
              id="agent-edit-model-search"
              class="input"
              type="search"
              placeholder="Search models"
              autocomplete="off"
            />
          </div>
          <div class="control mt-2">
            <div class="select is-fullwidth">
              <select id="agent-edit-model"></select>
            </div>
          </div>
        </div>
        <div class="field">
          <label class="label">System prompt</label>
          <div class="control">
            <textarea id="agent-edit-system" class="textarea" rows="3">${systemPrompt}</textarea>
          </div>
        </div>
        <div class="field">
          <label class="label">Admin prompt</label>
          <div class="control">
            <textarea id="agent-edit-admin" class="textarea" rows="3">${adminPrompt}</textarea>
          </div>
        </div>
        <div class="buttons">
          <button id="agent-save" class="button app-button app-primary">Save</button>
        </div>
      </div>
      <div class="app-panel mt-4">
        <div class="app-panel-header">
          <div>
            <h2 class="title is-6 mb-1">Conversations</h2>
            <p class="app-muted">Reuse context or start fresh.</p>
          </div>
          <button id="agent-new-conversation" class="button app-button app-ghost">New</button>
        </div>
        <div id="agent-conversation-list" class="app-conversation-list"></div>
      </div>
    </div>
    <div class="column">
      <div class="app-panel app-chat">
        <div class="app-chat-header">
          <div>
            <div id="agent-chat-title" class="app-chat-title">No conversation selected</div>
            <div id="agent-chat-meta" class="app-chat-meta app-muted">Your next message starts a new conversation.</div>
          </div>
        </div>
        <div id="agent-chat-messages" class="app-chat-messages"></div>
        <div class="app-chat-input">
          <form id="agent-chat-form">
            <div class="field">
              <div class="control">
                <textarea id="agent-chat-text" class="textarea" rows="2" placeholder="Write a message" disabled></textarea>
              </div>
            </div>
            <div class="buttons">
              <button id="agent-chat-send" class="button app-button app-primary" disabled>Send</button>
            </div>
          </form>
          <p id="agent-chat-status" class="help"></p>
        </div>
      </div>
    </div>
  </div>
`;

// web/src/features/agents/utils.ts
var getAgentField = (data, key) => typeof data[key] === "string" ? data[key] : "";

// web/src/features/agents/view.ts
var refreshAgentEditControls = () => {
  if (!state.currentAgent) {
    return;
  }
  const providerSelect = document.getElementById("agent-edit-provider");
  const modelSelect = document.getElementById("agent-edit-model");
  const modelSearch = document.getElementById("agent-edit-model-search");
  const providerHelp = document.getElementById("agent-edit-provider-help");
  if (!providerSelect || !modelSelect) {
    return;
  }
  const data = isRecord(state.currentAgent.payload.data) ? state.currentAgent.payload.data : {};
  setupProviderModelControls(
    providerSelect,
    modelSelect,
    modelSearch,
    providerHelp,
    state.integrations,
    state.integrationSettings,
    getAgentField(data, "provider"),
    getAgentField(data, "model"),
    true
  );
};
var renderAgentView = async ({ auth, agentDoc, reloadAgents }) => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }
  clearAgentState();
  state.currentAgent = agentDoc;
  state.currentConversation = null;
  const data = isRecord(agentDoc.payload.data) ? agentDoc.payload.data : {};
  content.innerHTML = renderAgentLayout(
    agentDoc,
    getAgentField(data, "systemPrompt"),
    getAgentField(data, "adminPrompt")
  );
  const providerSelect = document.getElementById("agent-edit-provider");
  const modelSelect = document.getElementById("agent-edit-model");
  const modelSearch = document.getElementById("agent-edit-model-search");
  const providerHelp = document.getElementById("agent-edit-provider-help");
  const saveButton = document.getElementById("agent-save");
  const chatMeta = document.getElementById("agent-chat-meta");
  const chatForm = document.getElementById("agent-chat-form");
  const chatInput = document.getElementById("agent-chat-text");
  const chatStatus = document.getElementById("agent-chat-status");
  if (providerSelect && modelSelect) {
    setupProviderModelControls(
      providerSelect,
      modelSelect,
      modelSearch,
      providerHelp,
      state.integrations,
      state.integrationSettings,
      getAgentField(data, "provider"),
      getAgentField(data, "model"),
      true
    );
    const syncSaveState = () => {
      if (saveButton) {
        saveButton.disabled = providerSelect.disabled || modelSelect.disabled;
      }
    };
    syncSaveState();
    providerSelect.addEventListener("change", syncSaveState);
    modelSelect.addEventListener("change", syncSaveState);
  }
  const setStatus2 = (message) => {
    if (chatStatus) {
      chatStatus.textContent = message;
    }
  };
  const processingStatus = createProcessingStatus(setStatus2);
  let conversations = [];
  let disposeRealtime = null;
  let disposeRealtimeStatus = null;
  const stopRealtimeBindings = () => {
    disposeRealtime?.();
    disposeRealtimeStatus?.();
    disposeRealtime = null;
    disposeRealtimeStatus = null;
  };
  const renderConversations = () => {
    renderConversationList(conversations, state.currentConversation?.id ?? null, (id) => {
      void loadConversation(id);
    });
  };
  const handleRealtimeEvent = (event) => {
    if (event.type !== "agent.conversation.updated") {
      return;
    }
    const payloadData = isRecord(event.conversation.payload.data) ? event.conversation.payload.data : {};
    const eventAgentId = typeof payloadData.agentId === "string" ? payloadData.agentId : "";
    const agentUid = typeof agentDoc.payload.id === "string" ? agentDoc.payload.id : "";
    if (!eventAgentId || eventAgentId !== agentUid) {
      return;
    }
    if (state.currentConversation && state.currentConversation.id === event.conversation.id) {
      syncConversation(event.conversation);
    }
    void refreshConversations();
  };
  const handleRealtimeStatus = (status2) => {
    if (status2 === "open" && state.currentConversation) {
      void refreshConversations();
      void loadConversation(state.currentConversation.id);
    }
  };
  const syncRealtimeBindings = () => {
    if (!state.currentConversation) {
      stopRealtimeBindings();
      return;
    }
    if (disposeRealtime === null) {
      disposeRealtime = subscribeRealtime(handleRealtimeEvent);
    }
    if (disposeRealtimeStatus === null) {
      disposeRealtimeStatus = subscribeRealtimeStatus(handleRealtimeStatus);
    }
  };
  const syncConversation = (conversation) => {
    state.currentConversation = conversation;
    updateConversationHeader2(conversation);
    renderMessages2(conversation);
    renderConversations();
    const pending = conversationHasPendingResponse(conversation);
    const progress = getConversationProgress(conversation);
    updateChatInputState2(!!auth && !!state.currentAgent && !pending);
    if (!conversation && chatMeta) {
      chatMeta.textContent = "Your next message starts a new conversation.";
    }
    if (pending) {
      processingStatus.start(progress?.status ?? "");
      syncRealtimeBindings();
      return;
    }
    processingStatus.stop();
    syncRealtimeBindings();
  };
  const refreshConversations = async () => {
    if (!auth) {
      return;
    }
    try {
      const response = await fetchAgentConversations(auth, agentDoc.id);
      conversations = Array.isArray(response.conversations) ? response.conversations : [];
      renderConversations();
    } catch (err) {
      pushNotice("error", err.message);
    }
  };
  const loadConversation = async (conversationId) => {
    if (!auth) {
      return;
    }
    try {
      const conversation = await fetchAgentConversation(auth, conversationId);
      syncConversation(conversation);
    } catch (err) {
      pushNotice("error", err.message);
    }
  };
  const ensureConversation = async () => {
    if (!auth || !state.currentAgent) {
      return null;
    }
    if (state.currentConversation) {
      return state.currentConversation;
    }
    const created = await createAgentConversation(auth, state.currentAgent.id);
    syncConversation(created);
    await refreshConversations();
    return created;
  };
  const appendLocalMessage = (role, content2) => {
    if (!state.currentConversation) {
      return;
    }
    appendConversationMessage(state.currentConversation, role, content2);
    syncConversation(state.currentConversation);
  };
  document.getElementById("agent-save")?.addEventListener("click", async () => {
    if (!auth || !state.currentAgent) {
      return;
    }
    const nameValue = document.getElementById("agent-edit-name")?.value.trim() || "";
    const providerValue = providerSelect?.value.trim() || "";
    const modelValue = modelSelect?.value.trim() || "";
    const systemValue = document.getElementById("agent-edit-system")?.value.trim() || "";
    const adminValue = document.getElementById("agent-edit-admin")?.value.trim() || "";
    if (!nameValue || !providerValue || !modelValue || !systemValue || !adminValue) {
      pushNotice("error", "All agent fields are required.");
      return;
    }
    if (providerSelect?.disabled || modelSelect?.disabled) {
      pushNotice("error", "Enable an integration and sync models first.");
      return;
    }
    try {
      const updated = await updateAgent(auth, state.currentAgent.id, {
        name: nameValue,
        provider: providerValue,
        model: modelValue,
        systemPrompt: systemValue,
        adminPrompt: adminValue
      });
      state.currentAgent = updated;
      await reloadAgents();
      await renderAgentView({ auth, agentDoc: updated, reloadAgents });
    } catch {
    }
  });
  document.getElementById("agent-new-conversation")?.addEventListener("click", async () => {
    if (!auth || !state.currentAgent) {
      return;
    }
    try {
      const created = await createAgentConversation(auth, state.currentAgent.id);
      syncConversation(created);
      await refreshConversations();
    } catch (err) {
      pushNotice("error", err.message);
    }
  });
  chatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth || conversationHasPendingResponse(state.currentConversation)) {
      return;
    }
    const content2 = chatInput?.value.trim() || "";
    if (!content2) {
      return;
    }
    const conversation = await ensureConversation().catch((err) => {
      pushNotice("error", err.message);
      return null;
    });
    if (!conversation) {
      return;
    }
    if (chatInput) {
      chatInput.value = "";
    }
    appendLocalMessage("user", content2);
    try {
      const updated = await appendAgentMessage(auth, conversation.id, content2);
      syncConversation(updated);
      await refreshConversations();
    } catch (err) {
      if (state.currentConversation) {
        markConversationPending(state.currentConversation, false);
        appendLocalMessage(
          "assistant",
          `Something went wrong while I was replying: ${err.message || "Please try again."}`
        );
      }
    }
  });
  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm?.requestSubmit();
    }
  });
  registerAgentChatCleanup(() => {
    stopRealtimeBindings();
    processingStatus.stop();
  });
  syncConversation(null);
  await refreshConversations();
};

// web/src/features/agents/controller.ts
var loadAgent = async (id, reloadAgents) => {
  if (!state.auth) {
    return;
  }
  clearRegisteredIntegrationCleanup();
  try {
    const agent = await fetchAgent(state.auth, id);
    state.currentDocument = null;
    await renderAgentView({ auth: state.auth, agentDoc: agent, reloadAgents });
  } catch (err) {
    pushNotice("error", err.message);
  }
};

// web/src/app/bootstrap.ts
var exportAll = async () => {
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
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  } catch (err) {
    alert(err.message);
  }
};
var openWebsiteBuilder = async () => {
  const builderPage = state.navigationPages.find(
    (page) => page.store === "private" && page.path === "website-build.json" && page.documentId
  );
  if (!builderPage?.documentId) {
    pushNotice("error", "Website Builder page not found.");
    return;
  }
  await loadDocument(builderPage.documentId);
};
var renderApp = async () => {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing app container");
  }
  if (!state.auth) {
    renderLogin({
      container: app,
      onAuth: (next) => {
        state.auth = next;
      },
      onSuccess: renderApp,
      onClearAgentState: clearAgentState
    });
    return;
  }
  await loadUiConfig();
  await loadLayoutConfig();
  await loadModules();
  renderAppShell({ moduleChecklistHtml: (selected) => moduleChecklistHtml(state.modules, selected) });
  initNotifications();
  startRealtime(() => state.auth);
  const reloadAgents = () => loadAgents((id) => loadAgent(id, reloadAgents));
  const createModal = initCreateModal({
    getAuth: () => state.auth,
    onCreated: loadDocument,
    refreshNavigation: () => refreshNavigation(loadDocument)
  });
  const agentModalControls = initAgentModal({
    getAuth: () => state.auth,
    reloadAgents,
    onAgentCreated: (id) => loadAgent(id, reloadAgents)
  });
  const refreshIntegrationControls = () => {
    refreshAgentEditControls();
    agentModalControls.refreshControls();
  };
  const integrationModal = initIntegrationModal({
    getAuth: () => state.auth,
    reloadIntegrations: () => loadIntegrations({
      onAfterLoad: refreshIntegrationControls
    }),
    onAfterSave: () => showIntegrationsView(refreshIntegrationControls)
  });
  state.openIntegrationModalHandler = integrationModal.openIntegrationModal;
  initShellEvents({
    onLogout: () => {
      stopRealtime();
      state.auth = null;
      saveAuth(null);
      renderLogin({
        container: app,
        onAuth: (next) => {
          state.auth = next;
        },
        onSuccess: renderApp,
        onClearAgentState: clearAgentState
      });
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
    onOpenAgentModal: agentModalControls.openAgentModal
  });
  await loadIntegrations({
    onAfterLoad: refreshIntegrationControls
  });
  await reloadAgents();
  await refreshNavigation(loadDocument);
};
var bootstrap = () => {
  initTheme();
  renderApp().catch(() => {
    stopRealtime();
    const app = document.getElementById("app");
    if (!app) {
      return;
    }
    renderLogin({
      container: app,
      onAuth: (next) => {
        state.auth = next;
      },
      onSuccess: renderApp,
      onClearAgentState: clearAgentState
    });
  });
};

// web/src/main.ts
bootstrap();
//# sourceMappingURL=app.js.map
