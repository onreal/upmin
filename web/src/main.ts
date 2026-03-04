import {
  fetchDocument,
  fetchLayoutConfig,
  fetchModules,
  fetchNavigation,
  fetchUiConfig,
  createDocument,
  downloadArchive,
  downloadDocument,
  loginWithApiKey,
  loginWithPassword,
  loadAuth,
  saveAuth,
  updateDocument,
  type AuthState,
  type AuthUser,
  type DocumentPayload,
  type LayoutConfig,
  type ModuleDefinition,
  type NavigationPage,
  type RemoteDocument,
  type UiConfig,
} from "./api";
import { renderModule } from "./modules/registry";
import { legacyModuleSettingsKey, moduleSettingsKey } from "./modules/utils";
import { describeStorage } from "./modules/uploader/utils";
import { buildJsonEditor, type JsonEditorHandle } from "./json-editor";

const app = document.getElementById("app");

if (!app) {
  throw new Error("Missing app container");
}

let auth: AuthState = loadAuth();
let currentDocument: RemoteDocument | null = null;
let editor: JsonEditorHandle | null = null;
let authDocumentId: string | null = null;
let layoutConfig: LayoutConfig = {};
let modules: ModuleDefinition[] = [];
let navigationPages: NavigationPage[] = [];
const moduleSettingsCache = new Map<string, Record<string, unknown> | null>();

type EditableUser = AuthUser & { uuid?: string; password?: string } & Record<string, unknown>;
type AuthData = { users: EditableUser[] } & Record<string, unknown>;
type TokenAuth = { type: "token"; value: string; user?: AuthUser };

const THEME_KEY = "manage_theme";
const tokenRegistry = [
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
  "app-danger",
];

const normalizeModuleList = (modulesValue?: string[] | null, fallback?: string | null) => {
  const list = Array.isArray(modulesValue) ? modulesValue : [];
  if (fallback && !list.includes(fallback)) {
    list.push(fallback);
  }
  return list
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .filter((entry, index, self) => self.indexOf(entry) === index);
};

const moduleChecklistHtml = (selected: string[] = []) => {
  if (!modules.length) {
    return `<p class="help">No modules available.</p>`;
  }
  const selectedSet = new Set(selected);
  return modules
    .map((module) => {
      const isChecked = selectedSet.has(module.name);
      const description = module.description ? `<span class="app-module-option-meta">${module.description}</span>` : "";
      return `
        <label class="checkbox app-module-option">
          <input type="checkbox" value="${module.name}" ${isChecked ? "checked" : ""} />
          <span class="app-module-option-label">${module.name}</span>
          ${description}
        </label>
      `;
    })
    .join("");
};

const readSelectedModules = (container: HTMLElement | null) => {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll<HTMLInputElement>("input[type='checkbox']"))
    .filter((input) => input.checked)
    .map((input) => input.value.trim())
    .filter((value) => value !== "");
};

const findModuleDefinition = (name: string | null | undefined) =>
  modules.find((module) => module.name === name) ?? null;

const uiTokens: { light: Record<string, string>; dark: Record<string, string> } = {
  light: {},
  dark: {},
};

const getStoredTheme = (): "light" | "dark" | null => {
  const value = localStorage.getItem(THEME_KEY);
  return value === "dark" || value === "light" ? value : null;
};

let currentTheme: "light" | "dark" = getStoredTheme() ?? "light";

