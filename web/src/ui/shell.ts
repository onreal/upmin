import { headerCopy, sidebarCopy, getUserLabel } from "../app/layout";

export type ShellContext = {
  moduleChecklistHtml: (selected?: string[]) => string;
};

export const renderAppShell = ({ moduleChecklistHtml }: ShellContext) => {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing app container");
  }

  const header = headerCopy();
  const sidebar = sidebarCopy();

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
                class="button app-button app-primary"
                data-shell-action="create"
              >
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
                data-shell-action="export"
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
                data-shell-action="theme"
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
          <button
            class="delete app-mobile-drawer-close"
            type="button"
            aria-label="Close navigation"
            data-mobile-drawer-close
          ></button>
        </div>
        <div class="app-mobile-drawer-body">
          <div class="app-mobile-drawer-actions">
            <button class="button app-button app-primary" type="button" data-shell-action="create">
              ${header.createLabel}
            </button>
            <button class="button app-button app-ghost" type="button" data-shell-action="export">
              Export
            </button>
            <button class="button app-button app-ghost" type="button" data-shell-action="theme">
              ${header.themeLabel}
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
              <p class="app-muted">Επιλέξτε μια ενότητα.</p>
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
