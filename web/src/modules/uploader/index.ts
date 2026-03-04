import type { DocumentPayload, ModuleDefinition } from "../../api";
import { uploadModuleFile } from "../../api";
import type { JsonEditorHandle } from "../../json-editor";
import type { ModuleRenderContext } from "../types";
import { moduleSettingsKey } from "../utils";
import { describeStorage, isRecord } from "./utils";

type ModuleSchema = {
  type?: string;
  properties?: Record<string, ModuleSchemaProperty>;
  required?: string[];
};

type ModuleSchemaProperty = {
  type?: string;
  title?: string;
  format?: string;
  contentMediaType?: string;
  contentEncoding?: string;
};

const resolveUploaderKeys = (schema: ModuleSchema | null) => {
  const properties = schema?.properties ?? {};
  const entries = Object.entries(properties);
  let urlKey: string | null = null;

  for (const [key, value] of entries) {
    if (!value || value.type !== "string") {
      continue;
    }
    if (
      value.format === "data-url" ||
      value.format === "uri" ||
      value.contentMediaType?.startsWith("image/")
    ) {
      urlKey = key;
      break;
    }
  }

  if (!urlKey && properties.url?.type === "string") {
    urlKey = "url";
  }
  if (!urlKey && entries.length > 0) {
    urlKey = entries[0][0];
  }

  const altKey = properties.alt?.type === "string" ? "alt" : null;
  return { urlKey, altKey };
};

const coerceDataObject = (payload: DocumentPayload, editor: JsonEditorHandle | null) => {
  if (isRecord(payload.data)) {
    return payload.data as Record<string, unknown>;
  }
  payload.data = {};
  editor?.setValue(payload.data);
  return payload.data as Record<string, unknown>;
};

