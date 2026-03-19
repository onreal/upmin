import type { AuthState, DocumentPayload, RemoteDocument } from "../api";
import type { JsonEditorHandle } from "../json-editor";
import { triggerDownload } from "../utils";
import { adminText } from "../app/translations";

type LanguageOptions = {
  currentLanguage: string | null;
  options: Array<{ id: string; label: string; language: string | null }>;
  onSelect: (id: string, language: string | null) => void;
};

type EditablePayloadOptions = {
  payload: DocumentPayload;
  readSelectedModules: (container: HTMLElement | null) => string[];
  editor: JsonEditorHandle | null;
  modulesOverride?: string[];
};

export const bindDocumentIdCopy = () => {
  document.querySelectorAll<HTMLButtonElement>("[data-copy-doc-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy-doc-id") || "";
      if (!value) {
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        button.classList.add("is-copied");
        window.setTimeout(() => button.classList.remove("is-copied"), 1200);
      } catch {
        button.classList.add("is-error");
        window.setTimeout(() => button.classList.remove("is-error"), 1200);
      }
    });
  });
};

export const bindDocumentLanguageSelect = (languageOptions?: LanguageOptions | null) => {
  if (!languageOptions || languageOptions.options.length <= 1) {
    return;
  }
  const select = document.getElementById("doc-language-select") as HTMLSelectElement | null;
  select?.addEventListener("change", () => {
    const id = select.value;
    const choice = languageOptions.options.find((option) => option.id === id) ?? null;
    if (choice) {
      languageOptions.onSelect(choice.id, choice.language ?? null);
    }
  });
};

export const exportDocumentJson = async (
  auth: AuthState | null,
  doc: RemoteDocument,
  downloadDocument: (auth: AuthState, id: string) => Promise<{ blob: Blob; filename?: string }>
) => {
  if (!auth) {
    return;
  }
  const result = await downloadDocument(auth, doc.id);
  const filename = result.filename ?? `${doc.path.split("/").pop() || "document"}.json`;
  triggerDownload(result.blob, filename);
};

export const buildEditableDocumentPayload = ({
  payload,
  readSelectedModules,
  editor,
  modulesOverride,
}: EditablePayloadOptions): { payload: DocumentPayload } | { error: string } => {
  const pageInput = document.getElementById("field-page") as HTMLInputElement | null;
  const nameInput = document.getElementById("field-name") as HTMLInputElement | null;
  const languageInput = document.getElementById("field-language") as HTMLInputElement | null;
  const sectionInput = document.getElementById("field-section") as HTMLSelectElement | null;
  const orderInput = document.getElementById("field-order") as HTMLInputElement | null;
  const moduleInput = document.getElementById("field-modules");
  const orderRaw = orderInput?.value.trim() || "";

  if (!orderRaw) {
    return { error: adminText("documents.orderRequired", "Order is required.") };
  }

  const parsedOrder = Number(orderRaw);
  if (!Number.isInteger(parsedOrder)) {
    return { error: adminText("documents.orderInteger", "Order must be an integer.") };
  }

  return {
    payload: {
      type: payload.type ?? "page",
      page: pageInput?.value.trim() || payload.page,
      name: nameInput?.value.trim() || payload.name,
      language: languageInput?.value.trim() || undefined,
      order: parsedOrder,
      section: sectionInput?.value === "true",
      modules: modulesOverride ?? readSelectedModules(moduleInput),
      position_view: payload.position_view,
      data: editor?.getValue() ?? payload.data,
    },
  };
};
