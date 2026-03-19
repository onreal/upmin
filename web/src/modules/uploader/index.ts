import type { DocumentPayload, ModuleDefinition } from "../../api";
import { uploadModuleFile } from "../../api";
import type { JsonEditorHandle } from "../../json-editor";
import type { ModuleRenderContext } from "../types";
import { moduleSettingsKey } from "../utils";
import { describeStorage, isRecord } from "./utils";
import { adminText } from "../../app/translations";

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

const buildHeader = (module: ModuleDefinition, openSettings?: () => void) => {
  const header = document.createElement("div");
  header.className = "app-module-header";
  const headerRow = document.createElement("div");
  headerRow.className = "app-module-header-row";
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  headerRow.append(title);
  if (openSettings) {
    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "button app-button app-ghost app-icon-button app-module-settings-button";
    settingsButton.title = adminText("modules.settings", "Module settings");
    settingsButton.setAttribute("aria-label", adminText("modules.settings", "Module settings"));
    settingsButton.innerHTML = `
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          ></path>
          <path
            d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          ></path>
        </svg>
      </span>
    `;
    settingsButton.addEventListener("click", openSettings);
    headerRow.append(settingsButton);
  }
  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} · ${module.author}` : module.description;
  header.append(headerRow, meta);
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
    notice.textContent = adminText("uploader.schemaImageRequired", "Uploader schema must define a string field for the image.");
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
      empty.textContent = adminText("uploader.noImageSelected", "No image selected.");
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
  fileLabel.textContent = adminText("uploader.uploadImage", "Upload image");
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
    setUploadStatus(adminText("common.uploading", "Uploading..."));
    try {
      const settingsKey = moduleSettingsKey(payload, module.name);
      const result = await uploadModuleFile(auth, module.name, file, settingsKey);
      urlInput.value = result.url;
      setPendingUrl(result.url);
      setUploadStatus(adminText("uploader.uploadComplete", "Upload complete."));
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
  urlLabel.textContent = schema?.properties?.[urlKey]?.title ?? adminText("uploader.imageUrl", "Image URL");
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
  addButton.textContent = adminText("chat.addToData", "Add to data");
  addButton.disabled = true;
  const discardButton = document.createElement("button");
  discardButton.type = "button";
  discardButton.className = "button app-button app-ghost";
  discardButton.textContent = adminText("common.discard", "Discard");
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
  targetHelp.textContent = adminText("uploader.targetHelp", "Adds to data.{target}[]", { target: targetKey });

  body.append(preview, fileField, urlField, actionsField, targetHelp);

  let altInput: HTMLInputElement | null = null;
  if (altKey) {
    const altField = document.createElement("div");
    altField.className = "field";
    const altLabel = document.createElement("label");
    altLabel.className = "label";
    altLabel.textContent = schema?.properties?.[altKey]?.title ?? adminText("uploader.altText", "Alt text");
    const altControl = document.createElement("div");
    altControl.className = "control";
    altInput = document.createElement("input");
    altInput.type = "text";
    altInput.className = "input";
    altInput.value = pendingAlt;
    const linkedAltInput = altInput;
    linkedAltInput.addEventListener("input", () => setPendingAlt(linkedAltInput.value));
    altControl.append(altInput);
    altField.append(altLabel, altControl);
    body.insertBefore(altField, actionsField);
  }

  moduleCard.append(buildHeader(module, context.openSettings), body);
  panel.append(moduleCard);
};
