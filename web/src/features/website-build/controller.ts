import type { AuthState, RemoteDocument } from "../../api";
import { cleanWebsiteBuild, copyWebsiteBuildFromPublic, publishWebsiteBuild } from "../../api";
import { moduleSettingsKey } from "../../modules/utils";
import { getConversationProgressTitle, type ConversationProgress } from "../chat/progress";
import { renderWebsiteBuildView } from "../../views/website-build";
import { captureWebsiteSnapshot } from "../creations/capture";
import { adminText } from "../../app/translations";

export type WebsiteBuildControllerContext = {
  content: HTMLElement | null;
  auth: AuthState | null;
  doc: RemoteDocument;
  renderModulePanel: (doc: RemoteDocument) => Promise<void>;
  confirmAction: (options: {
    title: string;
    message: string;
    confirmLabel: string;
    confirmClassName?: string;
  }) => Promise<boolean>;
};

export const isWebsiteBuildDocument = (doc: RemoteDocument) =>
  doc.store === "private" && doc.path === "website-build.json";

let disposeProgressListener: (() => void) | null = null;

export const renderWebsiteBuildPage = ({
  content,
  auth,
  doc,
  renderModulePanel,
  confirmAction,
}: WebsiteBuildControllerContext) => {
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
          confirmClassName: "button app-button app-primary",
        });
        if (!confirmed) {
          return;
        }
        await publishWebsiteBuild(auth);
      } catch (err) {
        alert((err as Error).message);
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
          confirmClassName: "button app-button app-danger",
        });
        if (!confirmed) {
          return;
        }
        const snapshot = await captureWebsiteSnapshot("/build/");
        await cleanWebsiteBuild(auth, snapshot);
        refreshPreview();
      } catch (err) {
        alert((err as Error).message);
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
          confirmClassName: "button app-button app-primary",
        });
        if (!confirmed) {
          return;
        }
        const snapshot = await captureWebsiteSnapshot("/build/");
        await copyWebsiteBuildFromPublic(auth, snapshot);
        refreshPreview();
      } catch (err) {
        alert((err as Error).message);
      }
    },
    onTabChange: (tab) => {
      if (tab === "preview") {
        refreshPreviewIfReady();
      }
    },
  });

  const previewLoading = document.getElementById("build-preview-loading");
  const previewTitle = document.getElementById("build-preview-title");
  const previewReasoning = document.getElementById("build-preview-reasoning");
  const previewFrameWrap = document.getElementById("build-preview-frame");
  const previewIframe = document.getElementById("build-preview-iframe") as HTMLIFrameElement | null;
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

  const setPreviewPending = (
    pending: boolean,
    progress: ConversationProgress | null,
    agentName?: string | null
  ) => {
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

  const onProgress = (event: Event) => {
    const detail = (event as CustomEvent).detail as {
      moduleName?: string;
      settingsKey?: string;
      agentName?: string;
      pending?: boolean;
      progress?: ConversationProgress | null;
    } | null;
    if (!detail || detail.settingsKey !== settingsKey) {
      return;
    }
    setPreviewPending(Boolean(detail.pending), detail.progress ?? null, detail.agentName ?? null);
  };

  window.addEventListener("app:chat-progress", onProgress);
  disposeProgressListener = () => {
    window.removeEventListener("app:chat-progress", onProgress);
  };

  void renderModulePanel(doc).catch((err) => {
    alert((err as Error).message);
  });
};