const applyTokensForTheme = (theme: "light" | "dark") => {
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

const setTheme = (theme: "light" | "dark", persist = true) => {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  applyTokensForTheme(theme);
  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const encodeDocumentId = (store: string, path: string) => {
  const raw = `${store}:${path}`;
  const encoded = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return encoded;
};

const fetchModuleSettings = async (moduleName: string, payload: DocumentPayload) => {
  if (!auth) {
    return null;
  }
  const key = moduleSettingsKey(payload, moduleName);
  if (moduleSettingsCache.has(key)) {
    return moduleSettingsCache.get(key) ?? null;
  }
  const path = `modules/${key}.json`;
  const id = encodeDocumentId("private", path);
  try {
    const doc = await fetchDocument(auth, id);
    const settings = isRecord(doc.payload.data) ? doc.payload.data : null;
    moduleSettingsCache.set(key, settings);
    return settings;
  } catch {
    if (!payload.section) {
      const legacyKey = legacyModuleSettingsKey(moduleName);
      if (legacyKey) {
        const legacyPath = `modules/${legacyKey}.json`;
        const legacyId = encodeDocumentId("private", legacyPath);
        try {
          const legacyDoc = await fetchDocument(auth, legacyId);
          const legacySettings = isRecord(legacyDoc.payload.data) ? legacyDoc.payload.data : null;
          moduleSettingsCache.set(key, legacySettings);
          return legacySettings;
        } catch {
          // fall through
        }
      }
    }
    moduleSettingsCache.set(key, null);
    return null;
  }
};

const applyUiConfig = (config: UiConfig) => {
  const normalize = (input?: Record<string, string>) => {
    const output: Record<string, string> = {};
    if (!input) return output;
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

setTheme(currentTheme, false);

const getUserLabel = () => {
  if (isTokenAuth(auth) && auth.user) {
    const name = `${auth.user.firstname} ${auth.user.lastname}`.trim();
    return name || auth.user.email;
  }
  if (auth?.type === "apiKey") {
    return "API Key";
  }
  return "Guest";
};

const headerCopy = () => ({
  title: layoutConfig.header?.title ?? "Manage",
  subtitle: layoutConfig.header?.subtitle ?? "Stateless Admin",
  settingsLabel: layoutConfig.header?.settingsLabel ?? "Settings",
  themeLabel: layoutConfig.header?.themeLabel ?? "Theme",
  createLabel: layoutConfig.header?.createLabel ?? "Create +",
  profileLabel: layoutConfig.header?.profileLabel ?? "Profile",
  logoutLabel: layoutConfig.header?.logoutLabel ?? "Logout",
});

const sidebarCopy = () => ({
  publicLabel: layoutConfig.sidebar?.publicLabel ?? "Public",
});

const profileCopy = () => ({
  title: layoutConfig.profile?.title ?? "Profile",
  subtitle: layoutConfig.profile?.subtitle ?? "Ενημερώστε τα στοιχεία σας.",
  saveLabel: layoutConfig.profile?.saveLabel ?? "Save Profile",
});

const isAuthData = (value: unknown): value is AuthData => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as { users?: unknown };
  if (!Array.isArray(record.users)) {
    return false;
  }
  return record.users.every((user) => user && typeof user === "object");
};

const isTokenAuth = (value: AuthState): value is TokenAuth => {
  return !!value && value.type === "token";
};

const renderLogin = (error?: string) => {
  app.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="box app-surface">
          <div class="mb-4">
            <h1 class="title is-4">Admin Login</h1>
            <p class="app-muted">Συνδεθείτε με API key ή email/password.</p>
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
                <button type="submit" class="button app-button app-primary">Σύνδεση με API Key</button>
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
                <button type="submit" class="button app-button app-primary">Σύνδεση χρήστη</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  const apiKeyForm = document.getElementById("api-key-form") as HTMLFormElement | null;
  const userForm = document.getElementById("user-form") as HTMLFormElement | null;

  apiKeyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(apiKeyForm);
    const apiKey = String(form.get("apiKey") || "");
    if (!apiKey) {
      return;
    }
    try {
      await loginWithApiKey(apiKey);
      auth = { type: "apiKey", value: apiKey };
      saveAuth(auth);
      await renderApp();
    } catch (err) {
      renderLogin((err as Error).message);
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
      auth = { type: "token", value: result.token, user: result.user };
      saveAuth(auth);
      await renderApp();
    } catch (err) {
      renderLogin((err as Error).message);
    }
  });
};

const renderAppShell = () => {
  const header = headerCopy();
  const sidebar = sidebarCopy();

  app.innerHTML = `
    <nav class="navbar app-surface is-spaced" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <a class="navbar-item">
          <span class="title is-5 mb-0">${header.title}</span>
        </a>
        <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" data-target="adminNavbar">
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
              <button id="create-action" class="button app-button app-primary">
                <span class="icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" focusable="false" aria-hidden="true">
                    <path
                      d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </span>
                <span>${header.createLabel}</span>
              </button>
              <button
                id="export-zip-header"
                class="button app-button app-ghost"
                aria-label="Export all documents"
                title="Export all documents"
              >
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
              </button>
              <button
                id="theme-toggle"
                class="button app-button app-ghost"
                aria-label="${header.themeLabel}"
                title="${header.themeLabel}"
              >
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
              </button>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="private-dropdown">
            <a class="navbar-link">${header.settingsLabel}</a>
            <div class="navbar-dropdown">
              <div id="nav-private"></div>
              <hr class="navbar-divider" />
              <div class="navbar-item is-size-7 app-muted">Modules</div>
              <a class="navbar-item" id="modules-link">Modules</a>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="user-dropdown">
            <a class="navbar-link" id="user-label">${getUserLabel()}</a>
            <div class="navbar-dropdown">
              <a class="navbar-item" id="profile-link">${header.profileLabel}</a>
              <hr class="navbar-divider" />
              <a class="navbar-item" id="logout">${header.logoutLabel}</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <section class="section pt-4">
      <div class="container is-fluid">
        <div class="columns is-variable is-4">
          <aside class="column is-one-quarter">
            <div class="box app-surface">
              <aside class="menu">
                <p class="menu-label">${sidebar.publicLabel}</p>
                <ul id="nav-public" class="menu-list"></ul>
              </aside>
            </div>
          </aside>
          <div class="column">
            <div id="content" class="box app-surface">
              <p class="app-muted">Επιλέξτε μια ενότητα.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
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
                      ${moduleChecklistHtml()}
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
  `;

  const burger = document.querySelector(".navbar-burger") as HTMLElement | null;
  const menu = document.getElementById("adminNavbar");
  burger?.addEventListener("click", () => {
    burger.classList.toggle("is-active");
    menu?.classList.toggle("is-active");
  });

  const dropdowns = [
    document.getElementById("private-dropdown"),
    document.getElementById("user-dropdown"),
  ];

  dropdowns.forEach((dropdown) => {
    const link = dropdown?.querySelector(".navbar-link");
    link?.addEventListener("click", (event) => {
      event.preventDefault();
      dropdown?.classList.toggle("is-active");
    });
  });

  document.addEventListener("click", (event) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown || dropdown.contains(event.target as Node)) {
        return;
      }
      dropdown.classList.remove("is-active");
    });
  });

  document.getElementById("logout")?.addEventListener("click", () => {
    auth = null;
    saveAuth(null);
    renderLogin();
  });

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const next = currentTheme === "light" ? "dark" : "light";
    setTheme(next);
  });

  document.getElementById("profile-link")?.addEventListener("click", () => {
    void renderProfile();
  });

  document.getElementById("modules-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    renderModulesView();
    document.getElementById("private-dropdown")?.classList.remove("is-active");
  });

  document.getElementById("export-zip-header")?.addEventListener("click", async () => {
    if (!auth) {
      return;
    }
    try {
      const result = await downloadArchive(auth);
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
  });

  const createModal = document.getElementById("create-modal");
  const createError = document.getElementById("create-error");
  const createForm = document.getElementById("create-form") as HTMLFormElement | null;
  const createStoreInput = document.getElementById("create-store") as HTMLInputElement | null;
  const createStoreTabs = Array.from(
    createModal?.querySelectorAll<HTMLElement>("[data-store]") ?? []
  );

  const showCreateError = (message: string) => {
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

  const setCreateStore = (store: "public" | "private") => {
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
    const dataInput = document.getElementById("create-data") as HTMLTextAreaElement | null;
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

  document.getElementById("create-action")?.addEventListener("click", openCreateModal);
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
    if (!auth) {
      return;
    }

    clearCreateError();

    const path =
      (document.getElementById("create-path") as HTMLInputElement | null)?.value.trim() || "";
    const orderRaw =
      (document.getElementById("create-order") as HTMLInputElement | null)?.value.trim() || "";
    const page =
      (document.getElementById("create-page") as HTMLInputElement | null)?.value.trim() || "";
    const name =
      (document.getElementById("create-name") as HTMLInputElement | null)?.value.trim() || "";
    const language =
      (document.getElementById("create-language") as HTMLInputElement | null)?.value.trim() || "";
    const modulesValue = readSelectedModules(document.getElementById("create-modules"));
    const section =
      (document.getElementById("create-section") as HTMLSelectElement | null)?.value === "true";
    const storeValue =
      (document.getElementById("create-store") as HTMLInputElement | null)?.value === "private"
        ? "private"
        : "public";
    const dataRaw =
      (document.getElementById("create-data") as HTMLTextAreaElement | null)?.value.trim() || "";

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

    let data: unknown;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      showCreateError("Data must be valid JSON.");
      return;
    }

    const payloadToCreate: DocumentPayload = {
      page,
      name,
      language: language || undefined,
      order: orderValue,
      section,
      modules: modulesValue.length ? modulesValue : undefined,
      data,
    };

    try {
      const created = await createDocument(auth, {
        store: storeValue,
        path,
        payload: payloadToCreate,
      });
      closeCreateModal();
      await refreshNavigation();
      await loadDocument(created.id);
    } catch (err) {
      showCreateError((err as Error).message);
    }
  });
};

