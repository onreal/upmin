import type { RemoteDocument } from "../api";
import { adminText } from "../app/translations";

export type WebsiteBuildViewContext = {
  content: HTMLElement | null;
  doc: RemoteDocument;
  onVisit: () => void;
  onPublish: () => Promise<void>;
  onClean: () => Promise<void>;
  onCopyFromPublic: () => Promise<void>;
  onTabChange?: (tab: "chat" | "preview") => void;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const actionIcon = (name: "visit" | "copy" | "publish" | "clean") => {
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

const actionButton = (
  id: string,
  label: string,
  icon: "visit" | "copy" | "publish" | "clean",
  tooltip: string,
  extraClass = ""
) => {
  const className = ["button app-button app-ghost app-build-action", extraClass].filter(Boolean).join(" ");
  return `
  <button
    id="${id}"
    class="${className}"
    type="button"
    data-busy-label="${escapeHtml(label)}..."
    data-tooltip="${escapeHtml(tooltip)}"
    aria-label="${escapeHtml(tooltip)}"
    title="${escapeHtml(tooltip)}"
  >
    <span class="app-build-action-icon" aria-hidden="true">${actionIcon(icon)}</span>
    <span class="app-build-action-label">${escapeHtml(label)}</span>
  </button>
`;
};

const runButtonAction = async (button: HTMLButtonElement, pendingLabel: string, action: () => Promise<void>) => {
  const label = button.querySelector<HTMLElement>(".app-build-action-label");
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

export const renderWebsiteBuildView = ({
  content,
  doc,
  onVisit,
  onPublish,
  onClean,
  onCopyFromPublic,
  onTabChange,
}: WebsiteBuildViewContext) => {
  if (!content) {
    return;
  }

  content.innerHTML = `
    <section class="app-build-shell">
      <div class="app-build-header">
        <div class="app-build-heading">
          <p class="app-build-kicker app-muted">${adminText("documents.systemPage", "System page")}</p>
          <h1 class="title is-4">${escapeHtml(doc.payload.name)}</h1>
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
                <div class="app-build-preview-title">${adminText("chat.progress.title", "Codex is working")}</div>
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

  const visitButton = document.getElementById("build-visit") as HTMLButtonElement | null;
  const copyFromPublicButton = document.getElementById("build-copy-public") as HTMLButtonElement | null;
  const publishButton = document.getElementById("build-publish") as HTMLButtonElement | null;
  const cleanButton = document.getElementById("build-clean") as HTMLButtonElement | null;
  visitButton?.addEventListener("click", onVisit);
  copyFromPublicButton?.addEventListener("click", () => {
    if (!copyFromPublicButton) {
      return;
    }
    void runButtonAction(copyFromPublicButton, adminText("websiteBuild.copying", "Copying..."), onCopyFromPublic);
  });

  publishButton?.addEventListener("click", () => {
    if (!publishButton) {
      return;
    }
    void runButtonAction(publishButton, adminText("websiteBuild.publishing", "Publishing..."), onPublish);
  });

  cleanButton?.addEventListener("click", () => {
    if (!cleanButton) {
      return;
    }
    void runButtonAction(cleanButton, adminText("common.cleaning", "Cleaning..."), onClean);
  });

  const tabLinks = Array.from(content.querySelectorAll<HTMLAnchorElement>("[data-build-tab]"));
  const panels = {
    chat: document.getElementById("build-chat"),
    preview: document.getElementById("build-preview"),
  };

  const activate = (tab: "chat" | "preview") => {
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
