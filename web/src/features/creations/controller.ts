import {
  createCreationSnapshot,
  clearWebsiteWithSnapshot,
  deleteCreationSnapshot,
  downloadCreationSnapshot,
  downloadDocument,
  fetchCreationSnapshotImage,
  restoreCreationSnapshot,
  type AuthState,
  type CreationActionResponse,
  type CreationRecord,
  type RemoteDocument,
} from "../../api";
import { renderCreationsView } from "../../views/creations";
import { isRecord, triggerDownload } from "../../utils";
import { captureWebsiteSnapshot } from "./capture";

export type CreationsControllerContext = {
  content: HTMLElement | null;
  auth: AuthState | null;
  doc: RemoteDocument;
  onDocumentUpdated: (doc: RemoteDocument) => void;
  refreshNavigation: () => Promise<void>;
  rerender: (doc: RemoteDocument) => void;
};

const readCreations = (value: unknown): CreationRecord[] => {
  const records =
    isRecord(value) && Array.isArray(value.creations)
      ? value.creations
      : Array.isArray(value)
        ? value
        : [];

  return records
    .filter((record): record is CreationRecord => {
      if (!isRecord(record)) {
        return false;
      }
      return (
        typeof record.id === "string" &&
        typeof record.createdAt === "string" &&
        typeof record.snapshotPath === "string" &&
        typeof record.backupPath === "string"
      );
    })
    .map((record) => ({
      id: record.id,
      createdAt: record.createdAt,
      reason: typeof record.reason === "string" ? record.reason : null,
      target: record.target === "build" ? "build" : "public",
      snapshotPath: record.snapshotPath,
      snapshotMimeType: typeof record.snapshotMimeType === "string" ? record.snapshotMimeType : null,
      backupPath: record.backupPath,
    }));
};

const applyResult = async (
  result: CreationActionResponse,
  onDocumentUpdated: (doc: RemoteDocument) => void,
  rerender: (doc: RemoteDocument) => void,
  refreshNavigation: () => Promise<void>
) => {
  onDocumentUpdated(result.document);
  rerender(result.document);
  await refreshNavigation();
};

export const isCreationsDocument = (doc: RemoteDocument) =>
  doc.store === "private" && doc.path === "creations.json";

export const renderCreationsPage = ({
  content,
  auth,
  doc,
  onDocumentUpdated,
  refreshNavigation,
  rerender,
}: CreationsControllerContext) => {
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
        await applyResult(result, onDocumentUpdated, rerender, refreshNavigation);
      } catch (err) {
        alert((err as Error).message);
      }
    },
    onClearAll: async () => {
      if (!auth) {
        return;
      }
      try {
        const snapshot = await captureWebsiteSnapshot();
        const result = await clearWebsiteWithSnapshot(auth, snapshot);
        await applyResult(result, onDocumentUpdated, rerender, refreshNavigation);
      } catch (err) {
        alert((err as Error).message);
      }
    },
    onDelete: async (id) => {
      if (!auth) {
        return;
      }
      try {
        const result = await deleteCreationSnapshot(auth, id);
        await applyResult(result, onDocumentUpdated, rerender, refreshNavigation);
      } catch (err) {
        alert((err as Error).message);
      }
    },
    onRestore: async (id) => {
      if (!auth) {
        return;
      }
      try {
        const result = await restoreCreationSnapshot(auth, id);
        await applyResult(result, onDocumentUpdated, rerender, refreshNavigation);
      } catch (err) {
        alert((err as Error).message);
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
        alert((err as Error).message);
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
        alert((err as Error).message);
      }
    },
    loadPreview: async (id) => {
      if (!auth) {
        throw new Error("Unauthorized");
      }
      const result = await fetchCreationSnapshotImage(auth, id);
      return URL.createObjectURL(result.blob);
    },
  });
};