const determinePageStore = (page: NavigationPage): "public" | "private" => {
  if (page.store === "private") {
    return "private";
  }
  if (page.store === "public") {
    return "public";
  }
  const hasPrivate = page.sections.some((section) => section.store === "private");
  const hasPublic = page.sections.some((section) => section.store === "public");
  if (hasPrivate && !hasPublic) {
    return "private";
  }
  return "public";
};

const findAuthDocumentId = (pages: NavigationPage[]) => {
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

const renderNavList = (
  container: HTMLElement,
  pages: NavigationPage[],
  mode: "public" | "private"
) => {
  container.innerHTML = "";

  pages
    .filter((page) => determinePageStore(page) === mode)
    .forEach((page) => {
      const pageItem = document.createElement("li");
      const pageLink = document.createElement("a");
      pageLink.textContent = page.name;
      if (page.documentId && currentDocument?.id === page.documentId) {
        pageLink.classList.add("is-active");
      }
      pageLink.addEventListener("click", () => {
        if (page.documentId) {
          void loadDocument(page.documentId);
        }
      });
      pageItem.append(pageLink);

      if (page.sections.length > 0) {
        const sectionList = document.createElement("ul");
        page.sections.forEach((section) => {
          const sectionItem = document.createElement("li");
          const sectionLink = document.createElement("a");
          sectionLink.textContent = section.name;
          if (currentDocument?.id === section.id) {
            sectionLink.classList.add("is-active");
          }
          sectionLink.addEventListener("click", () => {
            void loadDocument(section.id);
          });
          sectionItem.append(sectionLink);
          sectionList.append(sectionItem);
        });
        pageItem.append(sectionList);
      }

      container.append(pageItem);
    });
};

const renderNavigation = (pages: NavigationPage[]) => {
  const navPublic = document.getElementById("nav-public");
  const navPrivate = document.getElementById("nav-private");
  if (!navPublic || !navPrivate) {
    return;
  }

  authDocumentId = findAuthDocumentId(pages);

  renderNavList(navPublic, pages, "public");

  navPrivate.innerHTML = "";
  pages
    .filter((page) => determinePageStore(page) === "private")
    .forEach((page) => {
      const pageItem = document.createElement("a");
      pageItem.className = "navbar-item";
      pageItem.textContent = page.name;
      pageItem.addEventListener("click", () => {
        if (page.documentId) {
          void loadDocument(page.documentId);
        }
      });
      navPrivate.append(pageItem);

      page.sections.forEach((section) => {
        const sectionItem = document.createElement("a");
        sectionItem.className = "navbar-item is-size-7";
        sectionItem.textContent = `↳ ${section.name}`;
        sectionItem.addEventListener("click", () => {
          void loadDocument(section.id);
        });
        navPrivate.append(sectionItem);
      });
    });
};

const renderModulePanel = async (doc: RemoteDocument) => {
  const panel = document.getElementById("module-panel");
  if (!panel) {
    return;
  }

  panel.innerHTML = "";
  const moduleNames = normalizeModuleList(doc.payload.modules, doc.payload.module ?? null);
  if (!moduleNames.length) {
    panel.classList.add("is-hidden");
    return;
  }

  panel.classList.remove("is-hidden");
  const moduleSettingsList = await Promise.all(
    moduleNames.map(async (moduleName) => ({
      name: moduleName,
      settings: await fetchModuleSettings(moduleName, doc.payload),
    }))
  );

  moduleSettingsList.forEach(({ name: moduleName, settings }) => {
    const module = findModuleDefinition(moduleName);
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
    });

    if (!handled) {
      const placeholder = document.createElement("div");
      placeholder.className = "notification is-light";
      placeholder.textContent = `${module.name} module is available but has no renderer yet.`;
      panel.append(placeholder);
    }
  });
};