const buildHeader = (module: ModuleDefinition) => {
  const header = document.createElement("div");
  header.className = "app-module-header";
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} · ${module.author}` : module.description;
  header.append(title, meta);
  const storageHint = describeStorage(module);
  if (storageHint) {
    const storageMeta = document.createElement("div");
    storageMeta.className = "app-module-meta";
    storageMeta.textContent = storageHint;
    header.append(storageMeta);
  }
  return header;
};

export const renderUploaderModule = (panel: HTMLElement, context: ModuleRenderContext) => {
  const { module, payload, editor, auth } = context;
  const schema = isRecord(module.schema) ? (module.schema as ModuleSchema) : null;
  const data = coerceDataObject(payload, editor);
  const { urlKey, altKey } = resolveUploaderKeys(schema);
  const settings = isRecord(context.settings) ? context.settings : null;
  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const targetKey =
    typeof outputSettings?.target === "string" && outputSettings.target.trim() !== ""
      ? outputSettings.target.trim()
      : module.name;

  if (!urlKey) {
    const notice = document.createElement("div");
    notice.className = "notification is-warning is-light";
    notice.textContent = "Uploader schema must define a string field for the image.";
    panel.append(notice);
    return;
  }

  const moduleCard = document.createElement("div");
  moduleCard.className = "app-module";

  const body = document.createElement("div");
  body.className = "app-module-body";

  const preview = document.createElement("div");
  preview.className = "app-module-preview";

  let pendingUrl = "";
  let pendingAlt = "";

  const updatePreview = () => {
    preview.innerHTML = "";
    if (!pendingUrl) {
      const empty = document.createElement("span");
      empty.className = "app-muted";
      empty.textContent = "No image selected.";
      preview.append(empty);
      return;
    }
    const img = document.createElement("img");
    img.src = pendingUrl;
    img.alt = pendingAlt;
    preview.append(img);
  };

  const setPendingUrl = (value: string) => {
    pendingUrl = value.trim();
    updatePreview();
    addButton.disabled = pendingUrl === "";
    discardButton.disabled = pendingUrl === "";
  };

  const setPendingAlt = (value: string) => {
    pendingAlt = value;
    updatePreview();
  };

  updatePreview();

  const fileField = document.createElement("div");
  fileField.className = "field";
  const fileLabel = document.createElement("label");
  fileLabel.className = "label";
  fileLabel.textContent = "Upload image";
  const fileControl = document.createElement("div");
  fileControl.className = "control";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "input";
  const fileHelp = document.createElement("p");
  fileHelp.className = "help";

  const setUploadStatus = (message: string) => {
    fileHelp.textContent = message;
  };

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file || !auth) {
      return;
    }
    fileInput.disabled = true;
    setUploadStatus("Uploading...");
    try {
      const settingsKey = moduleSettingsKey(payload, module.name);
      const result = await uploadModuleFile(auth, module.name, file, settingsKey);
      urlInput.value = result.url;
      setPendingUrl(result.url);
      setUploadStatus("Upload complete.");
    } catch (err) {
      setUploadStatus("");
      alert((err as Error).message);
    } finally {
      fileInput.disabled = false;
    }
  });
  fileControl.append(fileInput);
  fileField.append(fileLabel, fileControl, fileHelp);

  const urlField = document.createElement("div");
  urlField.className = "field";
  const urlLabel = document.createElement("label");
  urlLabel.className = "label";
  urlLabel.textContent = schema?.properties?.[urlKey]?.title ?? "Image URL";
  const urlControl = document.createElement("div");
  urlControl.className = "control";
  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "input";
  urlInput.value = pendingUrl;
  urlInput.addEventListener("input", () => setPendingUrl(urlInput.value));
  urlControl.append(urlInput);
  urlField.append(urlLabel, urlControl);

  const actionsField = document.createElement("div");
  actionsField.className = "field";
  const actionsControl = document.createElement("div");
  actionsControl.className = "control buttons";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "button app-button app-primary";
  addButton.textContent = "Add to data";
  addButton.disabled = true;
  const discardButton = document.createElement("button");
  discardButton.type = "button";
  discardButton.className = "button app-button app-ghost";
  discardButton.textContent = "Discard";
  discardButton.disabled = true;

  addButton.addEventListener("click", () => {
    if (!pendingUrl) {
      return;
    }
    const entry: Record<string, unknown> = { [urlKey]: pendingUrl };
    if (altKey && pendingAlt.trim() !== "") {
      entry[altKey] = pendingAlt.trim();
    }
    const existing = data[targetKey];
    const list = Array.isArray(existing) ? existing : [];
    if (!Array.isArray(existing)) {
      data[targetKey] = list;
    }
    list.push(entry);
    editor?.setValue(data);
    urlInput.value = "";
    if (altInput) {
      altInput.value = "";
    }
    setPendingAlt("");
    setPendingUrl("");
  });

  discardButton.addEventListener("click", () => {
    urlInput.value = "";
    if (altInput) {
      altInput.value = "";
    }
    setPendingAlt("");
    setPendingUrl("");
  });

  actionsControl.append(addButton, discardButton);
  actionsField.append(actionsControl);

  const targetHelp = document.createElement("p");
  targetHelp.className = "help";
  targetHelp.textContent = `Adds to data.${targetKey}[]`;

  body.append(preview, fileField, urlField, actionsField, targetHelp);

  let altInput: HTMLInputElement | null = null;
  if (altKey) {
    const altField = document.createElement("div");
    altField.className = "field";
    const altLabel = document.createElement("label");
    altLabel.className = "label";
    altLabel.textContent = schema?.properties?.[altKey]?.title ?? "Alt text";
    const altControl = document.createElement("div");
    altControl.className = "control";
    altInput = document.createElement("input");
    altInput.type = "text";
    altInput.className = "input";
    altInput.value = pendingAlt;
    altInput.addEventListener("input", () => setPendingAlt(altInput.value));
    altControl.append(altInput);
    altField.append(altLabel, altControl);
    body.insertBefore(altField, actionsField);
  }

  moduleCard.append(buildHeader(module), body);
  panel.append(moduleCard);
};
