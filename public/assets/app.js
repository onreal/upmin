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

// web/src/app/translations.ts
var currentTranslations, currentLanguage, normalizeLanguage, candidateLanguages, setAdminTranslationConfig, getAdminLanguage, setAdminLanguage, lookupTranslation, translatedValue, interpolate, adminText, adminConfiguredText;
var init_translations = __esm({
  "web/src/app/translations.ts"() {
    "use strict";
    currentTranslations = {};
    currentLanguage = null;
    normalizeLanguage = (value) => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim().toLowerCase();
      return trimmed || null;
    };
    candidateLanguages = () => {
      const documentLanguage = typeof document !== "undefined" ? normalizeLanguage(document.documentElement.lang) : null;
      const active2 = currentLanguage ?? documentLanguage;
      const primary = active2?.split("-")[0] ?? null;
      return [active2, primary, "en"].filter((value, index, items) => !!value && items.indexOf(value) === index);
    };
    setAdminTranslationConfig = (layoutConfig) => {
      currentTranslations = layoutConfig?.translations ?? {};
    };
    getAdminLanguage = () => currentLanguage;
    setAdminLanguage = (language) => {
      const normalized = normalizeLanguage(language);
      const changed = normalized !== currentLanguage;
      currentLanguage = normalized;
      if (typeof document !== "undefined") {
        document.documentElement.lang = normalized ?? "en";
      }
      return changed;
    };
    lookupTranslation = (key) => {
      for (const language of candidateLanguages()) {
        const table = currentTranslations[language];
        if (!table) {
          continue;
        }
        const value = table[key];
        if (typeof value === "string" && value.trim() !== "") {
          return value;
        }
      }
      return null;
    };
    translatedValue = (key) => lookupTranslation(key);
    interpolate = (template, variables) => {
      if (!variables) {
        return template;
      }
      return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_, key) => {
        const value = variables[key];
        return value == null ? "" : String(value);
      });
    };
    adminText = (key, fallback, variables) => interpolate(lookupTranslation(key) ?? fallback, variables);
    adminConfiguredText = (configured, key, fallback, variables) => {
      const translated = translatedValue(key);
      if (translated) {
        return interpolate(translated, variables);
      }
      if (typeof configured === "string" && configured.trim() !== "") {
        return interpolate(configured, variables);
      }
      return interpolate(fallback, variables);
    };
  }
});

