import { headerCopy, sidebarCopy, getUserLabel } from "../app/layout";
import { state } from "../app/state";
import { adminText } from "../app/translations";

export type ShellContext = {
  moduleChecklistHtml: (selected?: string[]) => string;
};

const defaultLandingCards = () => {
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
        `,
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
        `,
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
        `,
      },
    ],
  };
};

export const renderAppShell = ({ moduleChecklistHtml }: ShellContext) => {
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
    <nav class="navbar app-surface" role="navigation" aria-label="${adminText("navigation.main", "main navigation")}">
      <div class="container">
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
                  class="button app-button app-ghost is-hidden"
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
                version: state.systemUpdate?.currentVersion ?? adminText("common.unknown", "unknown"),
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
                  ${landing.cards
                    .map(
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
                    )
                    .join("")}
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
                      ${moduleChecklistHtml()}
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
            version: state.systemUpdate?.currentVersion ?? adminText("common.unknown", "unknown"),
          })}</span>
          <span id="system-update-latest-version">${adminText("systemUpdate.latestVersion", "Latest version: {version}", {
            version: state.systemUpdate?.latestVersion ?? adminText("common.unknown", "unknown"),
          })}</span>
        </div>
      </div>
    </div>
  `;
};

export const renderSystemUpdateControls = () => {
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
  const status = state.systemUpdate;

  if (
    !mobilePanel ||
    !mobileStatusChip ||
    !mobileStatusText ||
    !mobileButton ||
    !mobileButtonLabel ||
    !mobileCurrentVersion ||
    !footerVersionLabel ||
    !footerVersionDot ||
    !footerVersionValue ||
    !button ||
    !buttonLabel ||
    !menuLink ||
    !mobileLink ||
    !lock ||
    !lockTitle ||
    !lockMessage ||
    !currentVersion ||
    !latestVersion
  ) {
    return;
  }

  const showAction = Boolean(status?.updateAvailable) || Boolean(status?.locked);
  button.classList.toggle("is-hidden", !showAction);
  menuLink.classList.toggle("is-hidden", !showAction);
  mobileLink.classList.toggle("is-hidden", !showAction);
  mobilePanel.classList.toggle("is-hidden", !showAction);

  const isRunning = Boolean(status?.locked);
  const isReady = Boolean(status?.updateAvailable);
  button.toggleAttribute("disabled", isRunning || !isReady);
  mobileButton.toggleAttribute("disabled", isRunning || !isReady);
  button.classList.toggle("app-icon-button", !isRunning && !isReady);
  buttonLabel.textContent = isRunning
    ? adminText("systemUpdate.updating", "Updating...")
    : isReady
      ? adminText("systemUpdate.updateVersion", "Update {version}", {
          version: status?.latestVersion ?? adminText("common.latest", "latest"),
        })
      : adminText("systemUpdate.action", "Update");
  mobileButtonLabel.textContent = buttonLabel.textContent;
  menuLink.textContent = isRunning
    ? adminText("systemUpdate.inProgress", "Admin update in progress")
    : isReady
      ? adminText("systemUpdate.updateAdminTo", "Update admin to {version}", {
          version: status?.latestVersion ?? adminText("common.latest", "latest"),
        })
      : adminText("systemUpdate.updateAdmin", "Update admin");
  mobileLink.textContent = menuLink.textContent;
  button.setAttribute("aria-label", isRunning ? buttonLabel.textContent : menuLink.textContent || buttonLabel.textContent);
  button.setAttribute("title", isRunning ? buttonLabel.textContent : menuLink.textContent || buttonLabel.textContent);
  footerVersionLabel.textContent = adminText("systemUpdate.versionShort", "Version");
  mobileCurrentVersion.textContent = adminText("systemUpdate.currentVersion", "Current version: {version}", {
    version: status?.currentVersion ?? adminText("common.unknown", "unknown"),
  });
  footerVersionValue.textContent = status?.currentVersion ?? adminText("common.unknown", "unknown");
  footerVersionDot.classList.toggle("is-ready", isReady || isRunning);
  mobileStatusChip.classList.toggle("is-hidden", !showAction);
  mobileStatusChip.classList.toggle("is-error", Boolean(status?.error) && !isRunning);
  mobileStatusChip.classList.toggle("is-ready", isReady && !isRunning);
  if (isRunning) {
    mobileStatusText.textContent =
      status?.message || adminText("systemUpdate.updatingAdmin", "Updating admin...");
  } else if (status?.error) {
    mobileStatusText.textContent = adminText("systemUpdate.checkFailed", "Update check failed. Current {version}.", {
      version: status?.currentVersion ?? adminText("common.unknown", "unknown"),
    });
  } else if (isReady) {
    mobileStatusText.textContent = adminText("systemUpdate.available", "Update available: {current} -> {latest}", {
      current: status?.currentVersion ?? adminText("common.unknown", "unknown"),
      latest: status?.latestVersion ?? adminText("common.unknown", "unknown"),
    });
  } else if (status?.currentVersion) {
    mobileStatusText.textContent = adminText("systemUpdate.adminVersion", "Admin {version}", {
      version: status.currentVersion,
    });
  } else {
    mobileStatusText.textContent = adminText("systemUpdate.versionUnknown", "Version unknown");
  }

  lock.hidden = !isRunning;
  lockTitle.textContent = adminText("systemUpdate.inProgress", "Admin update in progress");
  lockMessage.textContent = status?.message || adminText("systemUpdate.wait", "Please wait while the admin files are replaced.");
  currentVersion.textContent = adminText("systemUpdate.currentVersion", "Current version: {version}", {
    version: status?.currentVersion ?? adminText("common.unknown", "unknown"),
  });
  latestVersion.textContent = adminText("systemUpdate.latestVersion", "Latest version: {version}", {
    version: status?.latestVersion ?? adminText("common.unknown", "unknown"),
  });
};
