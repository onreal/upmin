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
              <a class="navbar-item" id="modules-link">Modules</a>
              <a class="navbar-item" id="integrations-link">Integrations</a>
              <a class="navbar-item" id="logs-link">Logs</a>
              <hr class="navbar-divider" />
              <a class="navbar-item" id="website-build-link">Website build</a>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="agents-dropdown">
            <a class="navbar-link">Agents</a>
            <div class="navbar-dropdown">
              <div id="nav-agents"></div>
              <hr class="navbar-divider" />
              <a class="navbar-item" id="agents-create-link">Create agent</a>
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
