import type { CreationRecord, RemoteDocument } from "../api";
import { adminText } from "../app/translations";

export type CreationsViewContext = {
  content: HTMLElement | null;
  doc: RemoteDocument;
  creations: CreationRecord[];
  onSnapshot: () => Promise<void>;
  onClearAll: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDownload: (id: string) => Promise<void>;
  onExportJson: () => Promise<void>;
  loadPreview: (id: string) => Promise<string>;
};

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const reasonLabel = (reason?: string | null) => {
  if (reason === "before-clear") {
    return adminText("creations.reason.beforeClear", "Pre-clear snapshot");
  }
  return adminText("creations.reason.manual", "Manual snapshot");
};

const targetLabel = (target?: string | null) =>
  target === "build"
    ? adminText("creations.target.build", "Build")
    : adminText("creations.target.public", "Public");

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return adminText("common.unknownTime", "Unknown time");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return timestampFormatter.format(date);
};

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

const buildCard = (creation: CreationRecord) => {
  const article = document.createElement("article");
  article.className = "app-creation-card app-surface";
  article.innerHTML = `
    <div class="app-creation-preview is-loading">
      <div class="app-creation-preview-glow"></div>
      <img alt="${escapeHtml(creation.id)}" loading="lazy" />
    </div>
    <div class="app-creation-copy">
      <div class="app-creation-copy-top">
        <span class="app-creation-badge">${escapeHtml(`${targetLabel(creation.target)} · ${reasonLabel(creation.reason)}`)}</span>
        <span class="app-creation-date">${escapeHtml(formatTimestamp(creation.createdAt))}</span>
      </div>
      <h2 class="app-creation-title">${escapeHtml(creation.id)}</h2>
      <div class="app-creation-paths">
        <div>
          <span class="app-creation-label">${adminText("creations.backup", "Backup")}</span>
          <code>manage/store/${escapeHtml(creation.backupPath)}</code>
        </div>
        <div>
          <span class="app-creation-label">${adminText("creations.preview", "Preview")}</span>
          <code>manage/store/${escapeHtml(creation.snapshotPath)}</code>
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

export const renderCreationsView = ({
  content,
  doc,
  creations,
  onSnapshot,
  onClearAll,
  onDelete,
  onRestore,
  onDownload,
  onExportJson,
  loadPreview,
}: CreationsViewContext) => {
  if (!content) {
    return;
  }

  content.innerHTML = `
    <section class="app-creations-shell">
      <div class="app-creations-hero app-surface">
        <div>
          <p class="app-creations-kicker">${adminText("documents.systemPage", "System page")}</p>
          <h1 class="title is-4">${escapeHtml(doc.payload.name)}</h1>
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
            <span class="app-creations-stat-value">${escapeHtml(doc.store)}</span>
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
      const preview = card.querySelector(".app-creation-preview") as HTMLElement | null;
      const image = card.querySelector("img") as HTMLImageElement | null;
      const downloadButton = card.querySelector('[data-action="download"]') as HTMLButtonElement | null;
      const restoreButton = card.querySelector('[data-action="restore"]') as HTMLButtonElement | null;
      const deleteButton = card.querySelector('[data-action="delete"]') as HTMLButtonElement | null;

      void loadPreview(creation.id)
        .then((url) => {
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
        })
        .catch(() => {
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

  const snapshotButton = document.getElementById("creation-snapshot") as HTMLButtonElement | null;
  const clearButton = document.getElementById("creation-clear") as HTMLButtonElement | null;
  const exportButton = document.getElementById("creation-export") as HTMLButtonElement | null;

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