// web/src/api/client.ts
var STORAGE_KEY, notify, notifySessionExpired, notifyUpdateLocked, successMessageFor, handleUnauthorized, handleLocked, loadAuth, saveAuth, buildHeaders, request, requestBlob, requestAsset, requestForm;
var init_client = __esm({
  "web/src/api/client.ts"() {
    "use strict";
    init_translations();
    STORAGE_KEY = "manage_auth";
    notify = (payload) => {
      if (typeof window === "undefined") {
        return;
      }
      window.dispatchEvent(new CustomEvent("app:notice", { detail: payload }));
    };
    notifySessionExpired = (payload) => {
      if (typeof window === "undefined") {
        return;
      }
      window.dispatchEvent(new CustomEvent("app:session-expired", { detail: payload }));
    };
    notifyUpdateLocked = (payload) => {
      if (typeof window === "undefined") {
        return;
      }
      window.dispatchEvent(new CustomEvent("app:system-update-locked", { detail: payload }));
    };
    successMessageFor = (method) => {
      if (method === "GET")
        return adminText("api.success.get", "Loaded.");
      if (method === "POST")
        return adminText("api.success.post", "Created.");
      if (method === "PUT")
        return adminText("api.success.put", "Saved.");
      if (method === "DELETE")
        return adminText("api.success.delete", "Deleted.");
      return adminText("api.success.default", "Done.");
    };
    handleUnauthorized = (response, auth, message) => {
      if (!auth || response.status !== 401) {
        return;
      }
      saveAuth(null);
      notifySessionExpired({ message, status: response.status });
    };
    handleLocked = (response, message) => {
      if (response.status !== 423) {
        return;
      }
      notifyUpdateLocked({ message, status: response.status });
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
        const message = error.message || error.error || response.statusText || adminText("api.error.requestFailed", "Request failed");
        handleUnauthorized(response, auth, message);
        handleLocked(response, message);
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
        const message = error.message || error.error || response.statusText || adminText("api.error.requestFailed", "Request failed");
        handleUnauthorized(response, auth, message);
        handleLocked(response, message);
        notify({ type: "error", message });
        throw new Error(message);
      }
      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/zip") && !contentType.includes("application/json") && !contentType.includes("application/gzip") && !contentType.includes("application/x-gzip") && !contentType.includes("application/octet-stream")) {
        throw new Error(adminText("api.error.unexpectedDownload", "Unexpected download response."));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = match ? match[1] : void 0;
      notify({ type: "success", message: adminText("api.success.downloadReady", "Download ready.") });
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
        const message = error.message || error.error || response.statusText || adminText("api.error.requestFailed", "Request failed");
        handleUnauthorized(response, auth, message);
        handleLocked(response, message);
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
        notify({ type: "success", message: adminText("api.success.downloadReady", "Download ready.") });
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
        const message = error.message || error.error || response.statusText || adminText("api.error.requestFailed", "Request failed");
        handleUnauthorized(response, auth, message);
        handleLocked(response, message);
        notify({ type: "error", message });
        throw new Error(message);
      }
      const data = await response.json();
      notify({ type: "success", message: adminText("api.success.uploaded", "Uploaded successfully.") });
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

// web/src/api/system-update.ts
var fetchSystemUpdate, runSystemUpdate;
var init_system_update = __esm({
  "web/src/api/system-update.ts"() {
    "use strict";
    init_client();
    fetchSystemUpdate = (auth) => request("/api/system/update", { method: "GET" }, auth, { notify: false });
    runSystemUpdate = (auth) => request("/api/system/update/run", { method: "POST" }, auth, { notify: false });
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
  fetchSystemUpdate: () => fetchSystemUpdate,
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
  runSystemUpdate: () => runSystemUpdate,
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
    init_system_update();
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
  openConfirmModalHandler: null,
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
  onSelectAgentMenu: null,
  systemUpdate: null
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
init_translations();
var getUserLabel = () => {
  if (isTokenAuth(state.auth) && state.auth.user) {
    const name = `${state.auth.user.firstname} ${state.auth.user.lastname}`.trim();
    return name || state.auth.user.email;
  }
  if (state.auth?.type === "apiKey") {
    return adminText("layout.user.apiKey", "API Key");
  }
  return adminText("layout.user.guest", "Guest");
};
var headerCopy = () => ({
  title: typeof state.layoutConfig.header?.title === "string" && state.layoutConfig.header.title.trim() !== "" ? state.layoutConfig.header.title : adminText("layout.header.title", "Manage"),
  subtitle: typeof state.layoutConfig.header?.subtitle === "string" && state.layoutConfig.header.subtitle.trim() !== "" ? state.layoutConfig.header.subtitle : adminText("layout.header.subtitle", "Stateless Admin"),
  settingsLabel: adminConfiguredText(state.layoutConfig.header?.settingsLabel, "layout.header.settingsLabel", "Settings"),
  themeLabel: adminConfiguredText(state.layoutConfig.header?.themeLabel, "layout.header.themeLabel", "Theme"),
  createLabel: adminConfiguredText(state.layoutConfig.header?.createLabel, "layout.header.createLabel", "Create +"),
  profileLabel: adminConfiguredText(state.layoutConfig.header?.profileLabel, "layout.header.profileLabel", "Profile"),
  logoutLabel: adminConfiguredText(state.layoutConfig.header?.logoutLabel, "layout.header.logoutLabel", "Logout")
});
var sidebarCopy = () => ({
  publicLabel: adminConfiguredText(state.layoutConfig.sidebar?.publicLabel, "layout.sidebar.publicLabel", "Public"),
  privateLabel: adminConfiguredText(state.layoutConfig.sidebar?.privateLabel, "layout.sidebar.privateLabel", "Private")
});
var profileCopy = () => ({
  title: adminConfiguredText(state.layoutConfig.profile?.title, "layout.profile.title", "Profile"),
  subtitle: adminConfiguredText(state.layoutConfig.profile?.subtitle, "layout.profile.subtitle", "Update your profile info"),
  saveLabel: adminConfiguredText(state.layoutConfig.profile?.saveLabel, "layout.profile.saveLabel", "Save Profile")
});

// web/src/ui/shell.ts
init_translations();
var defaultLandingCards = () => {
  return {
    eyebrow: adminText("shell.landing.eyebrow", "Quick Start"),
    title: adminText("shell.landing.title", "Start here"),
    subtitle: adminText(
      "shell.landing.subtitle",
      "Build the site, connect your AI keys, and manage every snapshot from one place."
    ),
    cards: [
      {
        action: "builder",
        title: adminText("shell.landing.builder.title", "Start building your website now"),
        body: adminText(
          "shell.landing.builder.body",
          "Open the builder to shape pages, sections, and content flows."
        ),
        cta: adminText("shell.landing.builder.cta", "Open Builder"),
        svg: `
          <svg viewBox="0 0 320 180" role="presentation" aria-hidden="true">
            <defs>
              <linearGradient id="builderGlow" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stop-color="#ffd166"></stop>
                <stop offset="100%" stop-color="#f97316"></stop>
              </linearGradient>
            </defs>
            <rect x="14" y="20" width="292" height="140" rx="28" fill="rgba(255,255,255,0.08)"></rect>
            <rect x="36" y="42" width="124" height="96" rx="18" fill="url(#builderGlow)"></rect>
            <rect x="176" y="42" width="108" height="18" rx="9" fill="rgba(255,255,255,0.78)"></rect>
            <rect x="176" y="74" width="88" height="14" rx="7" fill="rgba(255,255,255,0.56)"></rect>
            <rect x="176" y="100" width="64" height="14" rx="7" fill="rgba(255,255,255,0.36)"></rect>
            <path d="M78 88h40M98 68v40" stroke="#fff7ed" stroke-width="10" stroke-linecap="round"></path>
          </svg>
        `
      },
      {
        action: "integrations",
        title: adminText("shell.landing.integrations.title", "Add your AI's API keys"),
        body: adminText(
          "shell.landing.integrations.body",
          "Connect providers, models, and secrets so your agents and tools can work."
        ),
        cta: adminText("shell.landing.integrations.cta", "Open Integrations"),
        svg: `
          <svg viewBox="0 0 320 180" role="presentation" aria-hidden="true">
            <defs>
              <linearGradient id="integrationGlow" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stop-color="#7dd3fc"></stop>
                <stop offset="100%" stop-color="#0ea5e9"></stop>
              </linearGradient>
            </defs>
            <circle cx="82" cy="90" r="44" fill="url(#integrationGlow)"></circle>
            <circle cx="236" cy="64" r="26" fill="rgba(255,255,255,0.78)"></circle>
            <circle cx="236" cy="118" r="26" fill="rgba(255,255,255,0.38)"></circle>
            <path d="M116 90h84M236 64v54" stroke="rgba(255,255,255,0.82)" stroke-width="12" stroke-linecap="round"></path>
            <path d="M65 90l12 12 22-26" stroke="#082f49" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        `
      },
      {
        action: "creations",
        title: adminText("shell.landing.creations.title", "Manage your creations"),
        body: adminText(
          "shell.landing.creations.body",
          "Review snapshots, exports, and backups to track every publish."
        ),
        cta: adminText("shell.landing.creations.cta", "Open Creations"),
        svg: `
          <svg viewBox="0 0 320 180" role="presentation" aria-hidden="true">
            <defs>
              <linearGradient id="creationGlow" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stop-color="#86efac"></stop>
                <stop offset="100%" stop-color="#22c55e"></stop>
              </linearGradient>
            </defs>
            <rect x="32" y="28" width="92" height="124" rx="22" fill="rgba(255,255,255,0.18)"></rect>
            <rect x="114" y="50" width="92" height="102" rx="22" fill="rgba(255,255,255,0.3)"></rect>
            <rect x="196" y="20" width="92" height="132" rx="22" fill="url(#creationGlow)"></rect>
            <path d="M224 56h36M224 82h36M224 108h22" stroke="#052e16" stroke-width="10" stroke-linecap="round"></path>
            <circle cx="248" cy="131" r="12" fill="#052e16"></circle>
          </svg>
        `
      }
    ]
  };
};
var renderAppShell = ({ moduleChecklistHtml: moduleChecklistHtml2 }) => {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing app container");
  }
  const header = headerCopy();
  const sidebar = sidebarCopy();
  const landing = defaultLandingCards();
  const builderLabel = adminText("shell.builder", "Builder");
  const modulesLabel = adminText("modules.title", "Modules");
  const integrationsLabel = adminText("integrations.title", "Integrations");
  const logsLabel = adminText("logs.title", "Logs");
  const formsLabel = adminText("forms.title", "Forms");
  const agentsLabel = adminText("agents.title", "Agents");
  const createAgentLabel = adminText("agents.create", "Create agent");
  const downloadContentLabel = adminText("shell.downloadContent", "Download content");
  const updateLabel = adminText("systemUpdate.action", "Update");
  const closeLabel = adminText("common.close", "Close");
  const cancelLabel = adminText("common.cancel", "Cancel");
  const saveLabel = adminText("common.save", "Save");
  const createLabel = adminText("common.create", "Create");
  const confirmLabel = adminText("confirm.confirm", "Confirm");
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
  const updateIcon = `
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
        <path
          d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
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
    <nav class="navbar app-surface is-spaced" role="navigation" aria-label="${adminText("navigation.main", "main navigation")}">
      <div class="navbar-brand">
        <a class="navbar-item" href="./" aria-label="${adminText("navigation.home", "Go to home")}">
          <span class="title is-5 mb-0">${header.title}</span>
        </a>
        <a
          role="button"
          class="navbar-burger"
          aria-label="${adminText("navigation.open", "Open navigation")}"
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
                <span>${builderLabel}</span>
              </button>
              <div id="nav-header-links" class="app-nav-shortcuts"></div>
              <button
                id="system-update-action"
                class="button app-button app-ghost app-icon-button is-hidden"
                type="button"
                data-shell-action="system-update"
                aria-label="${updateLabel}"
                title="${updateLabel}"
              >
                ${updateIcon}
                <span id="system-update-label">${updateLabel}</span>
              </button>
              <button
                id="export-zip-header"
                class="button app-button app-ghost"
                data-shell-action="export"
                aria-label="${downloadContentLabel}"
                title="${downloadContentLabel}"
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
              <a class="navbar-item" id="modules-link" data-shell-action="modules">${modulesLabel}</a>
              <a class="navbar-item" id="integrations-link" data-shell-action="integrations">${integrationsLabel}</a>
              <a class="navbar-item" id="logs-link" data-shell-action="logs">${logsLabel}</a>
              <a class="navbar-item is-hidden" id="forms-link" data-shell-action="forms">${formsLabel}</a>
              <div id="nav-settings-pages"></div>
              <a class="navbar-item is-hidden" id="system-update-menu-link" data-shell-action="system-update">${adminText("systemUpdate.updateAdmin", "Update admin")}</a>
              <hr class="navbar-divider" />
              <div id="nav-system-pages"></div>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="agents-dropdown">
            <a class="navbar-link">${agentsLabel}</a>
            <div class="navbar-dropdown">
              <div id="nav-agents"></div>
              <hr class="navbar-divider" />
              <a class="navbar-item" id="agents-create-link" data-shell-action="agents-create">${createAgentLabel}</a>
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
        aria-label="${adminText("navigation.close", "Close navigation")}"
        data-mobile-drawer-close
      ></button>
      <div class="app-mobile-drawer-panel app-surface" role="dialog" aria-modal="true" aria-label="${adminText("navigation.title", "Navigation")}">
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
              aria-label="${adminText("navigation.close", "Close navigation")}"
              data-mobile-drawer-close
            ></button>
          </div>
        </div>
        <div class="app-mobile-drawer-body">
          <div class="app-mobile-drawer-top-action">
            <div id="mobile-system-update-panel" class="app-mobile-update-panel is-hidden">
              <div id="mobile-system-update-status-chip" class="app-update-status-chip app-update-status-chip-mobile">
                <span id="mobile-system-update-status-text">${adminText("systemUpdate.versionUnknown", "Version unknown")}</span>
              </div>
              <button
                id="mobile-system-update-button"
                class="button app-button app-ghost"
                type="button"
                data-shell-action="system-update"
              >
                ${updateIcon}
                <span id="mobile-system-update-button-label">${updateLabel}</span>
              </button>
            </div>
            <button class="button app-button app-primary app-mobile-builder-button" type="button" data-shell-action="builder">
              ${builderIcon}
              <span>${builderLabel}</span>
            </button>
            <div id="nav-header-links-mobile" class="app-mobile-action-list"></div>
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
              id="mobile-private-toggle"
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
                <a href="#" id="mobile-system-update-link" class="app-mobile-action-link is-hidden" data-shell-action="system-update">
                  ${adminText("systemUpdate.updateAdmin", "Update admin")}
                </a>
                <a href="#" class="app-mobile-action-link" data-shell-action="modules">${modulesLabel}</a>
                <a href="#" class="app-mobile-action-link" data-shell-action="integrations">${integrationsLabel}</a>
                <a href="#" class="app-mobile-action-link" data-shell-action="logs">${logsLabel}</a>
                <a
                  href="#"
                  id="forms-link-mobile"
                  class="app-mobile-action-link is-hidden"
                  data-shell-action="forms"
                >
                  ${formsLabel}
                </a>
              </div>
              <div id="nav-settings-pages-mobile" class="app-mobile-action-list"></div>
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
              <span>${agentsLabel}</span>
            </button>
            <div id="mobile-agents-panel" class="app-mobile-accordion-panel">
              <div id="nav-agents-mobile" class="app-mobile-action-list"></div>
              <div class="app-mobile-action-list">
                <a href="#" class="app-mobile-action-link" data-shell-action="agents-create">${createAgentLabel}</a>
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
                <span>${downloadContentLabel}</span>
              </button>
            </div>
            <div id="mobile-system-current-version" class="app-mobile-drawer-version app-muted">
              ${adminText("systemUpdate.currentVersion", "Current version: {version}", {
    version: state.systemUpdate?.currentVersion ?? adminText("common.unknown", "unknown")
  })}
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
                <p id="nav-private-label" class="menu-label mt-4">${sidebar.privateLabel}</p>
                <ul id="nav-private" class="menu-list"></ul>
              </aside>
            </div>
          </aside>
          <div class="column">
            <div id="content" class="box app-surface">
              <section class="app-landing-shell">
                <div class="app-landing-header">
                  <p class="app-landing-eyebrow">${landing.eyebrow}</p>
                  <h1 class="title is-3">${landing.title}</h1>
                  <p class="app-muted app-landing-subtitle">${landing.subtitle}</p>
                </div>
                <div class="app-landing-grid">
                  ${landing.cards.map(
    (card) => `
                        <button class="app-landing-card" type="button" data-shell-action="${card.action}">
                          <div class="app-landing-card-art">${card.svg}</div>
                          <div class="app-landing-card-copy">
                            <h2 class="title is-5">${card.title}</h2>
                            <p class="app-muted">${card.body}</p>
                            <span class="app-landing-card-link">${card.cta}</span>
                          </div>
                        </button>
                      `
  ).join("")}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="section pt-0">
      <div class="container">
        <div id="nav-footer-bar" class="app-footer-bar">
          <div id="nav-footer-links" class="app-footer-nav is-hidden"></div>
          <div id="system-footer-version" class="app-footer-version app-muted">
            <span id="system-footer-version-label">${adminText("systemUpdate.versionShort", "Version")}</span>
            <span id="system-footer-version-dot" class="app-footer-version-dot" aria-hidden="true"></span>
            <span id="system-footer-version-value">${state.systemUpdate?.currentVersion ?? adminText("common.unknown", "unknown")}</span>
          </div>
        </div>
      </div>
    </section>
    <div id="app-notifications" class="app-notifications"></div>
    <div class="modal" id="create-modal">
      <div class="modal-background" data-close="create"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">${adminText("createDocument.title", "Create document")}</p>
          <button class="delete" aria-label="${closeLabel}" data-close="create"></button>
        </header>
        <section class="modal-card-body">
          <div id="create-error" class="notification is-danger is-light is-hidden"></div>
          <form id="create-form">
            <div class="columns is-variable is-4 is-multiline">
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("createDocument.filename", "Filename")}</label>
                  <div class="control">
                    <input
                      id="create-path"
                      class="input"
                      type="text"
                      placeholder="${adminText("createDocument.filenamePlaceholder", "content.json")}"
                      autocomplete="off"
                    />
                  </div>
                  <p class="help">${adminText("createDocument.filenameHelp", "Must end with .json")}</p>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("documents.order", "Order")}</label>
                  <div class="control">
                    <input
                      id="create-order"
                      class="input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="${adminText("documents.orderPlaceholder", "0")}"
                    />
                  </div>
                  <p class="help">${adminText("createDocument.orderHelp", "Lower numbers appear first.")}</p>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("documents.store", "Store")}</label>
                  <div class="control">
                    <div class="tabs is-toggle is-small is-fullwidth">
                      <ul>
                        <li class="is-active">
                          <a href="#" data-store="public">${adminText("documents.storePublic", "Public")}</a>
                        </li>
                        <li>
                          <a href="#" data-store="private">${adminText("documents.storePrivate", "Private")}</a>
                        </li>
                      </ul>
                    </div>
                    <input id="create-store" type="hidden" value="public" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("documents.page", "Page")}</label>
                  <div class="control">
                    <input id="create-page" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("documents.name", "Name")}</label>
                  <div class="control">
                    <input id="create-name" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("documents.language", "Language")}</label>
                  <div class="control">
                    <input id="create-language" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("documents.modules", "Modules")}</label>
                  <div class="control">
                    <div id="create-modules" class="app-module-picker">
                      ${moduleChecklistHtml2()}
                    </div>
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("documents.section", "Section")}</label>
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
                  <label class="label">${adminText("documents.dataJson", "Data (JSON)")}</label>
                  <div class="control">
                    <textarea id="create-data" class="textarea" rows="6">{}</textarea>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
        <footer class="modal-card-foot">
          <button form="create-form" type="submit" class="button app-button app-primary">${createLabel}</button>
          <button id="create-cancel" type="button" class="button app-button app-ghost">${cancelLabel}</button>
        </footer>
      </div>
    </div>
    <div class="modal" id="agent-modal">
      <div class="modal-background" data-close="agent"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">${createAgentLabel}</p>
          <button class="delete" aria-label="${closeLabel}" data-close="agent"></button>
        </header>
        <section class="modal-card-body">
          <div id="agent-error" class="notification is-danger is-light is-hidden"></div>
          <form id="agent-form">
            <div class="tabs is-toggle is-fullwidth mb-4">
              <ul>
                <li class="is-active"><a data-agent-store="public">${adminText("documents.storePublic", "Public")}</a></li>
                <li><a data-agent-store="private">${adminText("documents.storePrivate", "Private")}</a></li>
              </ul>
            </div>
            <input type="hidden" id="agent-store" value="public" />
            <div class="columns is-variable is-4 is-multiline">
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("documents.name", "Name")}</label>
                  <div class="control">
                    <input id="agent-name" class="input" type="text" placeholder="${adminText("agents.namePlaceholder", "Assistant")}" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">${adminText("agents.provider", "Provider")}</label>
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
                  <label class="label">${adminText("agents.model", "Model")}</label>
                  <div class="control">
                    <input
                      id="agent-model-search"
                      class="input"
                      type="search"
                      placeholder="${adminText("agents.searchModels", "Search models")}"
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
                  <label class="label">${adminText("agents.systemPrompt", "System prompt")}</label>
                  <div class="control">
                    <textarea id="agent-system" class="textarea" rows="3" placeholder="${adminText("agents.systemPrompt", "System prompt")}"></textarea>
                  </div>
                </div>
              </div>
              <div class="column is-full">
                <div class="field">
                  <label class="label">${adminText("agents.adminPrompt", "Admin prompt")}</label>
                  <div class="control">
                    <textarea id="agent-admin" class="textarea" rows="3" placeholder="${adminText("agents.adminPrompt", "Admin prompt")}"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
        <footer class="modal-card-foot">
          <button id="agent-cancel" class="button app-button app-ghost">${cancelLabel}</button>
          <button
            id="agent-submit"
            form="agent-form"
            type="submit"
            class="button app-button app-primary"
          >
            ${createAgentLabel}
          </button>
        </footer>
      </div>
    </div>
    <div class="modal" id="integration-modal">
      <div class="modal-background" data-close="integration"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title" id="integration-modal-title">${adminText("integrations.configure", "Configure integration")}</p>
          <button class="delete" aria-label="${closeLabel}" data-close="integration"></button>
        </header>
        <section class="modal-card-body">
          <div id="integration-error" class="notification is-danger is-light is-hidden"></div>
          <form id="integration-form">
            <div id="integration-fields" class="app-stack app-gap-md"></div>
          </form>
        </section>
        <footer class="modal-card-foot">
          <button id="integration-cancel" class="button app-button app-ghost">${cancelLabel}</button>
          <button form="integration-form" type="submit" class="button app-button app-primary">${saveLabel}</button>
        </footer>
      </div>
    </div>
    <div class="modal" id="confirm-modal">
      <div class="modal-background" data-close="confirm"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title" id="confirm-modal-title">${adminText("confirm.title", "Confirm action")}</p>
          <button class="delete" aria-label="${closeLabel}" data-close="confirm"></button>
        </header>
        <section class="modal-card-body">
          <p id="confirm-modal-message" class="app-muted"></p>
        </section>
        <footer class="modal-card-foot">
          <button id="confirm-cancel" type="button" class="button app-button app-ghost">${cancelLabel}</button>
          <button id="confirm-submit" type="button" class="button app-button app-primary">${confirmLabel}</button>
        </footer>
      </div>
    </div>
    <div id="system-update-lock" class="app-update-lock" hidden>
      <div class="app-update-lock-card app-surface">
        <p class="app-update-lock-eyebrow">${adminText("systemUpdate.title", "System Update")}</p>
        <h2 id="system-update-lock-title" class="title is-5">${adminText("systemUpdate.inProgress", "Admin update in progress")}</h2>
        <p id="system-update-lock-message" class="app-muted">${adminText("systemUpdate.wait", "Please wait while the admin files are replaced.")}</p>
        <div class="app-update-lock-meta">
          <span id="system-update-current-version">${adminText("systemUpdate.currentVersion", "Current version: {version}", {
    version: state.systemUpdate?.currentVersion ?? adminText("common.unknown", "unknown")
  })}</span>
          <span id="system-update-latest-version">${adminText("systemUpdate.latestVersion", "Latest version: {version}", {
    version: state.systemUpdate?.latestVersion ?? adminText("common.unknown", "unknown")
  })}</span>
        </div>
      </div>
    </div>
  `;
};
var renderSystemUpdateControls = () => {
  const mobilePanel = document.getElementById("mobile-system-update-panel");
  const mobileStatusChip = document.getElementById("mobile-system-update-status-chip");
  const mobileStatusText = document.getElementById("mobile-system-update-status-text");
  const mobileButton = document.getElementById("mobile-system-update-button");
  const mobileButtonLabel = document.getElementById("mobile-system-update-button-label");
  const mobileCurrentVersion = document.getElementById("mobile-system-current-version");
  const footerVersionLabel = document.getElementById("system-footer-version-label");
  const footerVersionDot = document.getElementById("system-footer-version-dot");
  const footerVersionValue = document.getElementById("system-footer-version-value");
  const button = document.getElementById("system-update-action");
  const buttonLabel = document.getElementById("system-update-label");
  const menuLink = document.getElementById("system-update-menu-link");
  const mobileLink = document.getElementById("mobile-system-update-link");
  const lock = document.getElementById("system-update-lock");
  const lockTitle = document.getElementById("system-update-lock-title");
  const lockMessage = document.getElementById("system-update-lock-message");
  const currentVersion = document.getElementById("system-update-current-version");
  const latestVersion = document.getElementById("system-update-latest-version");
  const status2 = state.systemUpdate;
  if (!mobilePanel || !mobileStatusChip || !mobileStatusText || !mobileButton || !mobileButtonLabel || !mobileCurrentVersion || !footerVersionLabel || !footerVersionDot || !footerVersionValue || !button || !buttonLabel || !menuLink || !mobileLink || !lock || !lockTitle || !lockMessage || !currentVersion || !latestVersion) {
    return;
  }
  const showAction = Boolean(status2?.updateAvailable) || Boolean(status2?.locked);
  button.classList.toggle("is-hidden", !showAction);
  menuLink.classList.toggle("is-hidden", !showAction);
  mobileLink.classList.toggle("is-hidden", !showAction);
  mobilePanel.classList.toggle("is-hidden", !showAction);
  const isRunning = Boolean(status2?.locked);
  const isReady = Boolean(status2?.updateAvailable);
  button.toggleAttribute("disabled", isRunning || !isReady);
  mobileButton.toggleAttribute("disabled", isRunning || !isReady);
  buttonLabel.textContent = isRunning ? adminText("systemUpdate.updating", "Updating...") : adminText("systemUpdate.action", "Update");
  mobileButtonLabel.textContent = buttonLabel.textContent;
  menuLink.textContent = isRunning ? adminText("systemUpdate.inProgress", "Admin update in progress") : isReady ? adminText("systemUpdate.updateAdminTo", "Update admin to {version}", {
    version: status2?.latestVersion ?? adminText("common.latest", "latest")
  }) : adminText("systemUpdate.updateAdmin", "Update admin");
  mobileLink.textContent = menuLink.textContent;
  button.setAttribute("aria-label", isRunning ? buttonLabel.textContent : menuLink.textContent || buttonLabel.textContent);
  button.setAttribute("title", isRunning ? buttonLabel.textContent : menuLink.textContent || buttonLabel.textContent);
  footerVersionLabel.textContent = adminText("systemUpdate.versionShort", "Version");
  mobileCurrentVersion.textContent = adminText("systemUpdate.currentVersion", "Current version: {version}", {
    version: status2?.currentVersion ?? adminText("common.unknown", "unknown")
  });
  footerVersionValue.textContent = status2?.currentVersion ?? adminText("common.unknown", "unknown");
  footerVersionDot.classList.toggle("is-ready", isReady || isRunning);
  mobileStatusChip.classList.toggle("is-hidden", !showAction);
  mobileStatusChip.classList.toggle("is-error", Boolean(status2?.error) && !isRunning);
  mobileStatusChip.classList.toggle("is-ready", isReady && !isRunning);
  if (isRunning) {
    mobileStatusText.textContent = status2?.message || adminText("systemUpdate.updatingAdmin", "Updating admin...");
  } else if (status2?.error) {
    mobileStatusText.textContent = adminText("systemUpdate.checkFailed", "Update check failed. Current {version}.", {
      version: status2?.currentVersion ?? adminText("common.unknown", "unknown")
    });
  } else if (isReady) {
    mobileStatusText.textContent = adminText("systemUpdate.available", "Update available: {current} -> {latest}", {
      current: status2?.currentVersion ?? adminText("common.unknown", "unknown"),
      latest: status2?.latestVersion ?? adminText("common.unknown", "unknown")
    });
  } else if (status2?.currentVersion) {
    mobileStatusText.textContent = adminText("systemUpdate.adminVersion", "Admin {version}", {
      version: status2.currentVersion
    });
  } else {
    mobileStatusText.textContent = adminText("systemUpdate.versionUnknown", "Version unknown");
  }
  lock.hidden = !isRunning;
  lockTitle.textContent = adminText("systemUpdate.inProgress", "Admin update in progress");
  lockMessage.textContent = status2?.message || adminText("systemUpdate.wait", "Please wait while the admin files are replaced.");
  currentVersion.textContent = adminText("systemUpdate.currentVersion", "Current version: {version}", {
    version: status2?.currentVersion ?? adminText("common.unknown", "unknown")
  });
  latestVersion.textContent = adminText("systemUpdate.latestVersion", "Latest version: {version}", {
    version: status2?.latestVersion ?? adminText("common.unknown", "unknown")
  });
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
init_translations();
var renderLogin = (context, error) => {
  const { container, onAuth, onSuccess, onClearAgentState } = context;
  onClearAgentState();
  container.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="box app-surface">
          <div class="mb-4">
            <h1 class="title is-4">${adminText("auth.loginTitle", "Admin Login")}</h1>
            <p class="app-muted">${adminText("auth.loginSubtitle", "Sign in with email and password.")}</p>
          </div>
          ${error ? `<div class="notification is-danger is-light">${error}</div>` : ""}
          <form id="user-form">
            <div class="field">
              <label class="label">${adminText("auth.email", "Email")}</label>
              <div class="control">
                <input class="input" type="email" name="email" required />
              </div>
            </div>
            <div class="field">
              <label class="label">${adminText("auth.password", "Password")}</label>
              <div class="control">
                <input class="input" type="password" name="password" required />
              </div>
            </div>
            <button type="submit" class="button app-button app-primary">${adminText("auth.login", "Sign in")}</button>
          </form>
        </div>
      </div>
    </section>
  `;
  const userForm = document.getElementById("user-form");
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
init_translations();

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
    content.innerHTML = `<p class="app-muted">${adminText("profile.noApiKeyProfile", "No profile is available for API key authentication.")}</p>`;
    return;
  }
  const currentUser = auth.user;
  if (!state.authDocumentId) {
    content.innerHTML = `<p class="app-muted">${adminText("profile.authMissing", "auth.json was not found.")}</p>`;
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
    content.innerHTML = `<p class="app-muted">${adminText("profile.authNoUsers", "auth.json does not contain users.")}</p>`;
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
    content.innerHTML = `<p class="app-muted">${adminText("profile.userMissing", "The user was not found in auth.json.")}</p>`;
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
          <label class="label">${adminText("profile.firstName", "First Name")}</label>
          <div class="control">
            <input id="profile-firstname" class="input" type="text" value="${current.firstname || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("profile.lastName", "Last Name")}</label>
          <div class="control">
            <input id="profile-lastname" class="input" type="text" value="${current.lastname || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("auth.email", "Email")}</label>
          <div class="control">
            <input id="profile-email" class="input" type="email" value="${current.email || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("auth.password", "Password")}</label>
          <div class="control">
            <input id="profile-password" class="input" type="password" placeholder="${adminText("profile.passwordPlaceholder", "Leave blank to keep")}" />
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
  onShowCreations,
  onShowLogs,
  onShowForms,
  onExportAll,
  onOpenBuilder,
  onOpenCreate,
  onOpenAgentModal,
  onRunSystemUpdate
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
  bindAction("creations", onShowCreations);
  bindAction("logs", onShowLogs);
  bindAction("forms", onShowForms);
  bindAction("export", onExportAll);
  bindAction("builder", onOpenBuilder);
  bindAction("create", onOpenCreate);
  bindAction("agents-create", onOpenAgentModal);
  bindAction("system-update", onRunSystemUpdate);
  bindAction("theme", () => {
    const next = getCurrentTheme() === "light" ? "dark" : "light";
    setTheme(next);
  });
};

// web/src/features/modals/create-document.ts
init_api();
init_translations();

// web/src/features/modules/helpers.ts
init_translations();
var normalizeModuleList = (modulesValue, fallback) => {
  const list = Array.isArray(modulesValue) ? [...modulesValue] : [];
  if (fallback && !list.includes(fallback)) {
    list.push(fallback);
  }
  return list.map((entry) => entry.trim()).filter((entry) => entry !== "").filter((entry, index, self) => self.indexOf(entry) === index);
};
var moduleChecklistHtml = (modules, selected = []) => {
  if (!modules.length) {
    return `<p class="help">${adminText("modules.noModulesAvailable", "No modules available.")}</p>`;
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
      showCreateError(adminText("createDocument.filenameRequired", "Filename is required."));
      return;
    }
    if (!path.endsWith(".json")) {
      showCreateError(adminText("createDocument.filenameJson", "Filename must end with .json."));
      return;
    }
    if (path.includes("/") || path.includes("\\") || path.includes("..")) {
      showCreateError(adminText("createDocument.filenameNoPath", "Filename must not include path separators."));
      return;
    }
    if (!page) {
      showCreateError(adminText("documents.pageRequired", "Page is required."));
      return;
    }
    if (!name) {
      showCreateError(adminText("documents.nameRequired", "Name is required."));
      return;
    }
    if (!orderRaw) {
      showCreateError(adminText("documents.orderRequired", "Order is required."));
      return;
    }
    const orderValue = Number(orderRaw);
    if (!Number.isInteger(orderValue)) {
      showCreateError(adminText("documents.orderInteger", "Order must be an integer."));
      return;
    }
    if (!dataRaw) {
      showCreateError(adminText("documents.dataRequired", "Data is required."));
      return;
    }
    let data;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      showCreateError(adminText("documents.dataJsonValid", "Data must be valid JSON."));
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
init_translations();

// web/src/features/integrations/helpers.ts
init_translations();
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
    const option = new Option(adminText("integrations.noEnabled", "No integrations enabled"), "", true, true);
    option.disabled = true;
    select.append(option);
    select.disabled = true;
    if (help) {
      help.textContent = adminText(
        "integrations.enableFromSettings",
        "Enable an integration from Settings > Integrations."
      );
    }
    return "";
  }
  select.disabled = false;
  if (includeDisabledCurrent && selectedProvider) {
    const exists = enabled.some((integration) => integration.name === selectedProvider);
    if (!exists) {
      const option = new Option(
        adminText("integrations.providerDisabled", "{name} (disabled)", { name: selectedProvider }),
        selectedProvider,
        true,
        true
      );
      option.disabled = true;
      select.append(option);
      if (help) {
        help.textContent = adminText(
          "integrations.currentProviderDisabled",
          "Current provider is disabled. Select an enabled provider."
        );
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
    const option = new Option(adminText("integrations.noModelsSynced", "No models synced"), "", true, true);
    option.disabled = true;
    select.append(option);
    select.disabled = true;
    return "";
  }
  select.disabled = false;
  if (includeDisabledCurrent && selectedModel && !models.includes(selectedModel)) {
    const option = new Option(
      adminText("integrations.modelUnavailable", "{name} (unavailable)", { name: selectedModel }),
      selectedModel,
      true,
      true
    );
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
      showAgentError(adminText("agents.allFieldsRequired", "All fields are required."));
      return;
    }
    if (agentProviderSelect?.disabled || agentModelSelect?.disabled) {
      showAgentError(adminText("agents.enableIntegrationFirst", "Enable an integration and sync models first."));
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
init_translations();
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
      notice.innerHTML = adminText(
        "integrations.codexCliNotice",
        "Development setup: use <code>CLI authentication</code> to avoid API costs, then run <code>docker compose exec manage codex login --device-auth</code> once. The Docker volume keeps the Codex credentials between restarts."
      );
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
        help.textContent = adminText("common.required", "Required");
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
      integrationTitle.textContent = integration.enabled ? adminText("integrations.editNamed", "Edit {name}", { name: integration.name }) : adminText("integrations.enableNamed", "Enable {name}", { name: integration.name });
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
          showIntegrationError(adminText("common.fieldRequired", "{field} is required.", { field: field.label }));
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

// web/src/features/modals/confirm.ts
init_translations();
var initConfirmModal = () => {
  const confirmModal = document.getElementById("confirm-modal");
  const confirmTitle = document.getElementById("confirm-modal-title");
  const confirmMessage = document.getElementById("confirm-modal-message");
  const confirmButton = document.getElementById("confirm-submit");
  const cancelButton = document.getElementById("confirm-cancel");
  let resolver = null;
  const defaultConfirmClassName = "button app-button app-primary";
  const close = (confirmed) => {
    resetConfirmButton();
    confirmModal?.classList.remove("is-active");
    if (resolver) {
      resolver(confirmed);
      resolver = null;
    }
  };
  const resetConfirmButton = () => {
    if (!confirmButton) {
      return;
    }
    confirmButton.className = defaultConfirmClassName;
    confirmButton.textContent = adminText("confirm.confirm", "Confirm");
  };
  const openConfirmModal = ({
    title,
    message,
    confirmLabel = adminText("confirm.confirm", "Confirm"),
    confirmClassName = defaultConfirmClassName
  }) => {
    if (!confirmModal || !confirmTitle || !confirmMessage || !confirmButton) {
      return Promise.resolve(false);
    }
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmButton.textContent = confirmLabel;
    confirmButton.className = confirmClassName;
    confirmModal.classList.add("is-active");
    return new Promise((resolve) => {
      resolver = resolve;
    });
  };
  confirmButton?.addEventListener("click", () => close(true));
  cancelButton?.addEventListener("click", () => close(false));
  confirmModal?.querySelectorAll("[data-close='confirm']").forEach((el) => {
    el.addEventListener("click", () => close(false));
  });
  confirmModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close(false);
    }
  });
  return { openConfirmModal };
};

// web/src/features/realtime/client.ts
init_api();
init_translations();
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
    const message = error instanceof Error ? error.message : adminText("realtime.connectionFailed", "Realtime connection failed.");
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
init_translations();
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
var matchesPlacement = (item, placement, mode) => item.store === "private" && item.position_view === placement && (!mode || item.store === mode);
var collectPlacementLinks = (pages, placement, mode) => {
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  const pushItem = (item) => {
    if (seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    items.push(item);
  };
  pages.forEach((page) => {
    if (page.documentId && matchesPlacement(page, placement, mode)) {
      pushItem({ id: page.documentId, name: page.name, variants: page.variants });
    }
    page.sections.forEach((section) => {
      if (matchesPlacement(section, placement, mode)) {
        pushItem({ id: section.id, name: section.name, variants: section.variants });
      }
    });
  });
  return items;
};
var renderDesktopNavList = (container, pages, mode, onSelectDocument) => {
  container.innerHTML = "";
  pages.forEach((page) => {
    const pageVisible = mode === "public" ? page.store === "public" && page.position !== "system" && !!page.documentId : !!page.documentId && matchesPlacement(page, "sidebar", mode);
    const sections = mode === "public" ? page.sections.filter((section) => section.store === "public" && section.position !== "system") : page.sections.filter((section) => matchesPlacement(section, "sidebar", mode));
    if (!pageVisible && sections.length === 0) {
      return;
    }
    const pageItem = document.createElement("li");
    if (pageVisible) {
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
    } else {
      const pageLabel = document.createElement("div");
      pageLabel.className = "menu-label";
      pageLabel.textContent = page.name;
      pageItem.append(pageLabel);
    }
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
  pages.forEach((page, index) => {
    const pageVisible = mode === "public" ? page.store === "public" && page.position !== "system" && !!page.documentId : !!page.documentId && matchesPlacement(page, "sidebar", mode);
    const sections = mode === "public" ? page.sections.filter((section) => section.store === "public" && section.position !== "system") : page.sections.filter((section) => matchesPlacement(section, "sidebar", mode));
    if (!pageVisible && sections.length === 0) {
      return;
    }
    const pageItem = document.createElement("li");
    pageItem.className = "app-mobile-nav-item";
    const pageLink = pageVisible ? document.createElement("a") : document.createElement("div");
    pageLink.className = "app-mobile-nav-link";
    if (pageVisible) {
      pageLink.href = "#";
    }
    pageLink.textContent = page.name;
    if (pageVisible && isCurrentDocument(page.documentId, page.variants)) {
      pageLink.classList.add("is-active");
    }
    if (pageVisible) {
      pageLink.addEventListener("click", (event) => {
        event.preventDefault();
        if (!page.documentId) {
          return;
        }
        onSelectDocument(page.documentId);
        closeMobileDrawer();
      });
    }
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
    toggle.setAttribute(
      "aria-label",
      adminText("navigation.toggleSections", "Toggle {name} sections", { name: page.name })
    );
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
  const navPrivateLabel = document.getElementById("nav-private-label");
  const mobilePrivateToggle = document.getElementById("mobile-private-toggle");
  const navSystem = document.getElementById("nav-system-pages");
  const navSystemMobile = document.getElementById("nav-system-pages-mobile");
  const navSettings = document.getElementById("nav-settings-pages");
  const navSettingsMobile = document.getElementById("nav-settings-pages-mobile");
  const navHeader = document.getElementById("nav-header-links");
  const navHeaderMobile = document.getElementById("nav-header-links-mobile");
  const navFooter = document.getElementById("nav-footer-links");
  if (!navPublic || !navPrivate || !navSystem) {
    return;
  }
  state.authDocumentId = findAuthDocumentId(pages);
  renderDesktopNavList(navPublic, pages, "public", onSelectDocument);
  renderDesktopNavList(navPrivate, pages, "private", onSelectDocument);
  const hasPrivateSidebarItems = navPrivate.children.length > 0;
  navPrivate.classList.toggle("is-hidden", !hasPrivateSidebarItems);
  navPrivateLabel?.classList.toggle("is-hidden", !hasPrivateSidebarItems);
  if (navPublicMobile) {
    renderMobileNavList(navPublicMobile, pages, "public", onSelectDocument);
  }
  if (navPrivateMobile) {
    renderMobileNavList(navPrivateMobile, pages, "private", onSelectDocument);
    const hasMobilePrivateItems = navPrivateMobile.children.length > 0;
    navPrivateMobile.classList.toggle("is-hidden", !hasMobilePrivateItems);
    mobilePrivateToggle?.closest(".app-mobile-accordion-section")?.classList.toggle("is-hidden", !hasMobilePrivateItems);
  }
  if (navSettings) {
    renderPlacementLinks(navSettings, pages, "settings", onSelectDocument, "desktop");
  }
  if (navSettingsMobile) {
    renderPlacementLinks(navSettingsMobile, pages, "settings", onSelectDocument, "mobile");
  }
  if (navHeader) {
    renderPlacementLinks(navHeader, pages, "header", onSelectDocument, "header");
  }
  if (navHeaderMobile) {
    renderPlacementLinks(navHeaderMobile, pages, "header", onSelectDocument, "mobile");
  }
  if (navFooter) {
    renderPlacementLinks(navFooter, pages, "footer", onSelectDocument, "footer");
  }
  renderSystemPages(navSystem, pages, onSelectDocument, "desktop");
  if (navSystemMobile) {
    renderSystemPages(navSystemMobile, pages, onSelectDocument, "mobile");
  }
};
var renderPlacementLinks = (container, pages, placement, onSelectDocument, variant) => {
  container.innerHTML = "";
  const mode = "private";
  const items = collectPlacementLinks(pages, placement, mode);
  container.classList.toggle("is-hidden", items.length === 0);
  items.forEach((item) => {
    const link = variant === "header" ? document.createElement("button") : document.createElement("a");
    if (variant === "header") {
      link.className = "button app-button app-ghost";
      link.setAttribute("type", "button");
    } else if (variant === "mobile") {
      link.className = "app-mobile-action-link";
      link.href = "#";
    } else if (variant === "footer") {
      link.className = "app-footer-nav-link";
      link.href = "#";
    } else {
      link.className = "navbar-item";
      link.href = "#";
    }
    link.textContent = item.name;
    if (isCurrentDocument(item.id, item.variants)) {
      link.classList.add("is-active");
    }
    link.addEventListener("click", (event) => {
      event.preventDefault();
      onSelectDocument(item.id);
      if (variant !== "footer") {
        document.getElementById("private-dropdown")?.classList.remove("is-active");
      }
      closeMobileDrawer();
    });
    container.append(link);
  });
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
    empty.textContent = adminText("navigation.noSystemPages", "No system pages.");
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
init_translations();
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
      container.innerHTML = container.id === "nav-agents" ? `<div class="navbar-item is-size-7 app-muted">${adminText("agents.none", "No agents found.")}</div>` : `<div class="app-mobile-empty app-muted">${adminText("agents.none", "No agents found.")}</div>`;
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
init_translations();
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
    link.textContent = adminText("forms.title", "Forms");
  });
};

// web/src/app/language.ts
var normalizeLanguage2 = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
var normalizeStore = (value) => {
  if (value === "public" || value === "private") {
    return value;
  }
  return null;
};
var variantsForStore = (variants, store) => variants.filter((variant) => normalizeStore(variant.store) === store);
var collectLanguages = (variants) => {
  const seen = /* @__PURE__ */ new Set();
  const ordered = [];
  variants.forEach((variant) => {
    const lang = normalizeLanguage2(variant.language);
    if (!lang || seen.has(lang)) {
      return;
    }
    seen.add(lang);
    ordered.push(lang);
  });
  return ordered;
};
var pickPublicVariant = (variants, language) => {
  if (!variants.length) {
    return null;
  }
  if (language) {
    const match = variants.find((variant) => normalizeLanguage2(variant.language) === language);
    if (match) {
      return match;
    }
  }
  const untagged = variants.find((variant) => normalizeLanguage2(variant.language) === null);
  if (untagged) {
    return untagged;
  }
  return null;
};
var pickPrivateVariant = (variants) => {
  if (!variants.length) {
    return null;
  }
  return variants[variants.length - 1];
};
var storesForGroup = (group) => {
  const stores = /* @__PURE__ */ new Set();
  group.variants.forEach((variant) => {
    const store = normalizeStore(variant.store);
    if (store) {
      stores.add(store);
    }
  });
  group.sections.forEach((section) => {
    section.variants.forEach((variant) => {
      const store = normalizeStore(variant.store);
      if (store) {
        stores.add(store);
      }
    });
  });
  return Array.from(stores);
};
var pickFirstPublicLanguage = (groups) => {
  for (const page of groups) {
    for (const variant of variantsForStore(page.variants, "public")) {
      const lang = normalizeLanguage2(variant.language);
      if (lang) {
        return lang;
      }
    }
    for (const section of page.sections) {
      for (const variant of variantsForStore(section.variants, "public")) {
        const lang = normalizeLanguage2(variant.language);
        if (lang) {
          return lang;
        }
      }
    }
  }
  return null;
};
var resolveNavigationPages = (groups, defaultLanguage, activeLanguage) => {
  const normalizedDefault = normalizeLanguage2(defaultLanguage);
  const seedLanguage = normalizedDefault ?? activeLanguage ?? pickFirstPublicLanguage(groups);
  const resolvedLanguage = seedLanguage ?? null;
  const resolvedPages = groups.flatMap(
    (group) => storesForGroup(group).map((store) => {
      const scopedVariants = variantsForStore(group.variants, store);
      const pageVariant = store === "public" ? pickPublicVariant(scopedVariants, resolvedLanguage) : pickPrivateVariant(scopedVariants);
      const resolvedSections = group.sections.map((section) => resolveSection(section, resolvedLanguage, store)).filter(Boolean);
      if (!pageVariant && !resolvedSections.length) {
        return null;
      }
      return {
        page: group.page,
        name: pageVariant?.name ?? group.page,
        language: store === "public" ? normalizeLanguage2(pageVariant?.language) : null,
        order: pageVariant?.order ?? null,
        documentId: pageVariant?.id ?? null,
        store,
        path: pageVariant?.path ?? null,
        position: pageVariant?.position ?? null,
        position_view: pageVariant?.position_view ?? null,
        languages: store === "public" ? collectLanguages(scopedVariants) : [],
        variants: scopedVariants,
        sections: resolvedSections
      };
    }).filter(Boolean)
  );
  resolvedPages.sort(compareByOrder);
  resolvedPages.forEach((page) => {
    page.sections.sort(compareByOrder);
  });
  return {
    pages: resolvedPages,
    activeLanguage: resolvedLanguage
  };
};
var resolveSection = (section, language, store) => {
  const scopedVariants = variantsForStore(section.variants, store);
  const variant = store === "public" ? pickPublicVariant(scopedVariants, language) : pickPrivateVariant(scopedVariants);
  if (!variant) {
    return null;
  }
  return {
    id: variant.id,
    name: variant.name,
    language: store === "public" ? normalizeLanguage2(variant.language) : null,
    order: variant.order ?? section.order ?? null,
    store: variant.store ?? store,
    path: variant.path ?? "",
    position: variant.position ?? null,
    position_view: variant.position_view ?? null,
    languages: store === "public" ? collectLanguages(scopedVariants) : [],
    variants: scopedVariants
  };
};
var findDocumentVariants = (groups, documentId) => {
  for (const page of groups) {
    const pageMatch = page.variants.find((variant) => variant.id === documentId);
    if (pageMatch) {
      if (normalizeStore(pageMatch.store) !== "public") {
        return null;
      }
      const scopedVariants = variantsForStore(page.variants, "public");
      return {
        variants: scopedVariants,
        languages: collectLanguages(scopedVariants)
      };
    }
    for (const section of page.sections) {
      const sectionMatch = section.variants.find((variant) => variant.id === documentId);
      if (sectionMatch) {
        if (normalizeStore(sectionMatch.store) !== "public") {
          return null;
        }
        const scopedVariants = variantsForStore(section.variants, "public");
        return {
          variants: scopedVariants,
          languages: collectLanguages(scopedVariants)
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
  const matching = agents.filter((agent) => normalizeLanguage2(agent.language) === language);
  if (matching.length) {
    return matching;
  }
  const untagged = agents.filter((agent) => !normalizeLanguage2(agent.language));
  return untagged.length ? untagged : agents;
};
var normalizeLanguageValue = normalizeLanguage2;

// web/src/app/loaders.ts
init_translations();
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
    setAdminTranslationConfig(state.layoutConfig);
  } catch {
    state.layoutConfig = {};
    setAdminTranslationConfig({});
  }
};
var preloadAdminLanguage = async () => {
  if (!state.auth) {
    return;
  }
  try {
    const nav = await fetchNavigation(state.auth);
    const defaultLanguage = normalizeLanguageValue(nav.defaultLanguage ?? null);
    state.defaultLanguage = defaultLanguage;
    setAdminLanguage(defaultLanguage);
  } catch {
    setAdminLanguage(getAdminLanguage());
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
    const previousAdminLanguage = getAdminLanguage();
    state.navigationGroups = pages;
    state.defaultLanguage = defaultLanguage;
    const adminLanguageChanged = setAdminLanguage(defaultLanguage);
    const resolved = resolveNavigationPages(pages, defaultLanguage, state.activeLanguage);
    state.activeLanguage = resolved.activeLanguage;
    state.navigationPages = resolved.pages;
    state.agents = filterAgentsByLanguage(state.agentsAll, state.activeLanguage);
    if (state.onSelectAgentMenu) {
      renderAgentsMenu(state.agents, state.onSelectAgentMenu);
    }
    if (adminLanguageChanged && previousAdminLanguage) {
      window.location.reload();
      return;
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
init_translations();
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
          <h1 class="title is-4">${adminText("integrations.title", "Integrations")}</h1>
          <p class="app-muted">${adminText("integrations.subtitle", "Configure AI providers and sync available models.")}</p>
        </div>
      </div>
      <div class="notification is-light">${adminText("integrations.none", "No integrations found.")}</div>
    `;
    return;
  }
  const list = integrations.map((integration) => {
    const enabledLabel = integration.enabled ? adminText("integrations.enabled", "Enabled") : adminText("integrations.disabled", "Disabled");
    const models = integration.supportsModels ? getIntegrationModels2(integration.name).length : null;
    const modelsLine = integration.supportsModels ? `<div class="app-module-row-meta">${adminText("integrations.models", "Models: {count}", { count: models ?? 0 })}</div>` : "";
    const syncState = integration.syncing ? "Sync: running" : integration.lastSyncError ? adminText("integrations.lastSyncFailed", "Last sync failed: {error}", { error: integration.lastSyncError }) : integration.lastSyncedAt ? adminText("integrations.lastSynced", "Last synced: {time}", { time: integration.lastSyncedAt }) : adminText("integrations.syncIdle", "Sync: idle");
    const syncDisabled = integration.enabled && !integration.syncing ? "" : "disabled";
    const settingsLabel = integration.enabled ? adminText("integrations.editSettings", "Edit settings") : adminText("integrations.enable", "Enable integration");
    const syncLabel = integration.syncing ? adminText("integrations.syncing", "Syncing...") : adminText("integrations.syncModels", "Sync models");
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
        <h1 class="title is-4">${adminText("integrations.title", "Integrations")}</h1>
        <p class="app-muted">${adminText("integrations.subtitle", "Configure AI providers and sync available models.")}</p>
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
        pushNotice(
          "success",
          result.alreadyRunning ? adminText("integrations.syncAlreadyRunning", "Model sync already running.") : adminText("integrations.syncStarted", "Model sync started.")
        );
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
init_translations();
var buildLogSelector = (logs, currentId) => {
  if (!logs.length) {
    return `
      <div class="field">
        <label class="label">${adminText("logs.logFile", "Log file")}</label>
        <div class="control">
          <div class="select is-fullwidth">
            <select disabled>
              <option>${adminText("logs.noLogsAvailable", "No logs available")}</option>
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
      <label class="label">${adminText("logs.logFile", "Log file")}</label>
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
    content.innerHTML = `<p class="app-muted">${adminText("auth.required", "Authentication required.")}</p>`;
    return;
  }
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${adminText("logs.title", "Logs")}</h1>
        <p class="app-muted">${adminText("logs.subtitle", "Recent backend errors stored in manage/store/logs.")}</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="${adminText("logs.loggerSettings", "Logger settings")}"
          title="${adminText("logs.loggerSettings", "Logger settings")}"
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
    <div class="notification is-light">${adminText("logs.loading", "Loading logs...")}</div>
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
          <h1 class="title is-4">${adminText("logs.title", "Logs")}</h1>
          <p class="app-muted">${adminText("logs.subtitle", "Recent backend errors stored in manage/store/logs.")}</p>
        </div>
        <div class="app-view-actions">
          <button
            id="logger-settings-open"
            class="button app-button app-ghost app-icon-button"
            aria-label="${adminText("logs.loggerSettings", "Logger settings")}"
            title="${adminText("logs.loggerSettings", "Logger settings")}"
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
      <div class="notification is-light">${adminText("logs.none", "No logs found.")}</div>
    `;
    document.getElementById("logger-settings-open")?.addEventListener("click", () => {
      openLoggerSettings2();
    });
    return;
  }
  const list = logs.map((log) => {
    const metaParts = [];
    if (log.count !== void 0) {
      metaParts.push(adminText("logs.items", "{count} items", { count: log.count }));
    }
    if (log.updatedAt) {
      metaParts.push(adminText("logs.updatedAt", "updated {time}", { time: log.updatedAt }));
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
    )}">${adminText("common.open", "Open")}</button>
          </div>
        </div>
      `;
  }).join("");
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${adminText("logs.title", "Logs")}</h1>
        <p class="app-muted">${adminText("logs.subtitle", "Recent backend errors stored in manage/store/logs.")}</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="${adminText("logs.loggerSettings", "Logger settings")}"
          title="${adminText("logs.loggerSettings", "Logger settings")}"
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
                <div class="app-log-title">${endpoint || adminText("logs.request", "Request")}</div>
                <div class="app-log-meta">${statusLabel}</div>
              </div>
              <div class="app-log-message">${message}</div>
              <div class="app-log-meta">
                ${timestamp ? `${timestamp} \xB7 ` : ""}${type}
              </div>
            </div>
          `;
  }).join("") : `<div class="notification is-light">${adminText("logs.noEntries", "No log entries yet.")}</div>`;
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">${adminText("logs.title", "Logs")} \xB7 ${doc.store}/${doc.path}</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="${adminText("logs.loggerSettings", "Logger settings")}"
          title="${adminText("logs.loggerSettings", "Logger settings")}"
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
      <div class="app-log-summary-item"><span class="app-muted">${adminText("logs.itemsLabel", "Items")}</span> ${count}</div>
      ${createdAt ? `<div class="app-log-summary-item"><span class="app-muted">${adminText("common.created", "Created")}</span> ${createdAt}</div>` : ""}
      ${updatedAt ? `<div class="app-log-summary-item"><span class="app-muted">${adminText("common.updated", "Updated")}</span> ${updatedAt}</div>` : ""}
    </div>
    <div class="mb-4 buttons">
      <button id="export-json" class="button app-button app-ghost">${adminText("documents.exportJson", "Export JSON")}</button>
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
init_translations();
var slug = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
  value
);
var moduleSettingsKey = (payload, moduleName) => {
  const moduleSlug = slug(moduleName) || "module";
  const docId = typeof payload.id === "string" ? payload.id.trim().toLowerCase() : "";
  if (!docId || !isUuid(docId)) {
    throw new Error(adminText("modules.documentIdRequired", "Document id is required for module settings."));
  }
  return `${docId}-${moduleSlug}`;
};

// web/src/modules/chat/layout.ts
init_translations();
var buildHeader = (module, agentName, openSettings, hideHeader) => {
  if (hideHeader) {
    return null;
  }
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
    button.title = adminText("modules.settings", "Module settings");
    button.setAttribute("aria-label", adminText("modules.settings", "Module settings"));
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
    agentMeta.textContent = adminText("agents.agentNamed", "Agent: {name}", { name: agentName });
    header.append(agentMeta);
  }
  return header;
};
var renderChatLayout = (panel, module, agentName, openSettings, hideHeader) => {
  const card = document.createElement("div");
  card.className = "app-module";
  const header = buildHeader(module, agentName, openSettings, hideHeader);
  if (header) {
    card.append(header);
  }
  const body = document.createElement("div");
  body.className = "app-module-body";
  body.innerHTML = `
    <div class="app-chat-layout">
      <div class="app-panel app-chat">
        <div class="app-chat-header">
          <div>
            <div class="app-chat-title" data-role="chat-title">${adminText("chat.noneSelected", "No conversation selected")}</div>
            <div class="app-chat-meta app-muted" data-role="chat-meta">${adminText("chat.selectOrCreate", "Select or create a conversation.")}</div>
          </div>
          <div class="app-chat-actions">
            <div class="select is-small app-chat-select-wrap">
              <select data-role="chat-select">
                <option value="">${adminText("chat.selectConversation", "Select chat")}</option>
              </select>
            </div>
            <button
              class="button app-button app-ghost app-chat-toolbar-button app-chat-toolbar-icon-button"
              data-action="new"
              title="${adminText("chat.startNewConversation", "Start a new conversation")}"
              aria-label="${adminText("chat.startNewConversation", "Start a new conversation")}"
            >
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
                </svg>
              </span>
            </button>
            <button
              class="button app-button app-ghost app-icon-button app-chat-toolbar-button app-chat-toolbar-icon-button"
              data-action="delete"
              title="${adminText("chat.deleteConversation", "Delete the selected conversation")}"
              aria-label="${adminText("chat.deleteConversation", "Delete the selected conversation")}"
              disabled
            >
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
          <button type="button" class="button app-button app-ghost app-chat-jump" data-role="chat-jump" aria-label="${adminText("chat.jumpToLatest", "Jump to latest message")}" title="${adminText("chat.jumpToLatest", "Jump to latest message")}">
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
                <textarea class="textarea" rows="2" placeholder="${adminText("chat.writeMessage", "Write a message")}" data-role="chat-input" disabled></textarea>
              </div>
            </div>
            <div class="buttons">
              <button class="button app-button app-primary" data-role="chat-send" disabled>${adminText("chat.send", "Send")}</button>
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
init_translations();
var getConversationProgressTitle = (actorName) => adminText("chat.progress.title", "{name} is processing", {
  name: (actorName ?? "").trim() || adminText("agents.agent", "Agent")
});
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
var appendConversationProgress = (container, progress, actorName) => {
  if (!progress) {
    return;
  }
  const card = document.createElement("div");
  card.className = "app-chat-progress";
  const title = document.createElement("div");
  title.className = "app-chat-progress-title";
  title.textContent = getConversationProgressTitle(actorName);
  const status2 = document.createElement("div");
  status2.className = "app-chat-progress-status";
  status2.textContent = progress.status || adminText("chat.progress.working", "Working...");
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
init_translations();
var PHRASES = [
  adminText("chat.processing.processing", "Processing..."),
  adminText("chat.processing.sailing", "Sailing..."),
  adminText("chat.processing.swimming", "Swimming..."),
  adminText("chat.processing.floating", "Floating...")
];
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

// web/src/modules/chat/controller.ts
init_translations();

// web/src/modules/chat/data.ts
var ensureDataObject = ({ payload, editor }) => {
  if (isRecord(payload.data)) {
    return payload.data;
  }
  payload.data = {};
  editor?.setValue(payload.data);
  return payload.data;
};
var ensureOutputList = (data, targetKey) => {
  const existing = data[targetKey];
  if (!Array.isArray(existing)) {
    data[targetKey] = [];
    return data[targetKey];
  }
  return existing;
};
var isMessageSelected = (context, targetKey, message) => {
  const data = ensureDataObject(context);
  const list = Array.isArray(data[targetKey]) ? data[targetKey] : [];
  return list.some((entry) => isRecord(entry) && entry.id === message.id);
};
var toggleOutputMessage = (context, message, selected) => {
  const data = ensureDataObject(context);
  const list = ensureOutputList(data, context.targetKey);
  if (selected) {
    data[context.targetKey] = list.filter((entry) => !(isRecord(entry) && entry.id === message.id));
  } else if (context.conversation) {
    list.push({
      id: message.id,
      conversationId: context.conversation.id,
      agent: context.agentName,
      content: message.content,
      createdAt: message.createdAt ?? null,
      role: message.role
    });
  }
  context.editor?.setValue(data);
};

// web/src/modules/chat/events.ts
var bindChatDomEvents = (bindings) => {
  const handleCreate = () => bindings.onCreate();
  const handleRemove = () => bindings.onRemove();
  const handleSelect = () => {
    const conversationId = bindings.dom.select.value.trim();
    if (conversationId) {
      bindings.onSelect(conversationId);
      return;
    }
    bindings.onClearSelection();
  };
  const handleScroll = () => bindings.onReachedBottom();
  const handleJump = () => bindings.onJump();
  const handleSubmit = (event) => {
    event.preventDefault();
    const content = bindings.dom.input.value.trim();
    if (!content) {
      return;
    }
    bindings.dom.input.value = "";
    bindings.onSend(content);
  };
  const handleKeydown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      bindings.dom.form.requestSubmit();
    }
  };
  bindings.dom.create?.addEventListener("click", handleCreate);
  bindings.dom.remove?.addEventListener("click", handleRemove);
  bindings.dom.select.addEventListener("change", handleSelect);
  bindings.dom.scroll.addEventListener("scroll", handleScroll);
  bindings.dom.jump.addEventListener("click", handleJump);
  bindings.dom.form.addEventListener("submit", handleSubmit);
  bindings.dom.input.addEventListener("keydown", handleKeydown);
  return () => {
    bindings.dom.create?.removeEventListener("click", handleCreate);
    bindings.dom.remove?.removeEventListener("click", handleRemove);
    bindings.dom.select.removeEventListener("change", handleSelect);
    bindings.dom.scroll.removeEventListener("scroll", handleScroll);
    bindings.dom.jump.removeEventListener("click", handleJump);
    bindings.dom.form.removeEventListener("submit", handleSubmit);
    bindings.dom.input.removeEventListener("keydown", handleKeydown);
  };
};

// web/src/modules/chat/feedback.ts
init_translations();
var mergeFailureReason = (code) => {
  if (code === "invalid_json") {
    return adminText("chat.mergeReason.invalidJson", "The response did not contain valid JSON.");
  }
  if (code === "no_target") {
    return adminText("chat.mergeReason.noTarget", "No JSON subtree matched the existing page data schema.");
  }
  return adminText("chat.mergeReason.schemaMismatch", "The response JSON did not match the existing page data schema.");
};
var mergeFailureStatus = (code) => adminText("chat.mergeValidationFailed", "JSON validation failed: {reason}", {
  reason: mergeFailureReason(code)
});
var mergeFailureFeedback = (code) => adminText(
  "chat.mergeValidationFeedback",
  "JSON validation failed against the existing page data schema. Fix the response and return valid JSON only. Reason: {reason}",
  { reason: mergeFailureReason(code) }
);
var mergeSuccessStatus = (path) => adminText("chat.mergeApplied", "Merged response into {path}.", { path });

// web/src/modules/chat/merge.ts
var clone = (value) => JSON.parse(JSON.stringify(value));
var hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
var primitiveKind = (value) => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
};
var parseJsonCandidate = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
var extractJsonCandidates = (content) => {
  const trimmed = content.trim();
  const candidates = /* @__PURE__ */ new Set();
  if (trimmed !== "") {
    candidates.add(trimmed);
  }
  const blockPattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of trimmed.matchAll(blockPattern)) {
    const inner = match[1]?.trim();
    if (inner) {
      candidates.add(inner);
    }
  }
  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    candidates.add(trimmed.slice(firstObject, lastObject + 1).trim());
  }
  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    candidates.add(trimmed.slice(firstArray, lastArray + 1).trim());
  }
  return [...candidates];
};
var parseAssistantJson = (content) => {
  for (const candidate of extractJsonCandidates(content)) {
    const parsed = parseJsonCandidate(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};
var arraysCompatible = (target, incoming) => {
  if (!incoming.length || !target.length) {
    return true;
  }
  return incoming.every((item) => valuesCompatible(target[0], item));
};
var objectCompatible = (target, incoming) => Object.entries(incoming).every(([key, value]) => {
  if (!hasOwn(target, key)) {
    return false;
  }
  return valuesCompatible(target[key], value);
});
var valuesCompatible = (target, incoming) => {
  if (Array.isArray(target)) {
    return Array.isArray(incoming) && arraysCompatible(target, incoming);
  }
  if (isRecord(target)) {
    return isRecord(incoming) && objectCompatible(target, incoming);
  }
  return !Array.isArray(incoming) && !isRecord(incoming) && primitiveKind(target) === primitiveKind(incoming);
};
var collectCandidateObjects = (value, nodes = []) => {
  if (isRecord(value)) {
    nodes.push(value);
    Object.values(value).forEach((child) => collectCandidateObjects(child, nodes));
    return nodes;
  }
  if (Array.isArray(value)) {
    value.forEach((child) => collectCandidateObjects(child, nodes));
  }
  return nodes;
};
var collectTargetObjects = (value, path = [], nodes = []) => {
  if (!isRecord(value)) {
    return nodes;
  }
  nodes.push({ path, value });
  Object.entries(value).forEach(([key, child]) => {
    if (isRecord(child)) {
      collectTargetObjects(child, [...path, key], nodes);
    }
  });
  return nodes;
};
var preferredPlan = (data, incoming, targetKey) => {
  if (!hasOwn(data, targetKey)) {
    return null;
  }
  const target = data[targetKey];
  if (valuesCompatible(target, incoming)) {
    return { path: [targetKey], value: incoming };
  }
  if (isRecord(incoming) && hasOwn(incoming, targetKey) && valuesCompatible(target, incoming[targetKey])) {
    return { path: [targetKey], value: incoming[targetKey] };
  }
  return null;
};
var resolveMergePlan = (data, incoming, targetKey) => {
  const preferred = preferredPlan(data, incoming, targetKey);
  if (preferred) {
    return preferred;
  }
  if (!isRecord(incoming)) {
    return null;
  }
  const targetNodes = collectTargetObjects(data);
  for (const candidate of collectCandidateObjects(incoming)) {
    const match = targetNodes.find((target) => objectCompatible(target.value, candidate));
    if (match) {
      return { path: match.path, value: candidate };
    }
  }
  return null;
};
var mergeValues = (target, incoming) => {
  if (Array.isArray(target) && Array.isArray(incoming)) {
    return [...target, ...clone(incoming)];
  }
  if (isRecord(target) && isRecord(incoming)) {
    const next = clone(target);
    Object.entries(incoming).forEach(([key, value]) => {
      if (!hasOwn(next, key)) {
        return;
      }
      next[key] = mergeValues(next[key], value);
    });
    return next;
  }
  return clone(incoming);
};
var getValueAtPath = (data, path) => {
  let current = data;
  for (const key of path) {
    if (!isRecord(current) || !hasOwn(current, key)) {
      return void 0;
    }
    current = current[key];
  }
  return current;
};
var setValueAtPath = (data, path, value) => {
  if (!path.length) {
    return isRecord(value) ? value : data;
  }
  let current = data;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const next = current[key];
    if (!isRecord(next)) {
      return data;
    }
    current = next;
  }
  current[path[path.length - 1]] = value;
  return data;
};
var describeMergePath = (path) => path.length ? path.join(".") : "data";
var mergeAssistantJson = (data, content, targetKey) => {
  const incoming = parseAssistantJson(content);
  if (incoming === null) {
    return {
      ok: false,
      code: "invalid_json"
    };
  }
  const plan = resolveMergePlan(data, incoming, targetKey);
  if (!plan) {
    return {
      ok: false,
      code: "no_target"
    };
  }
  const nextData = clone(data);
  const currentValue = getValueAtPath(nextData, plan.path);
  if (typeof currentValue === "undefined" || !valuesCompatible(currentValue, plan.value)) {
    return {
      ok: false,
      code: "schema_mismatch"
    };
  }
  const mergedData = setValueAtPath(nextData, plan.path, mergeValues(currentValue, plan.value));
  return {
    ok: true,
    data: mergedData,
    path: plan.path
  };
};

// web/src/modules/chat/message-panel.ts
init_translations();

// web/src/modules/chat/utils.ts
init_translations();
var messageId = (conversationId, createdAt, index) => `${conversationId}:${createdAt ?? index}`;
var escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var foldedPreview = (content) => {
  const firstLine = content.split(/\r?\n/, 1)[0]?.trim() ?? "";
  return firstLine;
};
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
    const label = options.emptyState ?? adminText("chat.selectOrCreate", "Select or create a conversation.");
    container.innerHTML = `<p class="app-muted">${label}</p>`;
    appendConversationProgress(container, options.progress ?? null, options.assistantLabel);
    return;
  }
  const enableDataActions = options.enableDataActions ?? false;
  const messageMap = new Map(messages.map((message) => [message.id, message]));
  container.innerHTML = messages.map((message) => {
    const role = message.role === "assistant" ? "assistant" : "user";
    const label = role === "assistant" ? options.assistantLabel?.trim() || adminText("agents.agent", "Agent") : adminText("chat.you", "You");
    const roleClass = role === "assistant" ? "is-assistant" : "is-user";
    const assistantActions = role === "assistant";
    const selectable = enableDataActions && assistantActions;
    const foldable = role === "assistant";
    const folded = foldable && options.isFolded ? options.isFolded(message) : false;
    const selected = selectable && options.isSelected ? options.isSelected(message) : false;
    const selectedClass = selected ? "is-selected" : "";
    const foldedClass = folded ? "is-folded" : "";
    const toggleTitle = selected ? adminText("chat.removeFromData", "Remove from data") : adminText("chat.addToData", "Add to data");
    const mergeTitle = adminText("chat.mergeIntoData", "Merge JSON into data");
    const toggleIcon = selected ? `<path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>` : `<path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>`;
    const mergeIcon = `
        <path d="M7 7h4v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="m7 11 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M17 17h-4v-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="m17 13-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
      `;
    const foldTitle = folded ? adminText("chat.expandResponse", "Expand response") : adminText("chat.collapseResponse", "Collapse response");
    const foldIcon = folded ? `<path d="m8 10 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>` : `<path d="m8 14 4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>`;
    const preview = folded ? foldedPreview(message.content) : "";
    const mergeAction = selectable ? `
            <button
              type="button"
              class="app-chat-action"
              data-chat-action="merge"
              data-message-id="${message.id}"
              title="${mergeTitle}"
              aria-label="${mergeTitle}"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                ${mergeIcon}
              </svg>
            </button>
          ` : "";
    const toggleAction = selectable ? `
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
          ` : "";
    const copyAction = assistantActions ? `
            <button
              type="button"
              class="app-chat-action"
              data-chat-action="copy"
              data-message-id="${message.id}"
              title="${adminText("common.copy", "Copy")}"
              aria-label="${adminText("common.copy", "Copy")}"
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
          ` : "";
    const actions = assistantActions ? `
          <div class="app-chat-message-actions">
            <button
              type="button"
              class="app-chat-action"
              data-chat-action="fold"
              data-message-id="${message.id}"
              title="${foldTitle}"
              aria-label="${foldTitle}"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                ${foldIcon}
              </svg>
            </button>
            ${toggleAction}
            ${mergeAction}
            ${copyAction}
          </div>
        ` : "";
    return `
        <div class="app-chat-message ${roleClass} ${selectedClass} ${foldedClass}" data-message-id="${message.id}">
          <div class="app-chat-message-role">${label}</div>
          ${actions}
          ${folded ? `<div class="app-chat-message-preview">${escapeHtml(preview)}</div>` : ""}
          <div class="app-chat-message-content">${message.content}</div>
        </div>
      `;
  }).join("");
  if (messages.length) {
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
      if (action === "fold") {
        button.addEventListener("click", () => {
          options.onToggleFold?.(message);
        });
      }
      if (action === "copy") {
        button.addEventListener("click", () => {
          options.onCopy?.(message);
        });
      }
      if (action === "merge") {
        button.addEventListener("click", () => {
          options.onMerge?.(message);
        });
      }
    });
  }
  appendConversationProgress(container, options.progress ?? null, options.assistantLabel);
};
var updateConversationHeader = (titleEl, metaEl, conversation) => {
  if (!conversation) {
    titleEl.textContent = adminText("chat.noneSelected", "No conversation selected");
    metaEl.textContent = adminText("chat.selectOrCreate", "Select or create a conversation.");
    return;
  }
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const createdAt = typeof payloadData.createdAt === "string" ? payloadData.createdAt : "";
  titleEl.textContent = conversation.payload.name || adminText("chat.conversation", "Conversation");
  metaEl.textContent = createdAt ? adminText("chat.startedAt", "Started {time}", { time: createdAt }) : adminText("chat.loaded", "Conversation loaded.");
};
var updateChatInputState = (input, send, active2) => {
  input.disabled = !active2;
  send.disabled = !active2;
};

// web/src/modules/chat/message-panel.ts
var createChatMessagePanel = (bindings) => {
  const foldedByConversation = /* @__PURE__ */ new Map();
  const ensureFoldState = (conversation) => {
    if (!conversation || foldedByConversation.has(conversation.id)) {
      return;
    }
    const assistantMessages = extractMessages(conversation).filter((message) => message.role === "assistant");
    const lastAssistantId = assistantMessages[assistantMessages.length - 1]?.id ?? null;
    const folded = /* @__PURE__ */ new Set();
    assistantMessages.forEach((message) => {
      if (message.id !== lastAssistantId) {
        folded.add(message.id);
      }
    });
    foldedByConversation.set(conversation.id, folded);
  };
  const isFolded = (message) => {
    const conversation = bindings.getConversation();
    return !!conversation && message.role === "assistant" && (foldedByConversation.get(conversation.id)?.has(message.id) ?? false);
  };
  const toggleFold = (message) => {
    const conversation = bindings.getConversation();
    if (!conversation || message.role !== "assistant") {
      return;
    }
    ensureFoldState(conversation);
    const folded = foldedByConversation.get(conversation.id);
    if (!folded) {
      return;
    }
    if (folded.has(message.id)) {
      folded.delete(message.id);
    } else {
      folded.add(message.id);
    }
    render();
  };
  const prepareConversation = (conversation) => {
    if (!conversation) {
      return;
    }
    ensureFoldState(conversation);
    const assistantMessages = extractMessages(conversation).filter((message) => message.role === "assistant");
    const latestAssistant = assistantMessages[assistantMessages.length - 1];
    if (latestAssistant) {
      foldedByConversation.get(conversation.id)?.delete(latestAssistant.id);
    }
  };
  const render = () => {
    const conversation = bindings.getConversation();
    const emptyState = conversation ? adminText("chat.noMessages", "No messages yet.") : adminText("chat.selectOrCreate", "Select or create a conversation.");
    ensureFoldState(conversation);
    renderMessages(bindings.container, extractMessages(conversation), {
      enableDataActions: bindings.enableDataActions,
      assistantLabel: bindings.assistantLabel,
      progress: bindings.progress(conversation),
      isSelected: bindings.isSelected,
      isFolded,
      onToggleFold: toggleFold,
      onToggle: bindings.onToggle,
      onMerge: bindings.onMerge,
      onCopy: bindings.onCopy,
      emptyState
    });
  };
  return { prepareConversation, render };
};

// web/src/modules/chat/realtime.ts
var createChatRealtimeBindings = (bindings) => {
  let disposeRealtime = null;
  let disposeRealtimeStatus = null;
  const stop = () => {
    disposeRealtime?.();
    disposeRealtimeStatus?.();
    disposeRealtime = null;
    disposeRealtimeStatus = null;
  };
  const sync = (active2) => {
    if (!active2) {
      stop();
      return;
    }
    if (disposeRealtime === null) {
      disposeRealtime = subscribeRealtime(bindings.onEvent);
    }
    if (disposeRealtimeStatus === null) {
      disposeRealtimeStatus = subscribeRealtimeStatus(bindings.onStatus);
    }
  };
  return { sync, stop };
};

// web/src/modules/chat/service.ts
init_api();
var latestConversationId = (items) => {
  if (!items.length) {
    return null;
  }
  const timestamp = (item) => {
    const raw = item.updatedAt || item.createdAt || "";
    const value = Date.parse(raw);
    return Number.isNaN(value) ? 0 : value;
  };
  return [...items].sort((a, b) => {
    const diff = timestamp(b) - timestamp(a);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  })[0]?.id ?? null;
};
var listConversations = async (context) => {
  const response = await fetchChatConversations(context.auth, context.moduleName, {
    settings: context.settingsKey
  });
  return Array.isArray(response.items) ? response.items : [];
};
var loadConversation = (context, conversationId) => fetchChatConversation(context.auth, context.moduleName, {
  id: conversationId,
  settings: context.settingsKey
});
var createConversation = (context) => startChatConversation(context.auth, context.moduleName, {
  settings: context.settingsKey
});
var sendConversationMessage = (context, conversationId, content) => appendChatMessage(context.auth, context.moduleName, {
  id: conversationId,
  content,
  settings: context.settingsKey
});
var removeConversation = (context, conversationId) => deleteChatConversation(context.auth, context.moduleName, {
  id: conversationId,
  settings: context.settingsKey
});
var copyMessageToClipboard = (content) => navigator.clipboard.writeText(content);

// web/src/modules/chat/controller.ts
var mountChatController = (runtime) => {
  let conversations = [];
  let currentConversation = null;
  let pendingNew = false;
  let attemptedInitialAutoLoad = false;
  const realtime = createChatRealtimeBindings({
    onEvent: (event) => handleRealtimeEvent(event),
    onStatus: (status2) => handleRealtimeStatus(status2)
  });
  const setStatus2 = (message) => {
    runtime.dom.status.textContent = message;
  };
  const processingStatus = createProcessingStatus(setStatus2);
  const authContext = () => {
    if (!runtime.auth) {
      setStatus2(adminText("auth.loginRequired", "Login required."));
      return null;
    }
    return {
      auth: runtime.auth,
      moduleName: runtime.moduleName,
      settingsKey: runtime.settingsKey
    };
  };
  const isNearBottom = () => runtime.dom.scroll.scrollHeight - runtime.dom.scroll.scrollTop - runtime.dom.scroll.clientHeight <= 48;
  const scrollToBottom = () => {
    runtime.dom.scroll.scrollTop = runtime.dom.scroll.scrollHeight;
  };
  const clearStatusLater = (delay = 1200) => {
    window.setTimeout(() => {
      if (!conversationHasPendingResponse(currentConversation)) {
        setStatus2("");
      }
    }, delay);
  };
  const updateJumpVisibility = () => {
    runtime.dom.jump.classList.toggle("is-visible", pendingNew);
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
          agentName: runtime.agentName,
          conversationId: conversation?.id ?? null,
          pending,
          progress
        }
      })
    );
  };
  const messagePanel = createChatMessagePanel({
    container: runtime.dom.messages,
    assistantLabel: runtime.agentName,
    enableDataActions: runtime.enableDataActions,
    getConversation: () => currentConversation,
    isSelected: (message) => isMessageSelected(runtime, runtime.targetKey, message),
    onToggle: (message, selected) => {
      toggleOutputMessage(
        {
          payload: runtime.payload,
          editor: runtime.editor,
          targetKey: runtime.targetKey,
          conversation: currentConversation,
          agentName: runtime.agentName
        },
        message,
        selected
      );
      messagePanel.render();
    },
    onMerge: (message) => void mergeMessage(message),
    onCopy: (message) => void copyMessage(message),
    progress: (conversation) => getConversationProgress(conversation)
  });
  const syncConversation = (conversation, forceScroll = false) => {
    if (conversation) {
      messagePanel.prepareConversation(conversation);
    }
    currentConversation = conversation;
    updateConversationHeader(runtime.dom.title, runtime.dom.meta, conversation);
    messagePanel.render();
    const pending = conversationHasPendingResponse(conversation);
    emitProgress(conversation, pending, getConversationProgress(conversation));
    updateChatInputState(runtime.dom.input, runtime.dom.send, !!conversation && !pending);
    runtime.dom.select.value = conversation?.id ?? "";
    if (runtime.dom.remove) {
      runtime.dom.remove.disabled = !conversation;
    }
    if (forceScroll || isNearBottom()) {
      scrollToBottom();
      pendingNew = false;
    }
    updateJumpVisibility();
    if (pending) {
      processingStatus.start(getConversationProgress(conversation)?.status ?? "");
      realtime.sync(true);
      return;
    }
    processingStatus.stop();
    realtime.sync(!!currentConversation);
  };
  const updateSelectOptions = () => {
    runtime.dom.select.innerHTML = `<option value="">${adminText("chat.selectConversation", "Select chat")}</option>` + conversations.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    if (currentConversation) {
      runtime.dom.select.value = currentConversation.id;
    }
  };
  const refreshList = async () => {
    const service = authContext();
    if (!service) {
      return;
    }
    try {
      conversations = await listConversations(service);
      updateSelectOptions();
      if (runtime.autoLoadLatestConversation && !currentConversation && !attemptedInitialAutoLoad) {
        attemptedInitialAutoLoad = true;
        const conversationId = latestConversationId(conversations);
        if (conversationId) {
          await loadConversation2(conversationId);
          return;
        }
      }
      if (!conversationHasPendingResponse(currentConversation)) {
        setStatus2("");
      }
    } catch (error) {
      setStatus2(error.message);
    }
  };
  const loadConversation2 = async (conversationId) => {
    const service = authContext();
    if (!service) {
      return;
    }
    try {
      pendingNew = false;
      syncConversation(await loadConversation(service, conversationId), true);
      updateSelectOptions();
    } catch (error) {
      setStatus2(error.message);
    }
  };
  const startConversation = async () => {
    const service = authContext();
    if (!service) {
      return;
    }
    try {
      pendingNew = false;
      syncConversation(await createConversation(service), true);
      await refreshList();
      setStatus2("");
    } catch (error) {
      setStatus2(error.message);
    }
  };
  const sendMessage = async (content) => {
    const service = authContext();
    if (!service || !currentConversation || conversationHasPendingResponse(currentConversation)) {
      return;
    }
    appendConversationMessage(currentConversation, "user", content);
    syncConversation(currentConversation, true);
    try {
      pendingNew = false;
      syncConversation(await sendConversationMessage(service, currentConversation.id, content), true);
      await refreshList();
    } catch (error) {
      if (!currentConversation) {
        return;
      }
      markConversationPending(currentConversation, false);
      appendConversationMessage(
        currentConversation,
        "assistant",
        adminText("agents.replyFailed", "Something went wrong while I was replying: {message}", {
          message: error.message || adminText("common.tryAgain", "Please try again.")
        })
      );
      syncConversation(currentConversation, true);
    }
  };
  const copyMessage = async (message) => {
    try {
      await copyMessageToClipboard(message.content);
      setStatus2(adminText("common.copied", "Copied."));
      clearStatusLater();
    } catch {
      setStatus2(adminText("common.copyFailed", "Copy failed."));
    }
  };
  const mergeMessage = async (message) => {
    const data = ensureDataObject(runtime);
    const result = mergeAssistantJson(data, message.content, runtime.targetKey);
    if (!result.ok) {
      setStatus2(mergeFailureStatus(result.code));
      const service = authContext();
      if (!service || !currentConversation || conversationHasPendingResponse(currentConversation)) {
        return;
      }
      try {
        pendingNew = false;
        syncConversation(
          await sendConversationMessage(service, currentConversation.id, mergeFailureFeedback(result.code)),
          true
        );
        await refreshList();
      } catch (error) {
        setStatus2(error.message);
      }
      return;
    }
    runtime.payload.data = result.data;
    runtime.editor?.setValue(result.data);
    setStatus2(mergeSuccessStatus(describeMergePath(result.path)));
    clearStatusLater();
  };
  const handleRealtimeEvent = (event) => {
    if (event.type !== "chat.conversation.updated") {
      return;
    }
    const data = isRecord(event.conversation.payload.data) ? event.conversation.payload.data : {};
    if (data.moduleKey !== runtime.settingsKey) {
      return;
    }
    if (currentConversation?.id === event.conversation.id) {
      pendingNew = !isNearBottom();
      syncConversation(event.conversation, !pendingNew);
    }
    void refreshList();
  };
  const handleRealtimeStatus = (status2) => {
    if (status2 !== "open") {
      return;
    }
    void refreshList();
    if (currentConversation) {
      void loadConversation2(currentConversation.id);
    }
  };
  const unbindEvents = bindChatDomEvents({
    dom: runtime.dom,
    onCreate: () => void startConversation(),
    onRemove: () => {
      const service = authContext();
      if (!service || !currentConversation) {
        return;
      }
      setStatus2(adminText("chat.deletingConversation", "Deleting conversation..."));
      void removeConversation(service, currentConversation.id).then(async () => {
        syncConversation(null, true);
        await refreshList();
        setStatus2("");
      }).catch((error) => {
        setStatus2(error.message);
      });
    },
    onSelect: (conversationId) => void loadConversation2(conversationId),
    onClearSelection: () => {
      pendingNew = false;
      syncConversation(null, true);
      setStatus2("");
    },
    onReachedBottom: () => {
      if (!isNearBottom()) {
        return;
      }
      pendingNew = false;
      updateJumpVisibility();
    },
    onJump: () => {
      scrollToBottom();
      pendingNew = false;
      updateJumpVisibility();
    },
    onSend: (content) => void sendMessage(content)
  });
  registerModuleChatCleanup(() => {
    unbindEvents();
    realtime.stop();
    processingStatus.stop();
  });
  updateChatInputState(runtime.dom.input, runtime.dom.send, false);
  messagePanel.render();
  void refreshList();
};

// web/src/modules/chat/index.ts
init_translations();
var renderChatModule = (panel, context) => {
  const settings = isRecord(context.settings) ? context.settings : null;
  const agentSettings = settings && isRecord(settings.agent) ? settings.agent : null;
  const agentName = typeof agentSettings?.name === "string" ? agentSettings.name.trim() : "";
  const agentId = typeof agentSettings?.id === "string" ? agentSettings.id.trim() : "";
  if (!agentName || !agentId) {
    const card = document.createElement("div");
    card.className = "app-module";
    if (!context.hideHeader) {
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
        button.title = adminText("modules.settings", "Module settings");
        button.setAttribute("aria-label", adminText("modules.settings", "Module settings"));
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
      card.append(header);
    }
    const body = document.createElement("div");
    body.className = "app-module-body";
    const note = document.createElement("div");
    note.className = "app-module-note";
    note.innerHTML = `
      <strong>${adminText("chat.agentRequired", "Chat needs an agent.")}</strong>
      <p class="app-muted">${adminText("chat.agentRequiredHelp", "Select an agent in module settings to start chatting.")}</p>
    `;
    body.append(note);
    card.append(body);
    panel.append(card);
    return;
  }
  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const targetKey = typeof outputSettings?.target === "string" && outputSettings.target.trim() !== "" ? outputSettings.target.trim() : context.module.name;
  const enableDataActions = !(context.payload.page === "website-build" && context.payload.position === "system");
  const dom = renderChatLayout(panel, context.module, agentName, context.openSettings, context.hideHeader);
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
    targetKey,
    enableDataActions,
    autoLoadLatestConversation: context.autoLoadLatestConversation
  });
};

// web/src/modules/form/index.ts
init_translations();
var resolveLabel = (settings, fallback) => {
  const name = settings?.name;
  if (typeof name === "string" && name.trim() !== "") {
    return name.trim();
  }
  return adminText("form.defaultName", "{name} - form", { name: fallback });
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
    { key: "sendadminemail", label: adminText("form.sendAdminEmail", "Send admin email") },
    { key: "senduseremail", label: adminText("form.sendUserEmail", "Send user email") },
    { key: "captcha", label: adminText("form.captcha", "Captcha") }
  ];
  const flagMarkup = flags.map((flag) => {
    const value = resolveFlag(settings, flag.key) ? adminText("common.enabled", "enabled") : adminText("common.disabled", "disabled");
    return `<div class="app-form-flag"><span>${flag.label}</span><strong>${value}</strong></div>`;
  }).join("");
  wrapper.innerHTML = `
    <div class="app-module-header">
      <div>
        <h3 class="title is-6">${label}</h3>
        <p class="app-muted">${adminText("form.pageId", "Form page id:")} <code>${pageId || adminText("common.missing", "missing")}</code></p>
      </div>
      <div class="buttons">
        <button class="button app-button app-ghost" data-form-settings>${adminText("common.settings", "Settings")}</button>
      </div>
    </div>
    <div class="app-form-flags">${flagMarkup}</div>
    <p class="app-muted">${adminText("form.entriesLocation", "Entries appear under Settings \u2192 Forms.")}</p>
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
init_translations();
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
    notice.textContent = adminText("gallery.schemaImageRequired", "Gallery schema must define a string field for the image.");
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
    settingsButton.title = adminText("modules.settings", "Module settings");
    settingsButton.setAttribute("aria-label", adminText("modules.settings", "Module settings"));
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
  toggleLabel.textContent = adminText("gallery.source", "Source");
  const toggleControl = document.createElement("div");
  toggleControl.className = "control";
  const toggleTabs = document.createElement("div");
  toggleTabs.className = "tabs is-toggle is-small";
  toggleTabs.innerHTML = `
    <ul>
      <li data-visibility="all"><a>${adminText("common.all", "All")}</a></li>
      <li data-visibility="public"><a>${adminText("documents.storePublic", "Public")}</a></li>
      <li data-visibility="private"><a>${adminText("documents.storePrivate", "Private")}</a></li>
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
        <p class="modal-card-title">${adminText("gallery.image", "Image")}</p>
        <button class="delete" aria-label="${adminText("common.close", "Close")}"></button>
      </header>
      <section class="modal-card-body">
        <div class="app-gallery-modal-body"></div>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button class="button app-button app-primary" data-action="add">${adminText("chat.addToData", "Add to data")}</button>
          <button class="button app-button app-ghost" data-action="remove">${adminText("chat.removeFromData", "Remove from data")}</button>
          <button class="button app-button app-danger" data-action="delete">${adminText("gallery.deleteFile", "Delete file")}</button>
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
    if (!confirm(adminText("gallery.confirmDelete", "Delete this file? This cannot be undone."))) {
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
      status2.textContent = adminText("auth.loginRequired", "Login required.");
      return;
    }
    status2.textContent = adminText("gallery.loadingMedia", "Loading media...");
    grid.innerHTML = "";
    try {
      const response = await fetchModuleList(auth, module.name, {
        visibility: currentVisibility,
        settings: settingsKey
      });
      const items = response.items ?? [];
      if (!items.length) {
        status2.textContent = adminText("gallery.noImages", "No images found.");
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
init_translations();
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
    settingsButton.title = adminText("modules.settings", "Module settings");
    settingsButton.setAttribute("aria-label", adminText("modules.settings", "Module settings"));
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
    notice.textContent = adminText("uploader.schemaImageRequired", "Uploader schema must define a string field for the image.");
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
      empty.textContent = adminText("uploader.noImageSelected", "No image selected.");
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
  fileLabel.textContent = adminText("uploader.uploadImage", "Upload image");
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
    setUploadStatus(adminText("common.uploading", "Uploading..."));
    try {
      const settingsKey = moduleSettingsKey(payload, module.name);
      const result = await uploadModuleFile(auth, module.name, file, settingsKey);
      urlInput.value = result.url;
      setPendingUrl(result.url);
      setUploadStatus(adminText("uploader.uploadComplete", "Upload complete."));
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
  urlLabel.textContent = schema?.properties?.[urlKey]?.title ?? adminText("uploader.imageUrl", "Image URL");
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
  addButton.textContent = adminText("chat.addToData", "Add to data");
  addButton.disabled = true;
  const discardButton = document.createElement("button");
  discardButton.type = "button";
  discardButton.className = "button app-button app-ghost";
  discardButton.textContent = adminText("common.discard", "Discard");
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
  targetHelp.textContent = adminText("uploader.targetHelp", "Adds to data.{target}[]", { target: targetKey });
  body.append(preview, fileField, urlField, actionsField, targetHelp);
  let altInput = null;
  if (altKey) {
    const altField = document.createElement("div");
    altField.className = "field";
    const altLabel = document.createElement("label");
    altLabel.className = "label";
    altLabel.textContent = schema?.properties?.[altKey]?.title ?? adminText("uploader.altText", "Alt text");
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
init_translations();
var renderModulePanel = async ({
  auth,
  doc,
  editor,
  hideModuleHeader,
  autoLoadLatestConversation,
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
      notice.textContent = adminText("modules.notFound", 'Module "{name}" was not found.', { name: moduleName });
      panel.append(notice);
      return;
    }
    const handled = renderModule(module.name, panel, {
      auth,
      module,
      payload: doc.payload,
      editor,
      settings,
      hideHeader: hideModuleHeader,
      autoLoadLatestConversation,
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
      placeholder.textContent = adminText("modules.noRenderer", "{name} module is available but has no renderer yet.", {
        name: module.name
      });
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
          <div class="app-module-row-meta">${adminText("modules.io", "Input: {input} \xB7 Output: {output}", {
      input: module.input,
      output: module.output
    })}</div>
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
              aria-label="${adminText("common.openSettings", "Open settings")}"
              title="${adminText("common.openSettings", "Open settings")}"
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
        <h2 class="title is-5">${adminText("common.settings", "Settings")}</h2>
        <p class="app-muted">${adminText("modules.settingsHelp", "Edit per-page or per-section module settings saved in manage/store/modules.")}</p>
      </div>
      ${settingsDocs.length ? `<div class="app-module-list">${settingsList}</div>` : `<div class="notification is-light">${adminText("modules.noSettings", "No module settings found yet.")}</div>`}
    </div>
  `;
  content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${adminText("modules.title", "Modules")}</h1>
        <p class="app-muted">${adminText("modules.subtitle", "Available modules loaded from manage/src/Modules.")}</p>
      </div>
      <div class="app-view-actions">
        <button
          id="module-settings-toggle"
          class="button app-button app-ghost app-icon-button"
          aria-label="${adminText("modules.settings", "Module settings")}"
          title="${adminText("modules.settings", "Module settings")}"
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
    ${modules.length ? `<div class="app-module-list">${list}</div>` : `<div class="notification is-light">${adminText("modules.none", "No modules found.")}</div>`}
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
init_translations();
var escapeHtml2 = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
var formatTimestamp = (value) => {
  if (!value) {
    return adminText("common.unknownTime", "Unknown time");
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
    return `<option value="${form.id}" ${selected}>${escapeHtml2(label)}${escapeHtml2(source)}</option>`;
  }).join("");
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
var renderEntries = (doc, target) => {
  const data = doc.payload.data;
  const entries = Array.isArray(data?.entries) ? data?.entries : [];
  if (!entries.length) {
    target.innerHTML = `<div class="notification is-light">${adminText("forms.noEntries", "No entries yet.")}</div>`;
    return;
  }
  const list = entries.map((entry) => {
    if (!entry || typeof entry !== "object") {
      return "";
    }
    const record = entry;
    const submittedAt = formatTimestamp(record.submittedAt);
    const actor = record.actor && typeof record.actor === "object" ? record.actor : null;
    const actorLabel = actor ? `${actor.sub ?? ""}${actor.role ? ` \xB7 ${actor.role}` : ""}`.trim() : adminText("forms.anonymous", "anonymous");
    const payload = record.data ?? {};
    const payloadJson = escapeHtml2(JSON.stringify(payload, null, 2));
    return `
        <article class="app-form-entry app-surface">
          <div class="app-form-entry-header">
            <div>
              <span class="app-form-entry-label">${adminText("forms.submitted", "Submitted")}</span>
              <span class="app-form-entry-value">${escapeHtml2(submittedAt)}</span>
            </div>
            <div>
              <span class="app-form-entry-label">${adminText("forms.actor", "Actor")}</span>
              <span class="app-form-entry-value">${escapeHtml2(actorLabel || adminText("forms.anonymous", "anonymous"))}</span>
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
  const select = document.getElementById("forms-select");
  const loadSelected = async (id) => {
    if (!entriesTarget || !auth) {
      return;
    }
    entriesTarget.innerHTML = `<div class="notification is-light">${adminText("forms.loadingEntries", "Loading entries...")}</div>`;
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
init_translations();
var isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var clone2 = (value) => JSON.parse(JSON.stringify(value));
var buildJsonEditor = (container, initialValue) => {
  let data = clone2(initialValue ?? {});
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
    button.textContent = adminText("jsonEditor.remove", "Remove");
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
    summaryLabel.textContent = adminText("jsonEditor.objectSummary", "{name} \xB7 {count} fields", {
      name: String(key ?? "object"),
      count: Object.keys(obj).length
    });
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
    summaryLabel.textContent = adminText("jsonEditor.arraySummary", "{name} \xB7 {count} items", {
      name: String(key ?? "array"),
      count: arr.length
    });
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
    addBtn.textContent = adminText("jsonEditor.addItem", "Add item");
    addBtn.addEventListener("click", () => {
      if (arr.length > 0) {
        arr.push(clone2(arr[0]));
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
    getValue: () => clone2(data),
    setValue: (value) => {
      data = clone2(value ?? {});
      rerender();
    }
  };
};

// web/src/features/modules/settings-form.ts
init_translations();
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
var setValueAtPath2 = (target, path, value) => {
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
      emptyOption.textContent = agents.length ? adminText("agents.selectAgent", "Select agent") : adminText("agents.noAgentsAvailable", "No agents available");
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
      help.textContent = adminText("common.commaSeparated", "Comma separated values.");
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
    empty.textContent = adminText("modules.noSettingsAvailable", "No module settings available.");
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
      setValueAtPath2(output, field.path, value);
    });
    return output;
  };
  return { getValue };
};

// web/src/views/documents.ts
init_translations();
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
        <span class="app-doc-meta-label">${adminText("documents.id", "ID")}</span>
        <code class="app-doc-meta-value">${pageId}</code>
        <button class="app-doc-meta-copy" type="button" aria-label="${adminText("documents.copyId", "Copy ID")}" data-copy-doc-id="${pageId}">
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
        <label class="label">${adminText("documents.language", "Language")}</label>
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
        <p class="app-muted">${adminText("documents.moduleSettingsMeta", "Module settings")} \xB7 ${doc.store}/${doc.path}</p>
        ${idMeta}
        ${languageMeta}
      </div>
      <div class="mb-4 buttons">
        ${returnToDocumentId ? `<button id="module-back" class="button app-button app-ghost">${adminText("common.back", "Back")}</button>` : ""}
        <button id="save" class="button app-button app-primary">${adminText("common.save", "Save")}</button>
        <button id="export-json" class="button app-button app-ghost">${adminText("documents.exportJson", "Export JSON")}</button>
      </div>
      <div class="mt-4">
        <h2 class="title is-5">${adminText("common.settings", "Settings")}</h2>
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
      ${isConfigurationPage ? `<div class="notification is-light app-muted">${adminText("documents.fixedAdminPath", "The admin path is fixed at <strong>/upmin/</strong>.")}</div>` : ""}
      <div class="mb-4 buttons">
        <button id="save" class="button app-button app-primary">${adminText("common.save", "Save")}</button>
        <button id="export-json" class="button app-button app-ghost">${adminText("documents.exportJson", "Export JSON")}</button>
      </div>
      <div class="mt-4">
        <div id="module-panel" class="mb-4"></div>
        <h2 class="title is-5">${adminText("documents.data", "Data")}</h2>
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
      <button id="save" class="button app-button app-primary">${adminText("common.save", "Save")}</button>
      <button id="export-json" class="button app-button app-ghost">${adminText("documents.exportJson", "Export JSON")}</button>
    </div>
    <div class="columns is-variable is-4 is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.order", "Order")}</label>
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
          <label class="label">${adminText("documents.page", "Page")}</label>
          <div class="control">
            <input id="field-page" class="input" type="text" value="${payload.page}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.name", "Name")}</label>
          <div class="control">
            <input id="field-name" class="input" type="text" value="${payload.name}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.language", "Language")}</label>
          <div class="control">
            <input id="field-language" class="input" type="text" value="${payload.language ?? ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.modules", "Modules")}</label>
          <div class="control">
            <div id="field-modules" class="app-module-picker">
              ${moduleChecklistHtml2(selectedModules)}
            </div>
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("documents.section", "Section")}</label>
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
      <h2 class="title is-5">${adminText("documents.data", "Data")}</h2>
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
      alert(adminText("documents.orderRequired", "Order is required."));
      return;
    }
    const parsedOrder = Number(orderRaw);
    if (!Number.isInteger(parsedOrder)) {
      alert(adminText("documents.orderInteger", "Order must be an integer."));
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
      position_view: payload.position_view,
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
init_translations();
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
    throw new Error(adminText("auth.required", "Authentication required."));
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
init_translations();
var timestampFormatter = new Intl.DateTimeFormat(void 0, {
  dateStyle: "medium",
  timeStyle: "short"
});
var escapeHtml3 = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var reasonLabel = (reason) => {
  if (reason === "before-clear") {
    return adminText("creations.reason.beforeClear", "Pre-clear snapshot");
  }
  return adminText("creations.reason.manual", "Manual snapshot");
};
var targetLabel = (target) => target === "build" ? adminText("creations.target.build", "Build") : adminText("creations.target.public", "Public");
var formatTimestamp2 = (value) => {
  if (!value) {
    return adminText("common.unknownTime", "Unknown time");
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
      <img alt="${escapeHtml3(creation.id)}" loading="lazy" />
    </div>
    <div class="app-creation-copy">
      <div class="app-creation-copy-top">
        <span class="app-creation-badge">${escapeHtml3(`${targetLabel(creation.target)} \xB7 ${reasonLabel(creation.reason)}`)}</span>
        <span class="app-creation-date">${escapeHtml3(formatTimestamp2(creation.createdAt))}</span>
      </div>
      <h2 class="app-creation-title">${escapeHtml3(creation.id)}</h2>
      <div class="app-creation-paths">
        <div>
          <span class="app-creation-label">${adminText("creations.backup", "Backup")}</span>
          <code>manage/store/${escapeHtml3(creation.backupPath)}</code>
        </div>
        <div>
          <span class="app-creation-label">${adminText("creations.preview", "Preview")}</span>
          <code>manage/store/${escapeHtml3(creation.snapshotPath)}</code>
        </div>
      </div>
    </div>
    <div class="app-creation-actions">
      <button data-action="download" class="button app-button app-primary">${adminText("common.download", "Download")}</button>
      <button data-action="restore" class="button app-button app-ghost">${adminText("common.restore", "Restore")}</button>
      <button data-action="delete" class="button app-button app-danger">${adminText("common.delete", "Delete")}</button>
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
          <p class="app-creations-kicker">${adminText("documents.systemPage", "System page")}</p>
          <h1 class="title is-4">${escapeHtml3(doc.payload.name)}</h1>
          <p class="app-muted app-creations-subtitle">
            ${adminText("creations.subtitle", "Capture visual snapshots of the public website and store a restorable tar.gz backup of the website files.")}
          </p>
        </div>
        <div class="app-creations-stats">
          <div>
            <span class="app-creations-stat-value">${creations.length}</span>
            <span class="app-creations-stat-label">${adminText("creations.snapshots", "Snapshots")}</span>
          </div>
          <div>
            <span class="app-creations-stat-value">${escapeHtml3(doc.store)}</span>
            <span class="app-creations-stat-label">${adminText("documents.store", "Store")}</span>
          </div>
        </div>
      </div>
      <div class="app-creations-toolbar">
        <div class="buttons">
          <button id="creation-snapshot" class="button app-button app-primary">${adminText("creations.getSnapshot", "Get Snapshot")}</button>
          <button id="creation-clear" class="button app-button app-danger">${adminText("creations.clearAll", "Clear All")}</button>
          <button id="creation-export" class="button app-button app-ghost">${adminText("documents.exportJson", "Export JSON")}</button>
        </div>
        <p class="app-muted app-creations-note">
          ${adminText("creations.note", "Public snapshots restore to the public site. Build snapshots restore to the build directory.")}
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
        <h2 class="title is-5">${adminText("creations.none", "No snapshots yet")}</h2>
        <p class="app-muted">${adminText("creations.noneHelp", "Use Get Snapshot to capture the current public website and save its backup archive.")}</p>
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
        void runButtonAction(downloadButton, adminText("common.downloading", "Downloading..."), () => onDownload(creation.id));
      });
      restoreButton?.addEventListener("click", () => {
        if (!window.confirm(adminText("creations.confirmRestore", "Restore {id}? This will clean the public website first.", { id: creation.id }))) {
          return;
        }
        void runButtonAction(restoreButton, adminText("common.restoring", "Restoring..."), () => onRestore(creation.id));
      });
      deleteButton?.addEventListener("click", () => {
        if (!window.confirm(adminText("creations.confirmDelete", "Delete {id}? This removes the preview and backup archive.", { id: creation.id }))) {
          return;
        }
        void runButtonAction(deleteButton, adminText("common.deleting", "Deleting..."), () => onDelete(creation.id));
      });
      grid.append(card);
    });
  }
  const snapshotButton = document.getElementById("creation-snapshot");
  const clearButton = document.getElementById("creation-clear");
  const exportButton = document.getElementById("creation-export");
  snapshotButton?.addEventListener("click", () => {
    void runButtonAction(snapshotButton, adminText("creations.capturing", "Capturing..."), onSnapshot);
  });
  clearButton?.addEventListener("click", () => {
    if (!window.confirm(adminText("creations.confirmClear", "Clear the public website? A fresh snapshot will be created first."))) {
      return;
    }
    void runButtonAction(clearButton, adminText("common.clearing", "Clearing..."), onClearAll);
  });
  exportButton?.addEventListener("click", () => {
    void runButtonAction(exportButton, adminText("common.preparing", "Preparing..."), onExportJson);
  });
};

// web/src/features/creations/capture.ts
init_translations();
var CAPTURE_WIDTH = 1440;
var CAPTURE_HEIGHT = 900;
var CAPTURE_TIMEOUT_MS = 15e3;
var wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
var loadIframe = (iframe) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => {
    cleanup();
    reject(new Error(adminText("creations.snapshotTimedOut", "Snapshot timed out while loading the website.")));
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
      reject(new Error(adminText("creations.snapshotUnavailable", "Snapshot failed because the website document is unavailable.")));
      return;
    }
    resolve(doc);
  };
  const handleError = () => {
    cleanup();
    reject(new Error(adminText("creations.snapshotLoadFailed", "Snapshot failed while loading the website.")));
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
    const clone3 = clonedCanvases[index];
    if (!clone3) {
      return;
    }
    try {
      const image = sourceDoc.createElement("img");
      image.setAttribute("src", canvas.toDataURL("image/png"));
      image.setAttribute("alt", "");
      clone3.replaceWith(image);
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
      img.addEventListener(
        "error",
        () => reject(new Error(adminText("creations.snapshotImageFailed", "Snapshot image could not be rendered."))),
        { once: true }
      );
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(adminText("creations.snapshotUnsupported", "Snapshot capture is not supported in this browser."));
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    context.drawImage(image, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    try {
      return canvas.toDataURL("image/png");
    } catch {
      throw new Error(
        adminText(
          "creations.snapshotBlockedAssets",
          "Snapshot capture failed because the website uses blocked external assets."
        )
      );
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
init_translations();
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
        throw new Error(adminText("auth.unauthorized", "Unauthorized"));
      }
      const result = await fetchCreationSnapshotImage(auth, id);
      return URL.createObjectURL(result.blob);
    }
  });
};

// web/src/features/website-build/controller.ts
init_api();

// web/src/views/website-build.ts
init_translations();
var escapeHtml4 = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var actionIcon = (name) => {
  if (name === "visit") {
    return `
      <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
        <path d="M14 5h5v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M10 14 19 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
  }
  if (name === "copy") {
    return `
      <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
        <path d="M8 7h8a2 2 0 0 1 2 2v8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M8 17H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M10 11h10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
        <path d="m17 8 3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
  }
  if (name === "publish") {
    return `
      <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
        <path d="M12 16V5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
        <path d="m8 9 4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M5 17v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
      <path d="M4 17h11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
      <path d="m14 6 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
      <path d="m12 8 4 4-6.5 6.5H5v-4.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
};
var actionButton = (id, label, icon, tooltip, extraClass = "") => {
  const className = ["button app-button app-ghost app-build-action", extraClass].filter(Boolean).join(" ");
  return `
  <button
    id="${id}"
    class="${className}"
    type="button"
    data-busy-label="${escapeHtml4(label)}..."
    data-tooltip="${escapeHtml4(tooltip)}"
    aria-label="${escapeHtml4(tooltip)}"
    title="${escapeHtml4(tooltip)}"
  >
    <span class="app-build-action-icon" aria-hidden="true">${actionIcon(icon)}</span>
    <span class="app-build-action-label">${escapeHtml4(label)}</span>
  </button>
`;
};
var runButtonAction2 = async (button, pendingLabel, action) => {
  const label = button.querySelector(".app-build-action-label");
  const originalLabel = label?.textContent ?? pendingLabel;
  button.disabled = true;
  button.classList.add("is-busy");
  if (label) {
    label.textContent = pendingLabel;
  } else {
    button.textContent = pendingLabel;
  }
  try {
    await action();
  } finally {
    button.disabled = false;
    button.classList.remove("is-busy");
    if (label) {
      label.textContent = originalLabel;
    } else {
      button.textContent = originalLabel;
    }
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
        <div class="app-build-heading">
          <p class="app-build-kicker app-muted">${adminText("documents.systemPage", "System page")}</p>
          <h1 class="title is-4">${escapeHtml4(doc.payload.name)}</h1>
        </div>
        <div class="app-build-actions" role="toolbar" aria-label="${adminText("websiteBuild.actions", "Website build actions")}">
          ${actionButton("build-visit", adminText("common.visit", "Visit"), "visit", adminText("websiteBuild.visitHelp", "Open the current generated build in a new tab."))}
          ${actionButton(
    "build-copy-public",
    adminText("websiteBuild.copyFromPublic", "Copy from public"),
    "copy",
    adminText("websiteBuild.copyFromPublicHelp", "Import the current public website into the build workspace.")
  )}
          ${actionButton(
    "build-publish",
    adminText("common.publish", "Publish"),
    "publish",
    adminText("websiteBuild.publishHelp", "Replace the public website with the current build output.")
  )}
          ${actionButton(
    "build-clean",
    adminText("common.clean", "Clean"),
    "clean",
    adminText("websiteBuild.cleanHelp", "Remove the current build output after creating a safety snapshot."),
    "app-build-action-danger"
  )}
        </div>
      </div>
      <div class="tabs is-toggle is-small app-build-tabs">
        <ul>
          <li class="is-active"><a data-build-tab="chat">${adminText("websiteBuild.chat", "Chat")}</a></li>
          <li><a data-build-tab="preview">${adminText("creations.preview", "Preview")}</a></li>
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
                <div id="build-preview-title" class="app-build-preview-title">${getConversationProgressTitle()}</div>
                <div id="build-preview-reasoning" class="app-build-preview-reasoning">${adminText("websiteBuild.waiting", "Waiting for updates...")}</div>
              </div>
            </div>
            <div id="build-preview-frame" class="app-build-preview-frame">
              <iframe id="build-preview-iframe" title="${adminText("websiteBuild.previewFrame", "Build preview")}"></iframe>
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
    void runButtonAction2(copyFromPublicButton, adminText("websiteBuild.copying", "Copying..."), onCopyFromPublic);
  });
  publishButton?.addEventListener("click", () => {
    if (!publishButton) {
      return;
    }
    void runButtonAction2(publishButton, adminText("websiteBuild.publishing", "Publishing..."), onPublish);
  });
  cleanButton?.addEventListener("click", () => {
    if (!cleanButton) {
      return;
    }
    void runButtonAction2(cleanButton, adminText("common.cleaning", "Cleaning..."), onClean);
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
init_translations();
var isWebsiteBuildDocument = (doc) => doc.store === "private" && doc.path === "website-build.json";
var disposeProgressListener = null;
var renderWebsiteBuildPage = ({
  content,
  auth,
  doc,
  renderModulePanel: renderModulePanel2,
  confirmAction
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
        const confirmed = await confirmAction({
          title: adminText("websiteBuild.publishBuild", "Publish build"),
          message: adminText(
            "websiteBuild.confirmPublish",
            "Publish will replace the public website with the current build output. This operation cannot be undone. Make sure you already have a snapshot of the latest public website before proceeding."
          ),
          confirmLabel: adminText("websiteBuild.publishWebsite", "Publish website"),
          confirmClassName: "button app-button app-primary"
        });
        if (!confirmed) {
          return;
        }
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
        const confirmed = await confirmAction({
          title: adminText("websiteBuild.cleanBuild", "Clean build"),
          message: adminText(
            "websiteBuild.confirmClean",
            "Clean will remove the current build output after capturing a safety snapshot. This operation cannot be undone. Make sure you already have a snapshot of the latest public website before proceeding."
          ),
          confirmLabel: adminText("websiteBuild.cleanBuild", "Clean build"),
          confirmClassName: "button app-button app-danger"
        });
        if (!confirmed) {
          return;
        }
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
        const confirmed = await confirmAction({
          title: adminText("websiteBuild.copyFromPublic", "Copy from public"),
          message: adminText(
            "websiteBuild.confirmCopyFromPublic",
            "Copy from public will import the current public website into the build workspace before you continue editing. This operation cannot be undone. Make sure you already have a snapshot of the latest public website before proceeding."
          ),
          confirmLabel: adminText("websiteBuild.copyWebsite", "Copy website"),
          confirmClassName: "button app-button app-primary"
        });
        if (!confirmed) {
          return;
        }
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
  const previewTitle = document.getElementById("build-preview-title");
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
  const setPreviewPending = (pending, progress, agentName) => {
    if (previewLoading) {
      previewLoading.classList.toggle("is-hidden", !pending);
    }
    if (previewTitle) {
      previewTitle.textContent = getConversationProgressTitle(agentName);
    }
    if (previewFrameWrap) {
      previewFrameWrap.classList.toggle("is-hidden", pending);
    }
    if (previewReasoning) {
      const latestItem = progress?.items?.[progress.items.length - 1]?.message;
      const message = progress?.status || latestItem || adminText("chat.progress.working", "Working...");
      previewReasoning.textContent = pending ? message : adminText("common.ready", "Ready.");
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
    setPreviewPending(Boolean(detail.pending), detail.progress ?? null, detail.agentName ?? null);
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
init_translations();
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
      label: normalizeLanguageValue(variant.language) ?? adminText("documents.defaultLanguage", "default")
    }))
  } : null;
  if (isWebsiteBuild) {
    clearAgentState();
    editorRef.set(null);
    renderWebsiteBuildPage({
      content,
      auth: state.auth,
      doc,
      confirmAction: (options) => state.openConfirmModalHandler?.(options) ?? Promise.resolve(false),
      renderModulePanel: (moduleDoc) => renderModulePanel({
        auth: state.auth,
        doc: moduleDoc,
        editor: null,
        hideModuleHeader: true,
        autoLoadLatestConversation: true,
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
      autoLoadLatestConversation: true,
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
init_translations();
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
        suffix
      }));
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
init_translations();
var renderMessages2 = (conversation, assistantLabel) => {
  const messagesContainer = document.getElementById("agent-chat-messages");
  if (!messagesContainer) {
    return;
  }
  if (!conversation) {
    messagesContainer.innerHTML = `<p class="app-muted">${adminText("agents.startConversation", "Start a conversation with your next message.")}</p>`;
    return;
  }
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const messages = Array.isArray(payloadData.messages) ? payloadData.messages : [];
  if (!messages.length) {
    messagesContainer.innerHTML = `<p class="app-muted">${adminText("chat.noMessages", "No messages yet.")}</p>`;
    return;
  }
  messagesContainer.innerHTML = messages.map((message) => {
    const record = isRecord(message) ? message : {};
    const role = typeof record.role === "string" ? record.role : "user";
    const content = typeof record.content === "string" ? record.content : "";
    const label = role === "assistant" ? assistantLabel?.trim() || adminText("agents.agent", "Agent") : adminText("chat.you", "You");
    const roleClass = role === "assistant" ? "is-assistant" : "is-user";
    return `
        <div class="app-chat-message ${roleClass}">
          <div class="app-chat-message-role">${label}</div>
          <div class="app-chat-message-content">${content}</div>
        </div>
      `;
  }).join("");
  appendConversationProgress(messagesContainer, getConversationProgress(conversation), assistantLabel);
};
var updateConversationHeader2 = (conversation) => {
  const title = document.getElementById("agent-chat-title");
  const meta = document.getElementById("agent-chat-meta");
  if (!title || !meta) {
    return;
  }
  if (!conversation) {
    title.textContent = adminText("chat.noneSelected", "No conversation selected");
    meta.textContent = adminText("chat.selectOrCreate", "Select or create a conversation.");
    return;
  }
  const payloadData = isRecord(conversation.payload.data) ? conversation.payload.data : {};
  const createdAt = typeof payloadData.createdAt === "string" ? payloadData.createdAt : "";
  title.textContent = conversation.payload.name || adminText("chat.conversation", "Conversation");
  meta.textContent = createdAt ? adminText("chat.startedAt", "Started {time}", { time: createdAt }) : adminText("chat.loaded", "Conversation loaded.");
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
    list.innerHTML = `<p class="app-muted">${adminText("chat.noConversations", "No conversations yet.")}</p>`;
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
init_translations();
var renderAgentLayout = (agentDoc, systemPrompt, adminPrompt) => `
  <div class="mb-4">
    <h1 class="title is-4">${agentDoc.payload.name}</h1>
    <p class="app-muted">${adminText("agents.agentMeta", "Agent")} \xB7 ${agentDoc.store}/${agentDoc.path}</p>
  </div>
  <div class="columns is-variable is-4">
    <div class="column is-one-third">
      <div class="app-panel">
        <div class="mb-3">
          <h2 class="title is-6">${adminText("common.settings", "Settings")}</h2>
          <p class="app-muted">${adminText("agents.settingsHelp", "Provider, model, and prompts.")}</p>
        </div>
        <div class="field">
          <label class="label">${adminText("documents.name", "Name")}</label>
          <div class="control">
            <input id="agent-edit-name" class="input" type="text" value="${agentDoc.payload.name}" />
          </div>
        </div>
        <div class="field">
          <label class="label">${adminText("agents.provider", "Provider")}</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select id="agent-edit-provider"></select>
            </div>
          </div>
          <p id="agent-edit-provider-help" class="help app-muted"></p>
        </div>
        <div class="field">
          <label class="label">${adminText("agents.model", "Model")}</label>
          <div class="control">
            <input
              id="agent-edit-model-search"
              class="input"
              type="search"
              placeholder="${adminText("agents.searchModels", "Search models")}"
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
          <label class="label">${adminText("agents.systemPrompt", "System prompt")}</label>
          <div class="control">
            <textarea id="agent-edit-system" class="textarea" rows="3">${systemPrompt}</textarea>
          </div>
        </div>
        <div class="field">
          <label class="label">${adminText("agents.adminPrompt", "Admin prompt")}</label>
          <div class="control">
            <textarea id="agent-edit-admin" class="textarea" rows="3">${adminPrompt}</textarea>
          </div>
        </div>
        <div class="buttons">
          <button id="agent-save" class="button app-button app-primary">${adminText("common.save", "Save")}</button>
        </div>
      </div>
      <div class="app-panel mt-4">
        <div class="app-panel-header">
          <div>
            <h2 class="title is-6 mb-1">${adminText("agents.conversations", "Conversations")}</h2>
            <p class="app-muted">${adminText("agents.conversationsHelp", "Reuse context or start fresh.")}</p>
          </div>
          <button id="agent-new-conversation" class="button app-button app-ghost">${adminText("common.new", "New")}</button>
        </div>
        <div id="agent-conversation-list" class="app-conversation-list"></div>
      </div>
    </div>
    <div class="column">
      <div class="app-panel app-chat">
        <div class="app-chat-header">
          <div>
            <div id="agent-chat-title" class="app-chat-title">${adminText("chat.noneSelected", "No conversation selected")}</div>
            <div id="agent-chat-meta" class="app-chat-meta app-muted">${adminText("agents.nextMessageStartsConversation", "Your next message starts a new conversation.")}</div>
          </div>
        </div>
        <div id="agent-chat-messages" class="app-chat-messages"></div>
        <div class="app-chat-input">
          <form id="agent-chat-form">
            <div class="field">
              <div class="control">
                <textarea id="agent-chat-text" class="textarea" rows="2" placeholder="${adminText("chat.writeMessage", "Write a message")}" disabled></textarea>
              </div>
            </div>
            <div class="buttons">
              <button id="agent-chat-send" class="button app-button app-primary" disabled>${adminText("chat.send", "Send")}</button>
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
init_translations();
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
  const agentName = agentDoc.payload.name || adminText("agents.agent", "Agent");
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
      void loadConversation2(id);
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
      void loadConversation2(state.currentConversation.id);
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
    renderMessages2(conversation, agentName);
    renderConversations();
    const pending = conversationHasPendingResponse(conversation);
    const progress = getConversationProgress(conversation);
    updateChatInputState2(!!auth && !!state.currentAgent && !pending);
    if (!conversation && chatMeta) {
      chatMeta.textContent = adminText("agents.nextMessageStartsConversation", "Your next message starts a new conversation.");
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
  const loadConversation2 = async (conversationId) => {
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
      pushNotice("error", adminText("agents.allFieldsRequired", "All agent fields are required."));
      return;
    }
    if (providerSelect?.disabled || modelSelect?.disabled) {
      pushNotice("error", adminText("agents.enableIntegrationFirst", "Enable an integration and sync models first."));
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
          adminText("agents.replyFailed", "Something went wrong while I was replying: {message}", {
            message: err.message || adminText("common.tryAgain", "Please try again.")
          })
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
init_translations();
var systemUpdatePollHandle = null;
var showLogin = (app) => {
  renderLogin({
    container: app,
    onAuth: (next) => {
      state.auth = next;
    },
    onSuccess: renderApp,
    onClearAgentState: clearAgentState
  });
};
var stopSystemUpdatePolling = () => {
  if (systemUpdatePollHandle !== null) {
    window.clearTimeout(systemUpdatePollHandle);
    systemUpdatePollHandle = null;
  }
};
var scheduleSystemUpdatePolling = () => {
  stopSystemUpdatePolling();
  systemUpdatePollHandle = window.setTimeout(() => {
    void refreshSystemUpdateStatus(true);
  }, 2500);
};
var refreshSystemUpdateStatus = async (pollIfRunning = false) => {
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
    pushNotice("error", err.message);
    return null;
  }
};
var startSystemUpdate = async () => {
  if (!state.auth) {
    return;
  }
  state.systemUpdate = {
    ...state.systemUpdate ?? {
      currentVersion: null,
      latestVersion: null,
      updateAvailable: false
    },
    status: "running",
    locked: true,
    message: adminText("systemUpdate.starting", "Starting admin update."),
    error: null
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
    pushNotice("error", err.message);
  }
};
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
  await openPrivateDocument("website-build.json", adminText("documents.websiteBuildNotFound", "Website Builder page not found."));
};
var openPrivateDocument = async (path, errorMessage) => {
  const page = state.navigationPages.find((entry) => entry.store === "private" && entry.path === path && entry.documentId);
  if (!page?.documentId) {
    pushNotice("error", errorMessage);
    return;
  }
  await loadDocument(page.documentId);
};
var openCreationsPage = async () => {
  await openPrivateDocument("creations.json", adminText("documents.creationsNotFound", "Creations page not found."));
};
var renderApp = async () => {
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
    renderAppShell({ moduleChecklistHtml: (selected) => moduleChecklistHtml(state.modules, selected) });
    initNotifications();
    renderSystemUpdateControls();
    return;
  }
  await loadUiConfig();
  await loadLayoutConfig();
  await loadModules();
  await preloadAdminLanguage();
  renderAppShell({ moduleChecklistHtml: (selected) => moduleChecklistHtml(state.modules, selected) });
  initNotifications();
  renderSystemUpdateControls();
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
    }
  });
  await loadIntegrations({
    onAfterLoad: refreshIntegrationControls
  });
  await reloadAgents();
  await refreshNavigation(loadDocument);
};
var bootstrap = () => {
  initTheme();
  window.addEventListener("app:session-expired", (event) => {
    const app = document.getElementById("app");
    if (!app) {
      return;
    }
    stopRealtime();
    state.auth = null;
    const detail = event.detail;
    showLogin(app);
    pushNotice("error", detail?.message || adminText("auth.sessionExpired", "Your session expired. Please log in again."));
  });
  window.addEventListener("app:system-update-locked", () => {
    void refreshSystemUpdateStatus(true);
  });
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

// web/src/main.ts
bootstrap();
//# sourceMappingURL=app.js.map
