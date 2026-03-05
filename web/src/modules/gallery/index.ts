import type { DocumentPayload, ModuleDefinition } from "../../api";
import { deleteModuleFile, fetchModuleList } from "../../api";
import type { JsonEditorHandle } from "../../json-editor";
import type { ModuleRenderContext } from "../types";
import { moduleSettingsKey } from "../utils";
import { isRecord } from "../uploader/utils";

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
};

const resolveSchemaKeys = (schema: ModuleSchema | null) => {
  const properties = schema?.properties ?? {};
  const entries = Object.entries(properties);
  let urlKey: string | null = null;

  for (const [key, value] of entries) {
    if (!value || value.type !== "string") {
      continue;
    }
    if (value.format === "uri" || value.contentMediaType?.startsWith("image/")) {
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

const isSelected = (list: unknown, urlKey: string, url: string) => {
  if (!Array.isArray(list)) {
    return false;
  }
  return list.some((entry) => isRecord(entry) && entry[urlKey] === url);
};

export const renderGalleryModule = (panel: HTMLElement, context: ModuleRenderContext) => {
  const { module, payload, editor, auth } = context;
  const schema = isRecord(module.schema) ? (module.schema as ModuleSchema) : null;
  const data = coerceDataObject(payload, editor);
  const { urlKey, altKey } = resolveSchemaKeys(schema);
  const settings = isRecord(context.settings) ? context.settings : null;
  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const sourceSettings = settings && isRecord(settings.source) ? settings.source : null;
  const targetKey =
    typeof outputSettings?.target === "string" && outputSettings.target.trim() !== ""
      ? outputSettings.target.trim()
      : module.name;
  const settingsKey = moduleSettingsKey(payload, module.name);
  const initialVisibility =
    typeof sourceSettings?.visibility === "string" ? sourceSettings.visibility : "all";

  if (!urlKey) {
    const notice = document.createElement("div");
    notice.className = "notification is-warning is-light";
    notice.textContent = "Gallery schema must define a string field for the image.";
    panel.append(notice);
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "app-module";

  const header = document.createElement("div");
  header.className = "app-module-header";
  const headerRow = document.createElement("div");
  headerRow.className = "app-module-header-row";
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  headerRow.append(title);
  if (context.openSettings) {
    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "button app-button app-ghost app-icon-button app-module-settings-button";
    settingsButton.title = "Module settings";
    settingsButton.setAttribute("aria-label", "Module settings");
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
    settingsButton.addEventListener("click", context.openSettings);
    headerRow.append(settingsButton);
  }
  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} · ${module.author}` : module.description;
  header.append(headerRow, meta);

  const body = document.createElement("div");
  body.className = "app-module-body";

  const toggleField = document.createElement("div");
  toggleField.className = "field";
  const toggleLabel = document.createElement("label");
  toggleLabel.className = "label";
  toggleLabel.textContent = "Source";
  const toggleControl = document.createElement("div");
  toggleControl.className = "control";
  const toggleTabs = document.createElement("div");
  toggleTabs.className = "tabs is-toggle is-small";
  toggleTabs.innerHTML = `
    <ul>
      <li data-visibility="all"><a>All</a></li>
      <li data-visibility="public"><a>Public</a></li>
      <li data-visibility="private"><a>Private</a></li>
    </ul>
  `;
  toggleControl.append(toggleTabs);
  toggleField.append(toggleLabel, toggleControl);

  const grid = document.createElement("div");
  grid.className = "app-gallery-grid";

  const status = document.createElement("p");
  status.className = "help";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-background"></div>
    <div class="modal-card app-gallery-modal">
      <header class="modal-card-head">
        <p class="modal-card-title">Image</p>
        <button class="delete" aria-label="close"></button>
      </header>
      <section class="modal-card-body">
        <div class="app-gallery-modal-body"></div>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button class="button app-button app-primary" data-action="add">Add to data</button>
          <button class="button app-button app-ghost" data-action="remove">Remove from data</button>
          <button class="button app-button app-danger" data-action="delete">Delete file</button>
        </div>
      </footer>
    </div>
  `;

  body.append(toggleField, grid, status);
  wrapper.append(header, body);
  panel.append(wrapper, modal);

  const modalBody = modal.querySelector(".app-gallery-modal-body") as HTMLElement | null;
  const modalClose = modal.querySelector(".delete") as HTMLButtonElement | null;
  const modalBackdrop = modal.querySelector(".modal-background") as HTMLElement | null;
  const addButton = modal.querySelector<HTMLButtonElement>("[data-action='add']");
  const removeButton = modal.querySelector<HTMLButtonElement>("[data-action='remove']");
  const deleteButton = modal.querySelector<HTMLButtonElement>("[data-action='delete']");

  let currentVisibility =
    initialVisibility === "private" || initialVisibility === "public" || initialVisibility === "all"
      ? initialVisibility
      : "all";
  let currentItem: { url: string; path: string; visibility: string } | null = null;

  const setVisibilityActive = () => {
    toggleTabs.querySelectorAll("li").forEach((item) => {
      const value = item.getAttribute("data-visibility");
      item.classList.toggle("is-active", value === currentVisibility);
    });
  };

  const closeModal = () => {
    modal.classList.remove("is-active");
    currentItem = null;
  };

  const openModal = (item: { url: string; path: string; visibility: string }) => {
    currentItem = item;
    if (modalBody) {
      modalBody.innerHTML = "";
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = "";
      modalBody.append(img);
    }
    const list = data[targetKey];
    const selected = isSelected(list, urlKey, item.url);
    if (addButton) {
      addButton.disabled = selected;
    }
    if (removeButton) {
      removeButton.disabled = !selected;
    }
    modal.classList.add("is-active");
  };

  modalClose?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", closeModal);

  addButton?.addEventListener("click", () => {
    if (!currentItem) {
      return;
    }
    const list = Array.isArray(data[targetKey]) ? (data[targetKey] as Array<unknown>) : [];
    if (!Array.isArray(data[targetKey])) {
      data[targetKey] = list;
    }
    if (!isSelected(list, urlKey, currentItem.url)) {
      const entry: Record<string, unknown> = { [urlKey]: currentItem.url };
      if (altKey) {
        entry[altKey] = "";
      }
      list.push(entry);
    }
    editor?.setValue(data);
    closeModal();
    renderGrid();
  });

  removeButton?.addEventListener("click", () => {
    if (!currentItem) {
      return;
    }
    if (!Array.isArray(data[targetKey])) {
      closeModal();
      return;
    }
    const list = data[targetKey] as Array<unknown>;
    data[targetKey] = list.filter(
      (entry) => !(isRecord(entry) && entry[urlKey] === currentItem?.url)
    );
    editor?.setValue(data);
    closeModal();
    renderGrid();
  });

  deleteButton?.addEventListener("click", async () => {
    if (!auth || !currentItem) {
      return;
    }
    if (!confirm("Delete this file? This cannot be undone.")) {
      return;
    }
    try {
      await deleteModuleFile(auth, module.name, {
        path: currentItem.path,
        visibility: currentItem.visibility,
        settings: settingsKey,
      });
      if (Array.isArray(data[targetKey])) {
        data[targetKey] = (data[targetKey] as Array<unknown>).filter(
          (entry) => !(isRecord(entry) && entry[urlKey] === currentItem?.url)
        );
        editor?.setValue(data);
      }
      closeModal();
      void loadItems();
    } catch (err) {
      alert((err as Error).message);
    }
  });

  const renderGrid = () => {
    const list = data[targetKey];
    const selectedUrls = new Set<string>();
    if (Array.isArray(list)) {
      list.forEach((entry) => {
        if (isRecord(entry) && typeof entry[urlKey] === "string") {
          selectedUrls.add(entry[urlKey]);
        }
      });
    }

    grid.querySelectorAll(".app-gallery-item").forEach((node) => {
      const url = node.getAttribute("data-url") || "";
      node.classList.toggle("is-selected", selectedUrls.has(url));
    });
  };

  const loadItems = async () => {
    if (!auth) {
      status.textContent = "Login required.";
      return;
    }
    status.textContent = "Loading media...";
    grid.innerHTML = "";
    try {
      const response = await fetchModuleList(auth, module.name, {
        visibility: currentVisibility,
        settings: settingsKey,
      });
      const items = response.items ?? [];
      if (!items.length) {
        status.textContent = "No images found.";
        return;
      }
      status.textContent = "";
      items.forEach((item) => {
        if (!isRecord(item) || typeof item.url !== "string" || typeof item.path !== "string") {
          return;
        }
        const url = item.url;
        const path = item.path;
        const card = document.createElement("button");
        card.type = "button";
        card.className = "app-gallery-item";
        card.setAttribute("data-url", url);
        card.setAttribute("data-path", path);
        const img = document.createElement("img");
        img.src = url;
        img.alt = typeof item.filename === "string" ? item.filename : "";
        card.append(img);
        const itemVisibility = typeof item.visibility === "string" ? item.visibility : currentVisibility;
        card.addEventListener("click", () => openModal({ url, path, visibility: itemVisibility }));
        grid.append(card);
      });
      renderGrid();
    } catch (err) {
      status.textContent = (err as Error).message;
    }
  };

  toggleTabs.querySelectorAll("li").forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const value = tab.getAttribute("data-visibility");
      if (value !== "public" && value !== "private" && value !== "all") {
        return;
      }
      if (value === currentVisibility) {
        return;
      }
      currentVisibility = value;
      setVisibilityActive();
      void loadItems();
    });
  });

  setVisibilityActive();
  void loadItems();
};