const renderModulesView = () => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  const intro = `
    <div class="mb-4">
      <h1 class="title is-4">Modules</h1>
      <p class="app-muted">Available modules loaded from manage/src/Modules.</p>
    </div>
  `;

  const list = modules
    .map((module) => {
      const author = module.author ? ` · ${module.author}` : "";
      const storage = describeStorage(module);
      const storageLine = storage ? `<div class="app-module-row-meta">${storage}</div>` : "";
      return `
        <div class="app-module-row">
          <div class="app-module-row-title">${module.name}</div>
          <div class="app-module-row-meta">${module.description}${author}</div>
          <div class="app-module-row-meta">Input: ${module.input} · Output: ${module.output}</div>
          ${storageLine}
        </div>
      `;
    })
    .join("");

  const settingsDocs = navigationPages
    .filter((page) => page.page === "modules")
    .flatMap((page) => page.sections)
    .filter((section) => section.store === "private")
    .map((section) => ({
      id: section.id,
      name: section.name,
      path: section.path,
    }));

  const settingsList = settingsDocs
    .map(
      (doc) => `
        <div class="app-module-row">
          <div class="app-module-row-title">${doc.name}</div>
          <div class="app-module-row-meta">${doc.path}</div>
          <div class="buttons">
            <button class="button app-button app-ghost" data-module-settings="${encodeURIComponent(
              doc.id
            )}">Edit settings</button>
          </div>
        </div>
      `
    )
    .join("");

  const settingsSection = `
    <div class="mb-4">
      <h2 class="title is-5">Module Settings</h2>
      <p class="app-muted">Edit per-page or per-section module settings saved in manage/store/modules.</p>
    </div>
    ${
      settingsDocs.length
        ? `<div class="app-module-list">${settingsList}</div>`
        : `<div class="notification is-light">No module settings found yet.</div>`
    }
  `;

  if (!modules.length) {
    content.innerHTML = `${intro}<div class="notification is-light">No modules found.</div>${settingsSection}`;
  } else {
    content.innerHTML = `${intro}<div class="app-module-list">${list}</div>${settingsSection}`;
  }

  document.querySelectorAll<HTMLButtonElement>("[data-module-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      const encoded = button.getAttribute("data-module-settings") || "";
      const id = decodeURIComponent(encoded);
      if (id) {
        void loadDocument(id);
      }
    });
  });
};

