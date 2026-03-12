import type { RemoteDocument } from "../api";

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

const runButtonAction = async (button: HTMLButtonElement, pendingLabel: string, action: () => Promise<void>) => {
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
        <div>
          <p class="app-build-kicker app-muted">System page</p>
          <h1 class="title is-4">${escapeHtml(doc.payload.name)}</h1>
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

  const visitButton = document.getElementById("build-visit") as HTMLButtonElement | null;
  const copyFromPublicButton = document.getElementById("build-copy-public") as HTMLButtonElement | null;
  const publishButton = document.getElementById("build-publish") as HTMLButtonElement | null;
  const cleanButton = document.getElementById("build-clean") as HTMLButtonElement | null;
  visitButton?.addEventListener("click", onVisit);
  copyFromPublicButton?.addEventListener("click", () => {
    if (!copyFromPublicButton) {
      return;
    }
    void runButtonAction(copyFromPublicButton, "Copying...", onCopyFromPublic);
  });

  publishButton?.addEventListener("click", () => {
    if (!publishButton) {
      return;
    }
    void runButtonAction(publishButton, "Publishing...", onPublish);
  });

  cleanButton?.addEventListener("click", () => {
    if (!cleanButton) {
      return;
    }
    void runButtonAction(cleanButton, "Cleaning...", onClean);
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
