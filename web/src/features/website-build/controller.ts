import type { AuthState, RemoteDocument } from "../../api";
import { cleanWebsiteBuild, copyWebsiteBuildFromPublic, publishWebsiteBuild } from "../../api";
import { moduleSettingsKey } from "../../modules/utils";
import type { ConversationProgress } from "../chat/progress";
import { renderWebsiteBuildView } from "../../views/website-build";
import { captureWebsiteSnapshot } from "../creations/capture";

export type WebsiteBuildControllerContext = {
  content: HTMLElement | null;
  auth: AuthState | null;
  doc: RemoteDocument;
  renderModulePanel: (doc: RemoteDocument) => Promise<void>;
};

export const isWebsiteBuildDocument = (doc: RemoteDocument) =>
  doc.store === "private" && doc.path === "website-build.json";

let disposeProgressListener: (() => void) | null = null;

export const renderWebsiteBuildPage = ({
  content,
  auth,
  doc,
  renderModulePanel,
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

  const setPreviewPending = (pending: boolean, progress: ConversationProgress | null) => {
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

  const onProgress = (event: Event) => {
    const detail = (event as CustomEvent).detail as {
      moduleName?: string;
      settingsKey?: string;
      pending?: boolean;
      progress?: ConversationProgress | null;
    } | null;
    if (!detail || detail.settingsKey !== settingsKey) {
      return;
    }
    setPreviewPending(Boolean(detail.pending), detail.progress ?? null);
  };

  window.addEventListener("app:chat-progress", onProgress);
  disposeProgressListener = () => {
    window.removeEventListener("app:chat-progress", onProgress);
  };

  void renderModulePanel(doc).catch((err) => {
    alert((err as Error).message);
  });
};