const renderDocument = (doc: RemoteDocument) => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  const payload = doc.payload;
  const selectedModules = normalizeModuleList(payload.modules, payload.module ?? null);
  const isModuleSettings = payload.page === "modules" && doc.store === "private";

  if (isModuleSettings) {
    content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">Module settings · ${doc.store}/${doc.path}</p>
      </div>
      <div class="mb-4 buttons">
        <button id="save" class="button app-button app-primary">Αποθήκευση</button>
        <button id="export-json" class="button app-button app-ghost">Export JSON</button>
      </div>
      <div class="mt-4">
        <h2 class="title is-5">Settings</h2>
        <div id="json-editor" class="json-editor"></div>
      </div>
    `;

    const editorContainer = document.getElementById("json-editor");
    if (editorContainer) {
      editor = buildJsonEditor(editorContainer, payload.data);
    }

    document.getElementById("save")?.addEventListener("click", async () => {
      if (!auth || !currentDocument) {
        return;
      }

      const payloadToSave: DocumentPayload = {
        ...payload,
        data: editor?.getValue() ?? payload.data,
      };

      try {
        const updated = await updateDocument(auth, currentDocument.id, payloadToSave);
        currentDocument = updated;
        moduleSettingsCache.clear();
        renderDocument(updated);
        await refreshNavigation();
      } catch (err) {
        alert((err as Error).message);
      }
    });

    const triggerDownload = async (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    document.getElementById("export-json")?.addEventListener("click", async () => {
      if (!auth || !currentDocument) {
        return;
      }
      try {
        const result = await downloadDocument(auth, currentDocument.id);
        const filename =
          result.filename ?? `${currentDocument.path.split("/").pop() || "document"}.json`;
        await triggerDownload(result.blob, filename);
      } catch (err) {
        alert((err as Error).message);
      }
    });

    return;
  }
  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${payload.name}</h1>
      <p class="app-muted">${payload.page} · ${doc.store}/${doc.path}</p>
    </div>
    <div class="mb-4 buttons">
      <button id="save" class="button app-button app-primary">Αποθήκευση</button>
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
              ${moduleChecklistHtml(selectedModules)}
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
    editor = buildJsonEditor(editorContainer, payload.data);
  }

  void renderModulePanel(doc);

  const moduleInput = document.getElementById("field-modules");
  moduleInput?.addEventListener("change", () => {
    payload.modules = readSelectedModules(moduleInput);
    void renderModulePanel(doc);
  });

  document.getElementById("save")?.addEventListener("click", async () => {
    if (!auth || !currentDocument) {
      return;
    }

    const pageInput = document.getElementById("field-page") as HTMLInputElement | null;
    const nameInput = document.getElementById("field-name") as HTMLInputElement | null;
    const languageInput = document.getElementById("field-language") as HTMLInputElement | null;
    const sectionInput = document.getElementById("field-section") as HTMLSelectElement | null;
    const orderInput = document.getElementById("field-order") as HTMLInputElement | null;
    const moduleInput = document.getElementById("field-modules");

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

    const payloadToSave: DocumentPayload = {
      page: pageInput?.value.trim() || payload.page,
      name: nameInput?.value.trim() || payload.name,
      language: languageInput?.value.trim() || undefined,
      order: orderValue,
      section: sectionInput?.value === "true",
      modules: readSelectedModules(moduleInput),
      data: editor?.getValue() ?? payload.data,
    };

    try {
      const updated = await updateDocument(auth, currentDocument.id, payloadToSave);
      currentDocument = updated;
      renderDocument(updated);
      await refreshNavigation();
    } catch (err) {
      alert((err as Error).message);
    }
  });

  const triggerDownload = async (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  document.getElementById("export-json")?.addEventListener("click", async () => {
    if (!auth || !currentDocument) {
      return;
    }
    try {
      const result = await downloadDocument(auth, currentDocument.id);
      const filename = result.filename ?? `${currentDocument.path.split("/").pop() || "document"}.json`;
      await triggerDownload(result.blob, filename);
    } catch (err) {
      alert((err as Error).message);
    }
  });

};

const renderProfile = async () => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  if (!isTokenAuth(auth) || !auth.user) {
    content.innerHTML = `<p class="app-muted">Δεν υπάρχει προφίλ για API key σύνδεση.</p>`;
    return;
  }
  const currentUser = auth.user;

  if (!authDocumentId) {
    content.innerHTML = `<p class="app-muted">Δεν βρέθηκε auth.json.</p>`;
    return;
  }

  let authDoc: RemoteDocument;
  try {
    authDoc = await fetchDocument(auth, authDocumentId);
  } catch (err) {
    content.innerHTML = `<p class="app-muted">${(err as Error).message}</p>`;
    return;
  }

  const data = authDoc.payload.data;
  if (!isAuthData(data)) {
    content.innerHTML = `<p class="app-muted">Το auth.json δεν έχει users.</p>`;
    return;
  }

  const users = data.users;
  const index = users.findIndex((user) => {
    if (user.email === currentUser.email) return true;
    if (user.id && user.id === currentUser.id) return true;
    if (user.uuid && user.uuid === currentUser.id) return true;
    return false;
  });

  if (index < 0) {
    content.innerHTML = `<p class="app-muted">Ο χρήστης δεν βρέθηκε στο auth.json.</p>`;
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
    if (!isTokenAuth(auth) || !auth.user) {
      return;
    }
    const activeUser = auth.user;

    const firstname = (document.getElementById("profile-firstname") as HTMLInputElement | null)
      ?.value.trim();
    const lastname = (document.getElementById("profile-lastname") as HTMLInputElement | null)
      ?.value.trim();
    const email = (document.getElementById("profile-email") as HTMLInputElement | null)
      ?.value.trim();
    const password = (document.getElementById("profile-password") as HTMLInputElement | null)
      ?.value.trim();

    const updatedUser: EditableUser = {
      ...current,
      firstname: firstname ?? current.firstname,
      lastname: lastname ?? current.lastname,
      email: email ?? current.email,
    };

    if (password) {
      updatedUser.password = password;
    }

    const updatedUsers = [...users];
    updatedUsers[index] = updatedUser;

    const updatedPayload: DocumentPayload = {
      ...authDoc.payload,
      data: {
        ...data,
        users: updatedUsers,
      },
    };

    try {
      await updateDocument(auth, authDoc.id, updatedPayload);
      auth = {
        ...auth,
        user: {
          ...activeUser,
          firstname: updatedUser.firstname,
          lastname: updatedUser.lastname,
          email: updatedUser.email,
        },
      };
      saveAuth(auth);
      renderProfile();
    } catch (err) {
      alert((err as Error).message);
    }
  });
};

const loadDocument = async (id: string) => {
  if (!auth) {
    return;
  }
  try {
    currentDocument = await fetchDocument(auth, id);
    renderDocument(currentDocument);
  } catch (err) {
    alert((err as Error).message);
  }
};

const refreshNavigation = async () => {
  if (!auth) {
    return;
  }
  try {
    const nav = await fetchNavigation(auth);
    navigationPages = nav.pages;
    renderNavigation(nav.pages);
  } catch (err) {
    alert((err as Error).message);
  }
};

const loadUiConfig = async () => {
  if (!auth) {
    return;
  }
  try {
    const response = await fetchUiConfig(auth);
    applyUiConfig(response.config as UiConfig);
  } catch {
    setTheme(currentTheme, false);
  }
};

const loadLayoutConfig = async () => {
  if (!auth) {
    return;
  }
  try {
    const response = await fetchLayoutConfig(auth);
    layoutConfig = response.config ?? {};
  } catch {
    layoutConfig = {};
  }
};

const loadModules = async () => {
  if (!auth) {
    return;
  }
  try {
    const response = await fetchModules(auth);
    if (Array.isArray(response.modules)) {
      modules = response.modules;
    } else if (response.modules && typeof response.modules === "object") {
      modules = Object.values(response.modules);
    } else {
      modules = [];
    }
  } catch {
    modules = [];
  }
};

const renderApp = async () => {
  if (!auth) {
    renderLogin();
    return;
  }

  await loadUiConfig();
  await loadLayoutConfig();
  await loadModules();
  renderAppShell();
  await refreshNavigation();
};

renderApp().catch(() => renderLogin());
