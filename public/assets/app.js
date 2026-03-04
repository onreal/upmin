// web/src/api.ts
var STORAGE_KEY = "manage_auth";
var loadAuth = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
var saveAuth = (auth2) => {
  if (!auth2) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth2));
};
var buildHeaders = (auth2, json) => {
  const headers = {};
  if (json) {
    headers["Content-Type"] = "application/json";
  }
  if (auth2?.type === "apiKey") {
    headers["X-API-KEY"] = auth2.value;
  }
  if (auth2?.type === "token") {
    headers["Authorization"] = `Bearer ${auth2.value}`;
  }
  return headers;
};
var request = async (url, options, auth2) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(auth2, true),
      ...options.headers || {}
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }
  return await response.json();
};
var requestBlob = async (url, options, auth2) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(auth2, true),
      ...options.headers || {}
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/zip") && !contentType.includes("application/json") && !contentType.includes("application/gzip") && !contentType.includes("application/x-gzip") && !contentType.includes("application/octet-stream")) {
    throw new Error("Unexpected download response.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  const filename = match ? match[1] : null;
  return { blob, filename };
};
var requestForm = async (url, body, auth2) => {
  const response = await fetch(url, {
    method: "POST",
    body,
    headers: {
      ...buildHeaders(auth2, false)
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }
  return await response.json();
};
var loginWithApiKey = (apiKey) => request(
  "/api/auth/login",
  {
    method: "POST",
    body: JSON.stringify({ apiKey })
  },
  null
);
var loginWithPassword = (email, password) => request(
  "/api/auth/login",
  {
    method: "POST",
    body: JSON.stringify({ email, password })
  },
  null
);
var fetchNavigation = (auth2) => request(
  "/api/navigation",
  { method: "GET" },
  auth2
);
var fetchDocument = (auth2, id) => request(
  `/api/documents/${id}`,
  { method: "GET" },
  auth2
);
var updateDocument = (auth2, id, payload) => request(
  `/api/documents/${id}`,
  { method: "PUT", body: JSON.stringify(payload) },
  auth2
);
var createDocument = (auth2, requestPayload) => request(
  `/api/documents`,
  { method: "POST", body: JSON.stringify(requestPayload) },
  auth2
);
var fetchUiConfig = (auth2) => request("/api/ui-config", { method: "GET" }, auth2);
var fetchLayoutConfig = (auth2) => request("/api/layout-config", { method: "GET" }, auth2);
var downloadDocument = (auth2, id) => requestBlob(`/api/documents/${id}/export`, { method: "GET" }, auth2);
var downloadArchive = (auth2) => requestBlob(`/api/export.tar.gz`, { method: "GET" }, auth2);
var fetchModules = (auth2) => request("/api/modules", { method: "GET" }, auth2);
var uploadModuleFile = (auth2, moduleName, file, settingsKey) => {
  const body = new FormData();
  body.append("file", file);
  if (settingsKey) {
    body.append("settings", settingsKey);
  }
  return requestForm(
    `/api/modules/${moduleName}`,
    body,
    auth2
  );
};
var fetchModuleList = (auth2, moduleName, params) => {
  const search = new URLSearchParams();
  if (params.visibility) {
    search.set("visibility", params.visibility);
  }
  if (params.settings) {
    search.set("settings", params.settings);
  }
  const query = search.toString();
  const url = query ? `/api/modules/${moduleName}/list?${query}` : `/api/modules/${moduleName}/list`;
  return request(url, { method: "GET" }, auth2);
};
var deleteModuleFile = (auth2, moduleName, payload) => request(
  `/api/modules/${moduleName}/delete`,
  { method: "POST", body: JSON.stringify(payload) },
  auth2
);
var fetchAgents = (auth2) => request(`/api/agents`, { method: "GET" }, auth2);
var fetchAgent = (auth2, id) => request(`/api/agents/${id}`, { method: "GET" }, auth2);
var createAgent = (auth2, payload) => request(`/api/agents`, { method: "POST", body: JSON.stringify(payload) }, auth2);
var updateAgent = (auth2, id, payload) => request(
  `/api/agents/${id}`,
  { method: "PUT", body: JSON.stringify(payload) },
  auth2
);
var fetchAgentConversations = (auth2, id) => request(
  `/api/agents/${id}/conversations`,
  { method: "GET" },
  auth2
);
var createAgentConversation = (auth2, id) => request(
  `/api/agents/${id}/conversations`,
  { method: "POST", body: JSON.stringify({}) },
  auth2
);
var fetchAgentConversation = (auth2, id) => request(`/api/agents/conversations/${id}`, { method: "GET" }, auth2);
var appendAgentMessage = (auth2, id, content) => request(
  `/api/agents/conversations/${id}/messages`,
  { method: "POST", body: JSON.stringify({ content }) },
  auth2
);

// web/src/modules/utils.ts
var slug = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var moduleSettingsKey = (payload, moduleName) => {
  const moduleSlug = slug(moduleName) || "module";
  if (!payload.section) {
    const pageSlug = slug(payload.page) || "page";
    return `${pageSlug}-${moduleSlug}`;
  }
  const sectionSlug = slug(payload.name) || "section";
  return `${sectionSlug}-${moduleSlug}`;
};
var legacyModuleSettingsKey = (moduleName) => slug(moduleName) || "module";

// web/src/modules/uploader/utils.ts
var isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var describeStorage = (module) => {
  const parameters = module.parameters ?? {};
  if (!isRecord(parameters)) {
    return "";
  }
  const storage = parameters.storage;
  if (!isRecord(storage)) {
    return "";
  }
  const visibility = typeof storage.visibility === "string" ? storage.visibility : "public";
  const root = typeof storage.root === "string" ? storage.root : "media";
  const folder = typeof storage.folder === "string" && storage.folder ? `/${storage.folder}` : "";
  const location = `${root}${folder}`;
  return `Storage: ${visibility} \xB7 ${location}`;
};

// web/src/modules/gallery/index.ts
var resolveSchemaKeys = (schema) => {
  const properties = schema?.properties ?? {};
  const entries = Object.entries(properties);
  let urlKey = null;
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
var coerceDataObject = (payload, editor2) => {
  if (isRecord(payload.data)) {
    return payload.data;
  }
  payload.data = {};
  editor2?.setValue(payload.data);
  return payload.data;
};
var isSelected = (list, urlKey, url) => {
  if (!Array.isArray(list)) {
    return false;
  }
  return list.some((entry) => isRecord(entry) && entry[urlKey] === url);
};
var renderGalleryModule = (panel, context) => {
  const { module, payload, editor: editor2, auth: auth2 } = context;
  const schema = isRecord(module.schema) ? module.schema : null;
  const data = coerceDataObject(payload, editor2);
  const { urlKey, altKey } = resolveSchemaKeys(schema);
  const settings = isRecord(context.settings) ? context.settings : null;
  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const sourceSettings = settings && isRecord(settings.source) ? settings.source : null;
  const targetKey = typeof outputSettings?.target === "string" && outputSettings.target.trim() !== "" ? outputSettings.target.trim() : module.name;
  const settingsKey = moduleSettingsKey(payload, module.name);
  const initialVisibility = typeof sourceSettings?.visibility === "string" ? sourceSettings.visibility : "all";
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
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} \xB7 ${module.author}` : module.description;
  header.append(title, meta);
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
  const modalBody = modal.querySelector(".app-gallery-modal-body");
  const modalClose = modal.querySelector(".delete");
  const modalBackdrop = modal.querySelector(".modal-background");
  const addButton = modal.querySelector("[data-action='add']");
  const removeButton = modal.querySelector("[data-action='remove']");
  const deleteButton = modal.querySelector("[data-action='delete']");
  let currentVisibility = initialVisibility === "private" || initialVisibility === "public" || initialVisibility === "all" ? initialVisibility : "all";
  let currentItem = null;
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
  const openModal = (item) => {
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
    const list = Array.isArray(data[targetKey]) ? data[targetKey] : [];
    if (!Array.isArray(data[targetKey])) {
      data[targetKey] = list;
    }
    if (!isSelected(list, urlKey, currentItem.url)) {
      const entry = { [urlKey]: currentItem.url };
      if (altKey) {
        entry[altKey] = "";
      }
      list.push(entry);
    }
    editor2?.setValue(data);
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
    const list = data[targetKey];
    data[targetKey] = list.filter(
      (entry) => !(isRecord(entry) && entry[urlKey] === currentItem?.url)
    );
    editor2?.setValue(data);
    closeModal();
    renderGrid();
  });
  deleteButton?.addEventListener("click", async () => {
    if (!auth2 || !currentItem) {
      return;
    }
    if (!confirm("Delete this file? This cannot be undone.")) {
      return;
    }
    try {
      await deleteModuleFile(auth2, module.name, {
        path: currentItem.path,
        visibility: currentItem.visibility,
        settings: settingsKey
      });
      if (Array.isArray(data[targetKey])) {
        data[targetKey] = data[targetKey].filter(
          (entry) => !(isRecord(entry) && entry[urlKey] === currentItem?.url)
        );
        editor2?.setValue(data);
      }
      closeModal();
      void loadItems();
    } catch (err) {
      alert(err.message);
    }
  });
  const renderGrid = () => {
    const list = data[targetKey];
    const selectedUrls = /* @__PURE__ */ new Set();
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
    if (!auth2) {
      status.textContent = "Login required.";
      return;
    }
    status.textContent = "Loading media...";
    grid.innerHTML = "";
    try {
      const response = await fetchModuleList(auth2, module.name, {
        visibility: currentVisibility,
        settings: settingsKey
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
        const card = document.createElement("button");
        card.type = "button";
        card.className = "app-gallery-item";
        card.setAttribute("data-url", item.url);
        card.setAttribute("data-path", item.path);
        const img = document.createElement("img");
        img.src = item.url;
        img.alt = typeof item.filename === "string" ? item.filename : "";
        card.append(img);
        const itemVisibility = typeof item.visibility === "string" ? item.visibility : currentVisibility;
        card.addEventListener(
          "click",
          () => openModal({ url: item.url, path: item.path, visibility: itemVisibility })
        );
        grid.append(card);
      });
      renderGrid();
    } catch (err) {
      status.textContent = err.message;
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

// web/src/modules/uploader/index.ts
var resolveUploaderKeys = (schema) => {
  const properties = schema?.properties ?? {};
  const entries = Object.entries(properties);
  let urlKey = null;
  for (const [key, value] of entries) {
    if (!value || value.type !== "string") {
      continue;
    }
    if (value.format === "data-url" || value.format === "uri" || value.contentMediaType?.startsWith("image/")) {
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
var coerceDataObject2 = (payload, editor2) => {
  if (isRecord(payload.data)) {
    return payload.data;
  }
  payload.data = {};
  editor2?.setValue(payload.data);
  return payload.data;
};
var buildHeader = (module) => {
  const header = document.createElement("div");
  header.className = "app-module-header";
  const title = document.createElement("div");
  title.className = "app-module-title";
  title.textContent = module.name;
  const meta = document.createElement("div");
  meta.className = "app-module-meta";
  meta.textContent = module.author ? `${module.description} \xB7 ${module.author}` : module.description;
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
var renderUploaderModule = (panel, context) => {
  const { module, payload, editor: editor2, auth: auth2 } = context;
  const schema = isRecord(module.schema) ? module.schema : null;
  const data = coerceDataObject2(payload, editor2);
  const { urlKey, altKey } = resolveUploaderKeys(schema);
  const settings = isRecord(context.settings) ? context.settings : null;
  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const targetKey = typeof outputSettings?.target === "string" && outputSettings.target.trim() !== "" ? outputSettings.target.trim() : module.name;
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
  const setPendingUrl = (value) => {
    pendingUrl = value.trim();
    updatePreview();
    addButton.disabled = pendingUrl === "";
    discardButton.disabled = pendingUrl === "";
  };
  const setPendingAlt = (value) => {
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
  const setUploadStatus = (message) => {
    fileHelp.textContent = message;
  };
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file || !auth2) {
      return;
    }
    fileInput.disabled = true;
    setUploadStatus("Uploading...");
    try {
      const settingsKey = moduleSettingsKey(payload, module.name);
      const result = await uploadModuleFile(auth2, module.name, file, settingsKey);
      urlInput.value = result.url;
      setPendingUrl(result.url);
      setUploadStatus("Upload complete.");
    } catch (err) {
      setUploadStatus("");
      alert(err.message);
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
    const entry = { [urlKey]: pendingUrl };
    if (altKey && pendingAlt.trim() !== "") {
      entry[altKey] = pendingAlt.trim();
    }
    const existing = data[targetKey];
    const list = Array.isArray(existing) ? existing : [];
    if (!Array.isArray(existing)) {
      data[targetKey] = list;
    }
    list.push(entry);
    editor2?.setValue(data);
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
  let altInput = null;
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

// web/src/modules/registry.ts
var registry = {
  gallery: renderGalleryModule,
  uploader: renderUploaderModule
};
var renderModule = (name, panel, context) => {
  const renderer = registry[name];
  if (!renderer) {
    return false;
  }
  renderer(panel, context);
  return true;
};

// web/src/json-editor.ts
var isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var clone = (value) => JSON.parse(JSON.stringify(value));
var buildJsonEditor = (container, initialValue) => {
  let data = clone(initialValue ?? {});
  const openState = /* @__PURE__ */ new Map();
  const getPath = (parentPath, key) => {
    if (key === null) {
      return parentPath;
    }
    if (typeof key === "number") {
      return `${parentPath}[${key}]`;
    }
    return parentPath ? `${parentPath}.${key}` : String(key);
  };
  const snapshot = () => {
    openState.clear();
    container.querySelectorAll("details[data-path]").forEach((el) => {
      const details = el;
      openState.set(details.dataset.path || "", details.open);
    });
  };
  const restore = () => {
    container.querySelectorAll("details[data-path]").forEach((el) => {
      const details = el;
      const key = details.dataset.path || "";
      if (openState.has(key)) {
        details.open = openState.get(key) ?? false;
      }
    });
  };
  const createPrimitiveInput = (value, onChange) => {
    const type = typeof value;
    if (type === "boolean") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "checkbox";
      checkbox.checked = value;
      checkbox.addEventListener("change", () => onChange(checkbox.checked));
      return checkbox;
    }
    if (type === "number") {
      const input = document.createElement("input");
      input.type = "number";
      input.className = "input";
      input.step = "0.01";
      input.value = Number.isFinite(value) ? String(value) : "0";
      input.addEventListener("input", () => {
        const parsed = Number(input.value);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      });
      return input;
    }
    const textValue = value ?? "";
    if (typeof textValue === "string" && (textValue.length > 80 || textValue.includes("\n"))) {
      const textarea = document.createElement("textarea");
      textarea.className = "textarea";
      textarea.value = textValue;
      textarea.rows = Math.min(6, Math.max(3, textValue.split("\n").length));
      textarea.addEventListener("input", () => onChange(textarea.value));
      return textarea;
    }
    const text = document.createElement("input");
    text.type = "text";
    text.className = "input";
    text.value = String(textValue ?? "");
    text.addEventListener("input", () => onChange(text.value));
    return text;
  };
  const createRemoveButton = (handler) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button app-button app-danger is-small json-remove";
    button.textContent = "\u0391\u03C6\u03B1\u03AF\u03C1\u03B5\u03C3\u03B7";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    });
    return button;
  };
  const defaultValueForType = (type) => {
    switch (type) {
      case "number":
        return 0;
      case "boolean":
        return false;
      case "object":
        return {};
      case "array":
        return [];
      case "string":
      default:
        return "";
    }
  };
  const renderPrimitive = (value, parent, key, removeHandler) => {
    const row = document.createElement("div");
    row.className = "json-row";
    const keyEl = document.createElement("div");
    keyEl.className = "json-key";
    keyEl.textContent = typeof key === "number" ? `#${key + 1}` : key;
    const valueEl = document.createElement("div");
    valueEl.className = "json-value";
    const input = createPrimitiveInput(value, (next) => {
      if (Array.isArray(parent)) {
        parent[key] = next;
      } else {
        parent[key] = next;
      }
    });
    valueEl.append(input);
    const actions = document.createElement("div");
    actions.className = "json-actions";
    if (removeHandler) {
      actions.append(removeHandler);
    }
    row.append(keyEl, valueEl, actions);
    return row;
  };
  const renderObject = (obj, parent, key, path) => {
    const details = document.createElement("details");
    details.className = "json-node";
    details.open = true;
    details.dataset.path = path;
    const summary = document.createElement("summary");
    summary.className = "json-summary";
    const summaryLabel = document.createElement("span");
    summaryLabel.textContent = `${key ?? "object"} \xB7 ${Object.keys(obj).length} \u03C0\u03B5\u03B4\u03AF\u03B1`;
    summary.append(summaryLabel);
    details.append(summary);
    if (Array.isArray(parent) && key !== null) {
      const removeBtn = createRemoveButton(() => {
        parent.splice(key, 1);
        rerender();
      });
      removeBtn.classList.add("json-remove-inline");
      details.append(removeBtn);
    }
    const body = document.createElement("div");
    body.className = "json-children";
    Object.keys(obj).forEach((childKey) => {
      const child = obj[childKey];
      const childPath = getPath(path, childKey);
      if (Array.isArray(child) || isObject(child)) {
        const block = document.createElement("div");
        block.className = "json-block";
        block.append(renderNode(child, obj, childKey, childPath));
        body.append(block);
      } else {
        body.append(renderPrimitive(child, obj, childKey));
      }
    });
    details.append(body);
    return details;
  };
  const renderArray = (arr, parent, key, path) => {
    const details = document.createElement("details");
    details.className = "json-node";
    details.open = true;
    details.dataset.path = path;
    const summary = document.createElement("summary");
    summary.className = "json-summary";
    const summaryLabel = document.createElement("span");
    summaryLabel.textContent = `${key ?? "array"} \xB7 ${arr.length} \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1`;
    summary.append(summaryLabel);
    details.append(summary);
    if (Array.isArray(parent) && key !== null) {
      const removeBtn = createRemoveButton(() => {
        parent.splice(key, 1);
        rerender();
      });
      removeBtn.classList.add("json-remove-inline");
      details.append(removeBtn);
    }
    const body = document.createElement("div");
    body.className = "json-children";
    arr.forEach((item, index) => {
      const childPath = getPath(path, index);
      if (Array.isArray(item) || isObject(item)) {
        const wrapper = document.createElement("div");
        wrapper.className = "json-block";
        wrapper.append(renderNode(item, arr, index, childPath));
        body.append(wrapper);
      } else {
        const removeBtn = createRemoveButton(() => {
          arr.splice(index, 1);
          rerender();
        });
        body.append(renderPrimitive(item, arr, index, removeBtn));
      }
    });
    const addRow = document.createElement("div");
    addRow.className = "json-add";
    const typeSelect = document.createElement("select");
    ["string", "number", "boolean", "object", "array"].forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      typeSelect.append(option);
    });
    const selectWrap = document.createElement("div");
    selectWrap.className = "select is-small";
    selectWrap.append(typeSelect);
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "button app-button app-ghost is-small";
    addBtn.textContent = "\u03A0\u03C1\u03BF\u03C3\u03B8\u03AE\u03BA\u03B7 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03BF\u03C5";
    addBtn.addEventListener("click", () => {
      if (arr.length > 0) {
        arr.push(clone(arr[0]));
      } else {
        arr.push(defaultValueForType(typeSelect.value));
      }
      rerender();
    });
    addRow.append(selectWrap, addBtn);
    body.append(addRow);
    details.append(body);
    return details;
  };
  const renderNode = (node, parent, key, path) => {
    if (Array.isArray(node)) {
      return renderArray(node, parent, key, path);
    }
    if (isObject(node)) {
      return renderObject(node, parent, key, path);
    }
    return renderPrimitive(node, parent, key);
  };
  const render = () => {
    container.innerHTML = "";
    container.append(renderNode(data, null, "data", "data"));
    restore();
  };
  const rerender = () => {
    snapshot();
    render();
  };
  render();
  return {
    getValue: () => clone(data),
    setValue: (value) => {
      data = clone(value ?? {});
      rerender();
    }
  };
};

// web/src/main.ts
var app = document.getElementById("app");
if (!app) {
  throw new Error("Missing app container");
}
var auth = loadAuth();
var currentDocument = null;
var editor = null;
var authDocumentId = null;
var layoutConfig = {};
var modules = [];
var agents = [];
var navigationPages = [];
var moduleSettingsCache = /* @__PURE__ */ new Map();
var currentAgent = null;
var currentConversation = null;
var agentPoller = null;
var THEME_KEY = "manage_theme";
var tokenRegistry = [
  "app-gap-xs",
  "app-gap-sm",
  "app-gap-md",
  "app-gap-lg",
  "app-radius-sm",
  "app-radius-md",
  "app-radius-lg",
  "app-shadow",
  "app-border",
  "app-bg",
  "app-surface",
  "app-text",
  "app-muted",
  "app-accent",
  "app-accent-contrast",
  "app-danger"
];
var normalizeModuleList = (modulesValue, fallback) => {
  const list = Array.isArray(modulesValue) ? modulesValue : [];
  if (fallback && !list.includes(fallback)) {
    list.push(fallback);
  }
  return list.map((entry) => entry.trim()).filter((entry) => entry !== "").filter((entry, index, self) => self.indexOf(entry) === index);
};
var moduleChecklistHtml = (selected = []) => {
  if (!modules.length) {
    return `<p class="help">No modules available.</p>`;
  }
  const selectedSet = new Set(selected);
  return modules.map((module) => {
    const isChecked = selectedSet.has(module.name);
    const description = module.description ? `<span class="app-module-option-meta">${module.description}</span>` : "";
    return `
        <label class="checkbox app-module-option">
          <input type="checkbox" value="${module.name}" ${isChecked ? "checked" : ""} />
          <span class="app-module-option-label">${module.name}</span>
          ${description}
        </label>
      `;
  }).join("");
};
var readSelectedModules = (container) => {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll("input[type='checkbox']")).filter((input) => input.checked).map((input) => input.value.trim()).filter((value) => value !== "");
};
var findModuleDefinition = (name) => modules.find((module) => module.name === name) ?? null;
var uiTokens = {
  light: {},
  dark: {}
};
var getStoredTheme = () => {
  const value = localStorage.getItem(THEME_KEY);
  return value === "dark" || value === "light" ? value : null;
};
var currentTheme = getStoredTheme() ?? "light";
var applyTokensForTheme = (theme) => {
  const root = document.documentElement;
  const tokens = uiTokens[theme];
  tokenRegistry.forEach((key) => {
    const cssKey = `--${key}`;
    if (tokens[key]) {
      root.style.setProperty(cssKey, tokens[key]);
    } else {
      root.style.removeProperty(cssKey);
    }
  });
};
var setTheme = (theme, persist = true) => {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  applyTokensForTheme(theme);
  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
};
var isRecord2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var stopAgentPolling = () => {
  if (agentPoller !== null) {
    window.clearInterval(agentPoller);
    agentPoller = null;
  }
};
var clearAgentState = () => {
  stopAgentPolling();
  currentAgent = null;
  currentConversation = null;
};
var encodeDocumentId = (store, path) => {
  const raw = `${store}:${path}`;
  const encoded = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return encoded;
};
var fetchModuleSettings = async (moduleName, payload) => {
  if (!auth) {
    return null;
  }
  const key = moduleSettingsKey(payload, moduleName);
  if (moduleSettingsCache.has(key)) {
    return moduleSettingsCache.get(key) ?? null;
  }
  const path = `modules/${key}.json`;
  const id = encodeDocumentId("private", path);
  try {
    const doc = await fetchDocument(auth, id);
    const settings = isRecord2(doc.payload.data) ? doc.payload.data : null;
    moduleSettingsCache.set(key, settings);
    return settings;
  } catch {
    if (!payload.section) {
      const legacyKey = legacyModuleSettingsKey(moduleName);
      if (legacyKey) {
        const legacyPath = `modules/${legacyKey}.json`;
        const legacyId = encodeDocumentId("private", legacyPath);
        try {
          const legacyDoc = await fetchDocument(auth, legacyId);
          const legacySettings = isRecord2(legacyDoc.payload.data) ? legacyDoc.payload.data : null;
          moduleSettingsCache.set(key, legacySettings);
          return legacySettings;
        } catch {
        }
      }
    }
    moduleSettingsCache.set(key, null);
    return null;
  }
};
var getAgentField = (data, key) => typeof data[key] === "string" ? data[key] : "";
var applyUiConfig = (config) => {
  const normalize = (input) => {
    const output = {};
    if (!input)
      return output;
    tokenRegistry.forEach((key) => {
      if (input[key]) {
        output[key] = input[key];
      }
    });
    return output;
  };
  uiTokens.light = normalize(config.tokens);
  uiTokens.dark = normalize(config.darkTokens);
  const storedTheme = getStoredTheme();
  if (!storedTheme && (config.theme === "light" || config.theme === "dark")) {
    setTheme(config.theme, false);
    return;
  }
  setTheme(currentTheme, false);
};
setTheme(currentTheme, false);
var getUserLabel = () => {
  if (isTokenAuth(auth) && auth.user) {
    const name = `${auth.user.firstname} ${auth.user.lastname}`.trim();
    return name || auth.user.email;
  }
  if (auth?.type === "apiKey") {
    return "API Key";
  }
  return "Guest";
};
var headerCopy = () => ({
  title: layoutConfig.header?.title ?? "Manage",
  subtitle: layoutConfig.header?.subtitle ?? "Stateless Admin",
  settingsLabel: layoutConfig.header?.settingsLabel ?? "Settings",
  themeLabel: layoutConfig.header?.themeLabel ?? "Theme",
  createLabel: layoutConfig.header?.createLabel ?? "Create +",
  profileLabel: layoutConfig.header?.profileLabel ?? "Profile",
  logoutLabel: layoutConfig.header?.logoutLabel ?? "Logout"
});
var sidebarCopy = () => ({
  publicLabel: layoutConfig.sidebar?.publicLabel ?? "Public"
});
var profileCopy = () => ({
  title: layoutConfig.profile?.title ?? "Profile",
  subtitle: layoutConfig.profile?.subtitle ?? "\u0395\u03BD\u03B7\u03BC\u03B5\u03C1\u03CE\u03C3\u03C4\u03B5 \u03C4\u03B1 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1 \u03C3\u03B1\u03C2.",
  saveLabel: layoutConfig.profile?.saveLabel ?? "Save Profile"
});
var isAuthData = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value;
  if (!Array.isArray(record.users)) {
    return false;
  }
  return record.users.every((user) => user && typeof user === "object");
};
var isTokenAuth = (value) => {
  return !!value && value.type === "token";
};
var renderLogin = (error) => {
  clearAgentState();
  app.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="box app-surface">
          <div class="mb-4">
            <h1 class="title is-4">Admin Login</h1>
            <p class="app-muted">\u03A3\u03C5\u03BD\u03B4\u03B5\u03B8\u03B5\u03AF\u03C4\u03B5 \u03BC\u03B5 API key \u03AE email/password.</p>
          </div>
          ${error ? `<div class="notification is-danger is-light">${error}</div>` : ""}
          <div class="columns is-variable is-4">
            <div class="column">
              <form id="api-key-form">
                <div class="field">
                  <label class="label">API Key</label>
                  <div class="control">
                    <input class="input" type="password" name="apiKey" required />
                  </div>
                </div>
                <button type="submit" class="button app-button app-primary">\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7 \u03BC\u03B5 API Key</button>
              </form>
            </div>
            <div class="column">
              <form id="user-form">
                <div class="field">
                  <label class="label">Email</label>
                  <div class="control">
                    <input class="input" type="email" name="email" required />
                  </div>
                </div>
                <div class="field">
                  <label class="label">Password</label>
                  <div class="control">
                    <input class="input" type="password" name="password" required />
                  </div>
                </div>
                <button type="submit" class="button app-button app-primary">\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7 \u03C7\u03C1\u03AE\u03C3\u03C4\u03B7</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  const apiKeyForm = document.getElementById("api-key-form");
  const userForm = document.getElementById("user-form");
  apiKeyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(apiKeyForm);
    const apiKey = String(form.get("apiKey") || "");
    if (!apiKey) {
      return;
    }
    try {
      await loginWithApiKey(apiKey);
      auth = { type: "apiKey", value: apiKey };
      saveAuth(auth);
      await renderApp();
    } catch (err) {
      renderLogin(err.message);
    }
  });
  userForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(userForm);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    if (!email || !password) {
      return;
    }
    try {
      const result = await loginWithPassword(email, password);
      auth = { type: "token", value: result.token, user: result.user };
      saveAuth(auth);
      await renderApp();
    } catch (err) {
      renderLogin(err.message);
    }
  });
};
var renderAppShell = () => {
  const header = headerCopy();
  const sidebar = sidebarCopy();
  app.innerHTML = `
    <nav class="navbar app-surface is-spaced" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <a class="navbar-item">
          <span class="title is-5 mb-0">${header.title}</span>
        </a>
        <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" data-target="adminNavbar">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
      <div id="adminNavbar" class="navbar-menu">
        <div class="navbar-start">
          <div class="navbar-item app-muted">${header.subtitle}</div>
        </div>
        <div class="navbar-end">
          <div class="navbar-item">
            <div class="app-nav-actions">
              <button id="create-action" class="button app-button app-primary">
                <span class="icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" focusable="false" aria-hidden="true">
                    <path
                      d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </span>
                <span>${header.createLabel}</span>
              </button>
              <button
                id="export-zip-header"
                class="button app-button app-ghost"
                aria-label="Export all documents"
                title="Export all documents"
              >
                <span class="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
                    <path
                      d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linejoin="round"
                    ></path>
                    <path
                      d="M14 2v5h5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linejoin="round"
                    ></path>
                    <path
                      d="M10 7h2v2h-2V7zm0 3h2v2h-2v-2zm0 3h2v2h-2v-2zm0 3h2v2h-2v-2"
                      fill="currentColor"
                    ></path>
                  </svg>
                </span>
              </button>
              <button
                id="theme-toggle"
                class="button app-button app-ghost"
                aria-label="${header.themeLabel}"
                title="${header.themeLabel}"
              >
                <span class="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
                    <circle
                      cx="12"
                      cy="12"
                      r="4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                    ></circle>
                    <path
                      d="M12 3v2m0 14v2M3 12h2m14 0h2M6.5 6.5l1.4 1.4m8.2 8.2l1.4 1.4M6.5 17.5l1.4-1.4m8.2-8.2l1.4-1.4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                    ></path>
                  </svg>
                </span>
              </button>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="private-dropdown">
            <a class="navbar-link">${header.settingsLabel}</a>
            <div class="navbar-dropdown">
              <div id="nav-private"></div>
              <hr class="navbar-divider" />
              <div class="navbar-item is-size-7 app-muted">Modules</div>
              <a class="navbar-item" id="modules-link">Modules</a>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="agents-dropdown">
            <a class="navbar-link">Agents</a>
            <div class="navbar-dropdown">
              <div id="nav-agents"></div>
              <hr class="navbar-divider" />
              <a class="navbar-item" id="agents-create-link">Create agent</a>
            </div>
          </div>
          <div class="navbar-item has-dropdown" id="user-dropdown">
            <a class="navbar-link" id="user-label">${getUserLabel()}</a>
            <div class="navbar-dropdown">
              <a class="navbar-item" id="profile-link">${header.profileLabel}</a>
              <hr class="navbar-divider" />
              <a class="navbar-item" id="logout">${header.logoutLabel}</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <section class="section pt-4">
      <div class="container is-fluid">
        <div class="columns is-variable is-4">
          <aside class="column is-one-quarter">
            <div class="box app-surface">
              <aside class="menu">
                <p class="menu-label">${sidebar.publicLabel}</p>
                <ul id="nav-public" class="menu-list"></ul>
              </aside>
            </div>
          </aside>
          <div class="column">
            <div id="content" class="box app-surface">
              <p class="app-muted">\u0395\u03C0\u03B9\u03BB\u03AD\u03BE\u03C4\u03B5 \u03BC\u03B9\u03B1 \u03B5\u03BD\u03CC\u03C4\u03B7\u03C4\u03B1.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div class="modal" id="create-modal">
      <div class="modal-background" data-close="create"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Create document</p>
          <button class="delete" aria-label="close" data-close="create"></button>
        </header>
        <section class="modal-card-body">
          <div id="create-error" class="notification is-danger is-light is-hidden"></div>
          <form id="create-form">
            <div class="columns is-variable is-4 is-multiline">
              <div class="column is-half">
                <div class="field">
                  <label class="label">Filename</label>
                  <div class="control">
                    <input
                      id="create-path"
                      class="input"
                      type="text"
                      placeholder="content.json"
                      autocomplete="off"
                    />
                  </div>
                  <p class="help">Must end with .json</p>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Order</label>
                  <div class="control">
                    <input
                      id="create-order"
                      class="input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                    />
                  </div>
                  <p class="help">Lower numbers appear first.</p>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Store</label>
                  <div class="control">
                    <div class="tabs is-toggle is-small is-fullwidth">
                      <ul>
                        <li class="is-active">
                          <a href="#" data-store="public">Public</a>
                        </li>
                        <li>
                          <a href="#" data-store="private">Private</a>
                        </li>
                      </ul>
                    </div>
                    <input id="create-store" type="hidden" value="public" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Page</label>
                  <div class="control">
                    <input id="create-page" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Name</label>
                  <div class="control">
                    <input id="create-name" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Language</label>
                  <div class="control">
                    <input id="create-language" class="input" type="text" autocomplete="off" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Modules</label>
                  <div class="control">
                    <div id="create-modules" class="app-module-picker">
                      ${moduleChecklistHtml()}
                    </div>
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Section</label>
                  <div class="control">
                    <div class="select is-fullwidth">
                      <select id="create-section">
                        <option value="false" selected>false</option>
                        <option value="true">true</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div class="column is-full">
                <div class="field">
                  <label class="label">Data (JSON)</label>
                  <div class="control">
                    <textarea id="create-data" class="textarea" rows="6">{}</textarea>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
        <footer class="modal-card-foot">
          <button form="create-form" type="submit" class="button app-button app-primary">Create</button>
          <button id="create-cancel" type="button" class="button app-button app-ghost">Cancel</button>
        </footer>
      </div>
    </div>
    <div class="modal" id="agent-modal">
      <div class="modal-background" data-close="agent"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Create agent</p>
          <button class="delete" aria-label="close" data-close="agent"></button>
        </header>
        <section class="modal-card-body">
          <div id="agent-error" class="notification is-danger is-light is-hidden"></div>
          <form id="agent-form">
            <div class="tabs is-toggle is-fullwidth mb-4">
              <ul>
                <li class="is-active"><a data-agent-store="public">Public</a></li>
                <li><a data-agent-store="private">Private</a></li>
              </ul>
            </div>
            <input type="hidden" id="agent-store" value="public" />
            <div class="columns is-variable is-4 is-multiline">
              <div class="column is-half">
                <div class="field">
                  <label class="label">Name</label>
                  <div class="control">
                    <input id="agent-name" class="input" type="text" placeholder="Assistant" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Provider</label>
                  <div class="control">
                    <input id="agent-provider" class="input" type="text" placeholder="openai" />
                  </div>
                </div>
              </div>
              <div class="column is-half">
                <div class="field">
                  <label class="label">Model</label>
                  <div class="control">
                    <input id="agent-model" class="input" type="text" placeholder="gpt-4.1" />
                  </div>
                </div>
              </div>
              <div class="column is-full">
                <div class="field">
                  <label class="label">System prompt</label>
                  <div class="control">
                    <textarea id="agent-system" class="textarea" rows="3" placeholder="System prompt"></textarea>
                  </div>
                </div>
              </div>
              <div class="column is-full">
                <div class="field">
                  <label class="label">Admin prompt</label>
                  <div class="control">
                    <textarea id="agent-admin" class="textarea" rows="3" placeholder="Admin prompt"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
        <footer class="modal-card-foot">
          <button id="agent-cancel" class="button app-button app-ghost">Cancel</button>
          <button form="agent-form" type="submit" class="button app-button app-primary">Create agent</button>
        </footer>
      </div>
    </div>
  `;
  const burger = document.querySelector(".navbar-burger");
  const menu = document.getElementById("adminNavbar");
  burger?.addEventListener("click", () => {
    burger.classList.toggle("is-active");
    menu?.classList.toggle("is-active");
  });
  const dropdowns = [
    document.getElementById("private-dropdown"),
    document.getElementById("agents-dropdown"),
    document.getElementById("user-dropdown")
  ];
  dropdowns.forEach((dropdown) => {
    const link = dropdown?.querySelector(".navbar-link");
    link?.addEventListener("click", (event) => {
      event.preventDefault();
      dropdown?.classList.toggle("is-active");
    });
  });
  document.addEventListener("click", (event) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown || dropdown.contains(event.target)) {
        return;
      }
      dropdown.classList.remove("is-active");
    });
  });
  document.getElementById("logout")?.addEventListener("click", () => {
    auth = null;
    saveAuth(null);
    renderLogin();
  });
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const next = currentTheme === "light" ? "dark" : "light";
    setTheme(next);
  });
  document.getElementById("profile-link")?.addEventListener("click", () => {
    void renderProfile();
  });
  document.getElementById("modules-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    renderModulesView();
    document.getElementById("private-dropdown")?.classList.remove("is-active");
  });
  document.getElementById("export-zip-header")?.addEventListener("click", async () => {
    if (!auth) {
      return;
    }
    try {
      const result = await downloadArchive(auth);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename ?? "manage-export.tar.gz";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    } catch (err) {
      alert(err.message);
    }
  });
  const createModal = document.getElementById("create-modal");
  const createError = document.getElementById("create-error");
  const createForm = document.getElementById("create-form");
  const createStoreInput = document.getElementById("create-store");
  const createStoreTabs = Array.from(
    createModal?.querySelectorAll("[data-store]") ?? []
  );
  const showCreateError = (message) => {
    if (!createError) {
      alert(message);
      return;
    }
    createError.textContent = message;
    createError.classList.remove("is-hidden");
  };
  const clearCreateError = () => {
    if (!createError) {
      return;
    }
    createError.textContent = "";
    createError.classList.add("is-hidden");
  };
  const setCreateStore = (store) => {
    if (createStoreInput) {
      createStoreInput.value = store;
    }
    createStoreTabs.forEach((tab) => {
      const value = tab.getAttribute("data-store");
      tab.parentElement?.classList.toggle("is-active", value === store);
    });
  };
  const openCreateModal = () => {
    clearCreateError();
    createForm?.reset();
    const dataInput = document.getElementById("create-data");
    if (dataInput) {
      dataInput.value = "{}";
    }
    setCreateStore("public");
    createModal?.classList.add("is-active");
  };
  const closeCreateModal = () => {
    createModal?.classList.remove("is-active");
    clearCreateError();
  };
  document.getElementById("create-action")?.addEventListener("click", openCreateModal);
  document.getElementById("create-cancel")?.addEventListener("click", closeCreateModal);
  createModal?.querySelectorAll("[data-close='create']").forEach((el) => {
    el.addEventListener("click", closeCreateModal);
  });
  createStoreTabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const value = tab.getAttribute("data-store");
      if (value === "public" || value === "private") {
        setCreateStore(value);
      }
    });
  });
  createForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth) {
      return;
    }
    clearCreateError();
    const path = document.getElementById("create-path")?.value.trim() || "";
    const orderRaw = document.getElementById("create-order")?.value.trim() || "";
    const page = document.getElementById("create-page")?.value.trim() || "";
    const name = document.getElementById("create-name")?.value.trim() || "";
    const language = document.getElementById("create-language")?.value.trim() || "";
    const modulesValue = readSelectedModules(document.getElementById("create-modules"));
    const section = document.getElementById("create-section")?.value === "true";
    const storeValue = document.getElementById("create-store")?.value === "private" ? "private" : "public";
    const dataRaw = document.getElementById("create-data")?.value.trim() || "";
    if (!path) {
      showCreateError("Filename is required.");
      return;
    }
    if (!path.endsWith(".json")) {
      showCreateError("Filename must end with .json.");
      return;
    }
    if (path.includes("/") || path.includes("\\") || path.includes("..")) {
      showCreateError("Filename must not include path separators.");
      return;
    }
    if (!page) {
      showCreateError("Page is required.");
      return;
    }
    if (!name) {
      showCreateError("Name is required.");
      return;
    }
    if (!orderRaw) {
      showCreateError("Order is required.");
      return;
    }
    const orderValue = Number(orderRaw);
    if (!Number.isInteger(orderValue)) {
      showCreateError("Order must be an integer.");
      return;
    }
    if (!dataRaw) {
      showCreateError("Data is required.");
      return;
    }
    let data;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      showCreateError("Data must be valid JSON.");
      return;
    }
    const payloadToCreate = {
      type: "page",
      page,
      name,
      language: language || void 0,
      order: orderValue,
      section,
      modules: modulesValue.length ? modulesValue : void 0,
      data
    };
    try {
      const created = await createDocument(auth, {
        store: storeValue,
        path,
        payload: payloadToCreate
      });
      closeCreateModal();
      await refreshNavigation();
      await loadDocument(created.id);
    } catch (err) {
      showCreateError(err.message);
    }
  });
  const agentModal = document.getElementById("agent-modal");
  const agentError = document.getElementById("agent-error");
  const agentForm = document.getElementById("agent-form");
  const agentStoreInput = document.getElementById("agent-store");
  const agentStoreTabs = Array.from(
    agentModal?.querySelectorAll("[data-agent-store]") ?? []
  );
  const showAgentError = (message) => {
    if (!agentError) {
      alert(message);
      return;
    }
    agentError.textContent = message;
    agentError.classList.remove("is-hidden");
  };
  const clearAgentError = () => {
    if (!agentError) {
      return;
    }
    agentError.textContent = "";
    agentError.classList.add("is-hidden");
  };
  const setAgentStore = (store) => {
    if (agentStoreInput) {
      agentStoreInput.value = store;
    }
    agentStoreTabs.forEach((tab) => {
      const value = tab.getAttribute("data-agent-store");
      tab.parentElement?.classList.toggle("is-active", value === store);
    });
  };
  const openAgentModal = () => {
    clearAgentError();
    agentForm?.reset();
    setAgentStore("public");
    agentModal?.classList.add("is-active");
  };
  const closeAgentModal = () => {
    agentModal?.classList.remove("is-active");
    clearAgentError();
  };
  document.getElementById("agents-create-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    openAgentModal();
    document.getElementById("agents-dropdown")?.classList.remove("is-active");
  });
  document.getElementById("agent-cancel")?.addEventListener("click", closeAgentModal);
  agentModal?.querySelectorAll("[data-close='agent']").forEach((el) => {
    el.addEventListener("click", closeAgentModal);
  });
  agentStoreTabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const value = tab.getAttribute("data-agent-store");
      if (value === "public" || value === "private") {
        setAgentStore(value);
      }
    });
  });
  agentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth) {
      return;
    }
    clearAgentError();
    const name = document.getElementById("agent-name")?.value.trim() || "";
    const provider = document.getElementById("agent-provider")?.value.trim() || "";
    const model = document.getElementById("agent-model")?.value.trim() || "";
    const systemPrompt = document.getElementById("agent-system")?.value.trim() || "";
    const adminPrompt = document.getElementById("agent-admin")?.value.trim() || "";
    const storeValue = document.getElementById("agent-store")?.value === "private" ? "private" : "public";
    if (!name || !provider || !model || !systemPrompt || !adminPrompt) {
      showAgentError("All fields are required.");
      return;
    }
    try {
      const created = await createAgent(auth, {
        store: storeValue,
        name,
        provider,
        model,
        systemPrompt,
        adminPrompt
      });
      closeAgentModal();
      await loadAgents();
      await renderAgentView(created);
    } catch (err) {
      showAgentError(err.message);
    }
  });
};
var determinePageStore = (page) => {
  if (page.store === "private") {
    return "private";
  }
  if (page.store === "public") {
    return "public";
  }
  const hasPrivate = page.sections.some((section) => section.store === "private");
  const hasPublic = page.sections.some((section) => section.store === "public");
  if (hasPrivate && !hasPublic) {
    return "private";
  }
  return "public";
};
var findAuthDocumentId = (pages) => {
  for (const page of pages) {
    if (page.store === "private" && page.path?.endsWith("auth.json") && page.documentId) {
      return page.documentId;
    }
    for (const section of page.sections) {
      if (section.store === "private" && section.path.endsWith("auth.json")) {
        return section.id;
      }
    }
  }
  return null;
};
var renderNavList = (container, pages, mode) => {
  container.innerHTML = "";
  pages.filter((page) => determinePageStore(page) === mode).forEach((page) => {
    const pageItem = document.createElement("li");
    const pageLink = document.createElement("a");
    pageLink.textContent = page.name;
    if (page.documentId && currentDocument?.id === page.documentId) {
      pageLink.classList.add("is-active");
    }
    pageLink.addEventListener("click", () => {
      if (page.documentId) {
        void loadDocument(page.documentId);
      }
    });
    pageItem.append(pageLink);
    if (page.sections.length > 0) {
      const sectionList = document.createElement("ul");
      page.sections.forEach((section) => {
        const sectionItem = document.createElement("li");
        const sectionLink = document.createElement("a");
        sectionLink.textContent = section.name;
        if (currentDocument?.id === section.id) {
          sectionLink.classList.add("is-active");
        }
        sectionLink.addEventListener("click", () => {
          void loadDocument(section.id);
        });
        sectionItem.append(sectionLink);
        sectionList.append(sectionItem);
      });
      pageItem.append(sectionList);
    }
    container.append(pageItem);
  });
};
var renderNavigation = (pages) => {
  const navPublic = document.getElementById("nav-public");
  const navPrivate = document.getElementById("nav-private");
  if (!navPublic || !navPrivate) {
    return;
  }
  authDocumentId = findAuthDocumentId(pages);
  renderNavList(navPublic, pages, "public");
  navPrivate.innerHTML = "";
  pages.filter((page) => determinePageStore(page) === "private").forEach((page) => {
    const pageItem = document.createElement("a");
    pageItem.className = "navbar-item";
    pageItem.textContent = page.name;
    pageItem.addEventListener("click", () => {
      if (page.documentId) {
        void loadDocument(page.documentId);
      }
    });
    navPrivate.append(pageItem);
    page.sections.forEach((section) => {
      const sectionItem = document.createElement("a");
      sectionItem.className = "navbar-item is-size-7";
      sectionItem.textContent = `\u21B3 ${section.name}`;
      sectionItem.addEventListener("click", () => {
        void loadDocument(section.id);
      });
      navPrivate.append(sectionItem);
    });
  });
};
var renderAgentsMenu = () => {
  const container = document.getElementById("nav-agents");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!agents.length) {
    container.innerHTML = `<div class="navbar-item is-size-7 app-muted">No agents found.</div>`;
    return;
  }
  agents.forEach((agent) => {
    const link = document.createElement("a");
    link.className = "navbar-item";
    link.textContent = agent.name;
    link.addEventListener("click", () => {
      void loadAgent(agent.id);
      document.getElementById("agents-dropdown")?.classList.remove("is-active");
    });
    container.append(link);
  });
};
var renderModulePanel = async (doc) => {
  const panel = document.getElementById("module-panel");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  const moduleNames = normalizeModuleList(doc.payload.modules, doc.payload.module ?? null);
  if (!moduleNames.length) {
    panel.classList.add("is-hidden");
    return;
  }
  panel.classList.remove("is-hidden");
  const moduleSettingsList = await Promise.all(
    moduleNames.map(async (moduleName) => ({
      name: moduleName,
      settings: await fetchModuleSettings(moduleName, doc.payload)
    }))
  );
  moduleSettingsList.forEach(({ name: moduleName, settings }) => {
    const module = findModuleDefinition(moduleName);
    if (!module) {
      const notice = document.createElement("div");
      notice.className = "notification is-warning is-light";
      notice.textContent = `Module "${moduleName}" was not found.`;
      panel.append(notice);
      return;
    }
    const handled = renderModule(module.name, panel, {
      auth,
      module,
      payload: doc.payload,
      editor,
      settings
    });
    if (!handled) {
      const placeholder = document.createElement("div");
      placeholder.className = "notification is-light";
      placeholder.textContent = `${module.name} module is available but has no renderer yet.`;
      panel.append(placeholder);
    }
  });
};
var renderModulesView = () => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }
  clearAgentState();
  const intro = `
    <div class="mb-4">
      <h1 class="title is-4">Modules</h1>
      <p class="app-muted">Available modules loaded from manage/src/Modules.</p>
    </div>
  `;
  const list = modules.map((module) => {
    const author = module.author ? ` \xB7 ${module.author}` : "";
    const storage = describeStorage(module);
    const storageLine = storage ? `<div class="app-module-row-meta">${storage}</div>` : "";
    return `
        <div class="app-module-row">
          <div class="app-module-row-title">${module.name}</div>
          <div class="app-module-row-meta">${module.description}${author}</div>
          <div class="app-module-row-meta">Input: ${module.input} \xB7 Output: ${module.output}</div>
          ${storageLine}
        </div>
      `;
  }).join("");
  const settingsDocs = navigationPages.filter((page) => page.page === "modules").flatMap((page) => page.sections).filter((section) => section.store === "private").map((section) => ({
    id: section.id,
    name: section.name,
    path: section.path
  }));
  const settingsList = settingsDocs.map(
    (doc) => `
        <div class="app-module-row">
          <div class="app-module-row-title">${doc.name}</div>
          <div class="app-module-row-meta">${doc.path}</div>
          <div class="buttons">
            <button class="button app-button app-ghost" data-module-settings="${encodeURIComponent(
      doc.id
    )}">Edit settings</button>
          </div>
        </div>
      `
  ).join("");
  const settingsSection = `
    <div class="mb-4">
      <h2 class="title is-5">Module Settings</h2>
      <p class="app-muted">Edit per-page or per-section module settings saved in manage/store/modules.</p>
    </div>
    ${settingsDocs.length ? `<div class="app-module-list">${settingsList}</div>` : `<div class="notification is-light">No module settings found yet.</div>`}
  `;
  if (!modules.length) {
    content.innerHTML = `${intro}<div class="notification is-light">No modules found.</div>${settingsSection}`;
  } else {
    content.innerHTML = `${intro}<div class="app-module-list">${list}</div>${settingsSection}`;
  }
  document.querySelectorAll("[data-module-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      const encoded = button.getAttribute("data-module-settings") || "";
      const id = decodeURIComponent(encoded);
      if (id) {
        void loadDocument(id);
      }
    });
  });
};
var renderAgentView = async (agentDoc) => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }
  stopAgentPolling();
  currentAgent = agentDoc;
  currentConversation = null;
  const data = isRecord2(agentDoc.payload.data) ? agentDoc.payload.data : {};
  const provider = getAgentField(data, "provider");
  const model = getAgentField(data, "model");
  const systemPrompt = getAgentField(data, "systemPrompt");
  const adminPrompt = getAgentField(data, "adminPrompt");
  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${agentDoc.payload.name}</h1>
      <p class="app-muted">Agent \xB7 ${agentDoc.store}/${agentDoc.path}</p>
    </div>
    <div class="columns is-variable is-4">
      <div class="column is-one-third">
        <div class="app-panel">
          <div class="mb-3">
            <h2 class="title is-6">Settings</h2>
            <p class="app-muted">Provider, model, and prompts.</p>
          </div>
          <div class="field">
            <label class="label">Name</label>
            <div class="control">
              <input id="agent-edit-name" class="input" type="text" value="${agentDoc.payload.name}" />
            </div>
          </div>
          <div class="field">
            <label class="label">Provider</label>
            <div class="control">
              <input id="agent-edit-provider" class="input" type="text" value="${provider}" />
            </div>
          </div>
          <div class="field">
            <label class="label">Model</label>
            <div class="control">
              <input id="agent-edit-model" class="input" type="text" value="${model}" />
            </div>
          </div>
          <div class="field">
            <label class="label">System prompt</label>
            <div class="control">
              <textarea id="agent-edit-system" class="textarea" rows="3">${systemPrompt}</textarea>
            </div>
          </div>
          <div class="field">
            <label class="label">Admin prompt</label>
            <div class="control">
              <textarea id="agent-edit-admin" class="textarea" rows="3">${adminPrompt}</textarea>
            </div>
          </div>
          <div class="buttons">
            <button id="agent-save" class="button app-button app-primary">Save</button>
          </div>
        </div>
        <div class="app-panel mt-4">
          <div class="app-panel-header">
            <div>
              <h2 class="title is-6 mb-1">Conversations</h2>
              <p class="app-muted">Reuse context or start fresh.</p>
            </div>
            <button id="agent-new-conversation" class="button app-button app-ghost">New</button>
          </div>
          <div id="agent-conversation-list" class="app-conversation-list"></div>
        </div>
      </div>
      <div class="column">
        <div class="app-panel app-chat">
          <div class="app-chat-header">
            <div>
              <div id="agent-chat-title" class="app-chat-title">No conversation selected</div>
              <div id="agent-chat-meta" class="app-chat-meta app-muted">Select or create a conversation.</div>
            </div>
          </div>
          <div id="agent-chat-messages" class="app-chat-messages"></div>
          <div class="app-chat-input">
            <form id="agent-chat-form">
              <div class="field">
                <div class="control">
                  <textarea id="agent-chat-text" class="textarea" rows="2" placeholder="Write a message" disabled></textarea>
                </div>
              </div>
              <div class="buttons">
                <button id="agent-chat-send" class="button app-button app-primary" disabled>Send</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
  const renderMessages = (conversation) => {
    const messagesContainer = document.getElementById("agent-chat-messages");
    if (!messagesContainer) {
      return;
    }
    const payloadData = isRecord2(conversation.payload.data) ? conversation.payload.data : {};
    const messages = Array.isArray(payloadData.messages) ? payloadData.messages : [];
    if (!messages.length) {
      messagesContainer.innerHTML = `<p class="app-muted">No messages yet.</p>`;
      return;
    }
    messagesContainer.innerHTML = messages.map((message) => {
      const record = isRecord2(message) ? message : {};
      const role = typeof record.role === "string" ? record.role : "user";
      const content2 = typeof record.content === "string" ? record.content : "";
      const label = role === "assistant" ? "Agent" : "You";
      const roleClass = role === "assistant" ? "is-assistant" : "is-user";
      return `
          <div class="app-chat-message ${roleClass}">
            <div class="app-chat-message-role">${label}</div>
            <div class="app-chat-message-content">${content2}</div>
          </div>
        `;
    }).join("");
  };
  const updateConversationHeader = (conversation) => {
    const title = document.getElementById("agent-chat-title");
    const meta = document.getElementById("agent-chat-meta");
    if (!title || !meta) {
      return;
    }
    if (!conversation) {
      title.textContent = "No conversation selected";
      meta.textContent = "Select or create a conversation.";
      return;
    }
    const payloadData = isRecord2(conversation.payload.data) ? conversation.payload.data : {};
    const createdAt = typeof payloadData.createdAt === "string" ? payloadData.createdAt : "";
    title.textContent = conversation.payload.name || "Conversation";
    meta.textContent = createdAt ? `Started ${createdAt}` : "Conversation loaded.";
  };
  const updateChatInputState = (active) => {
    const input = document.getElementById("agent-chat-text");
    const send = document.getElementById("agent-chat-send");
    if (input) {
      input.disabled = !active;
    }
    if (send) {
      send.disabled = !active;
    }
  };
  const loadConversation = async (conversationId) => {
    if (!auth) {
      return;
    }
    try {
      const conversation = await fetchAgentConversation(auth, conversationId);
      currentConversation = conversation;
      updateConversationHeader(conversation);
      renderMessages(conversation);
      updateChatInputState(true);
      stopAgentPolling();
      agentPoller = window.setInterval(async () => {
        if (!auth || !currentConversation || currentConversation.id !== conversationId) {
          return;
        }
        try {
          const updated = await fetchAgentConversation(auth, conversationId);
          const previous = currentConversation;
          currentConversation = updated;
          const prevData = isRecord2(previous.payload.data) ? previous.payload.data : {};
          const nextData = isRecord2(updated.payload.data) ? updated.payload.data : {};
          const prevCount = Array.isArray(prevData.messages) ? prevData.messages.length : 0;
          const nextCount = Array.isArray(nextData.messages) ? nextData.messages.length : 0;
          if (prevCount !== nextCount) {
            renderMessages(updated);
          }
        } catch {
        }
      }, 3e3);
    } catch (err) {
      alert(err.message);
    }
  };
  const renderConversationList = (items) => {
    const list = document.getElementById("agent-conversation-list");
    if (!list) {
      return;
    }
    if (!items.length) {
      list.innerHTML = `<p class="app-muted">No conversations yet.</p>`;
      return;
    }
    list.innerHTML = items.map((item) => {
      const active = currentConversation?.id === item.id ? "is-active" : "";
      const meta = item.createdAt ? `<div class="app-conversation-meta">${item.createdAt}</div>` : "";
      return `
          <button class="button app-button app-ghost app-conversation-item ${active}" data-conversation-id="${item.id}">
            <div class="app-conversation-title">${item.name}</div>
            ${meta}
          </button>
        `;
    }).join("");
    list.querySelectorAll("[data-conversation-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-conversation-id");
        if (id) {
          void loadConversation(id);
        }
      });
    });
  };
  const refreshConversations = async () => {
    if (!auth) {
      return;
    }
    try {
      const response = await fetchAgentConversations(auth, agentDoc.id);
      renderConversationList(response.conversations ?? []);
    } catch (err) {
      alert(err.message);
    }
  };
  document.getElementById("agent-save")?.addEventListener("click", async () => {
    if (!auth || !currentAgent) {
      return;
    }
    const nameInput = document.getElementById("agent-edit-name");
    const providerInput = document.getElementById("agent-edit-provider");
    const modelInput = document.getElementById("agent-edit-model");
    const systemInput = document.getElementById("agent-edit-system");
    const adminInput = document.getElementById("agent-edit-admin");
    const nameValue = nameInput?.value.trim() || "";
    const providerValue = providerInput?.value.trim() || "";
    const modelValue = modelInput?.value.trim() || "";
    const systemValue = systemInput?.value.trim() || "";
    const adminValue = adminInput?.value.trim() || "";
    if (!nameValue || !providerValue || !modelValue || !systemValue || !adminValue) {
      alert("All agent fields are required.");
      return;
    }
    try {
      const updated = await updateAgent(auth, currentAgent.id, {
        name: nameValue,
        provider: providerValue,
        model: modelValue,
        systemPrompt: systemValue,
        adminPrompt: adminValue
      });
      currentAgent = updated;
      await loadAgents();
      await renderAgentView(updated);
    } catch (err) {
      alert(err.message);
    }
  });
  document.getElementById("agent-new-conversation")?.addEventListener("click", async () => {
    if (!auth || !currentAgent) {
      return;
    }
    try {
      const created = await createAgentConversation(auth, currentAgent.id);
      currentConversation = created;
      await refreshConversations();
      await loadConversation(created.id);
    } catch (err) {
      alert(err.message);
    }
  });
  document.getElementById("agent-chat-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth || !currentConversation) {
      return;
    }
    const input = document.getElementById("agent-chat-text");
    const content2 = input?.value.trim() || "";
    if (!content2) {
      return;
    }
    try {
      const updated = await appendAgentMessage(auth, currentConversation.id, content2);
      currentConversation = updated;
      input.value = "";
      renderMessages(updated);
    } catch (err) {
      alert(err.message);
    }
  });
  updateChatInputState(false);
  updateConversationHeader(null);
  await refreshConversations();
};
var renderDocument = (doc) => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }
  clearAgentState();
  const payload = doc.payload;
  const selectedModules = normalizeModuleList(payload.modules, payload.module ?? null);
  const isModuleSettings = payload.page === "modules" && doc.store === "private";
  if (isModuleSettings) {
    content.innerHTML = `
      <div class="mb-4">
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">Module settings \xB7 ${doc.store}/${doc.path}</p>
      </div>
      <div class="mb-4 buttons">
        <button id="save" class="button app-button app-primary">\u0391\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7</button>
        <button id="export-json" class="button app-button app-ghost">Export JSON</button>
      </div>
      <div class="mt-4">
        <h2 class="title is-5">Settings</h2>
        <div id="json-editor" class="json-editor"></div>
      </div>
    `;
    const editorContainer2 = document.getElementById("json-editor");
    if (editorContainer2) {
      editor = buildJsonEditor(editorContainer2, payload.data);
    }
    document.getElementById("save")?.addEventListener("click", async () => {
      if (!auth || !currentDocument) {
        return;
      }
      const payloadToSave = {
        ...payload,
        type: payload.type ?? "module",
        data: editor?.getValue() ?? payload.data
      };
      try {
        const updated = await updateDocument(auth, currentDocument.id, payloadToSave);
        currentDocument = updated;
        moduleSettingsCache.clear();
        renderDocument(updated);
        await refreshNavigation();
      } catch (err) {
        alert(err.message);
      }
    });
    const triggerDownload2 = async (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    };
    document.getElementById("export-json")?.addEventListener("click", async () => {
      if (!auth || !currentDocument) {
        return;
      }
      try {
        const result = await downloadDocument(auth, currentDocument.id);
        const filename = result.filename ?? `${currentDocument.path.split("/").pop() || "document"}.json`;
        await triggerDownload2(result.blob, filename);
      } catch (err) {
        alert(err.message);
      }
    });
    return;
  }
  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${payload.name}</h1>
      <p class="app-muted">${payload.page} \xB7 ${doc.store}/${doc.path}</p>
    </div>
    <div class="mb-4 buttons">
      <button id="save" class="button app-button app-primary">\u0391\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7</button>
      <button id="export-json" class="button app-button app-ghost">Export JSON</button>
    </div>
    <div class="columns is-variable is-4 is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label">Order</label>
          <div class="control">
            <input
              id="field-order"
              class="input"
              type="number"
              min="0"
              step="1"
              value="${payload.order}"
            />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Page</label>
          <div class="control">
            <input id="field-page" class="input" type="text" value="${payload.page}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Name</label>
          <div class="control">
            <input id="field-name" class="input" type="text" value="${payload.name}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Language</label>
          <div class="control">
            <input id="field-language" class="input" type="text" value="${payload.language ?? ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Modules</label>
          <div class="control">
            <div id="field-modules" class="app-module-picker">
              ${moduleChecklistHtml(selectedModules)}
            </div>
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Section</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select id="field-section">
                <option value="false" ${payload.section ? "" : "selected"}>false</option>
                <option value="true" ${payload.section ? "selected" : ""}>true</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <div id="module-panel" class="mb-4"></div>
      <h2 class="title is-5">Data</h2>
      <div id="json-editor" class="json-editor"></div>
    </div>
  `;
  const editorContainer = document.getElementById("json-editor");
  if (editorContainer) {
    editor = buildJsonEditor(editorContainer, payload.data);
  }
  void renderModulePanel(doc);
  const moduleInput = document.getElementById("field-modules");
  moduleInput?.addEventListener("change", () => {
    payload.modules = readSelectedModules(moduleInput);
    void renderModulePanel(doc);
  });
  document.getElementById("save")?.addEventListener("click", async () => {
    if (!auth || !currentDocument) {
      return;
    }
    const pageInput = document.getElementById("field-page");
    const nameInput = document.getElementById("field-name");
    const languageInput = document.getElementById("field-language");
    const sectionInput = document.getElementById("field-section");
    const orderInput = document.getElementById("field-order");
    const moduleInput2 = document.getElementById("field-modules");
    const orderRaw = orderInput?.value.trim() || "";
    if (!orderRaw) {
      alert("Order is required.");
      return;
    }
    const parsedOrder = Number(orderRaw);
    if (!Number.isInteger(parsedOrder)) {
      alert("Order must be an integer.");
      return;
    }
    const orderValue = parsedOrder;
    const payloadToSave = {
      type: payload.type ?? "page",
      page: pageInput?.value.trim() || payload.page,
      name: nameInput?.value.trim() || payload.name,
      language: languageInput?.value.trim() || void 0,
      order: orderValue,
      section: sectionInput?.value === "true",
      modules: readSelectedModules(moduleInput2),
      data: editor?.getValue() ?? payload.data
    };
    try {
      const updated = await updateDocument(auth, currentDocument.id, payloadToSave);
      currentDocument = updated;
      renderDocument(updated);
      await refreshNavigation();
    } catch (err) {
      alert(err.message);
    }
  });
  const triggerDownload = async (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  };
  document.getElementById("export-json")?.addEventListener("click", async () => {
    if (!auth || !currentDocument) {
      return;
    }
    try {
      const result = await downloadDocument(auth, currentDocument.id);
      const filename = result.filename ?? `${currentDocument.path.split("/").pop() || "document"}.json`;
      await triggerDownload(result.blob, filename);
    } catch (err) {
      alert(err.message);
    }
  });
};
var renderProfile = async () => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }
  clearAgentState();
  if (!isTokenAuth(auth) || !auth.user) {
    content.innerHTML = `<p class="app-muted">\u0394\u03B5\u03BD \u03C5\u03C0\u03AC\u03C1\u03C7\u03B5\u03B9 \u03C0\u03C1\u03BF\u03C6\u03AF\u03BB \u03B3\u03B9\u03B1 API key \u03C3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7.</p>`;
    return;
  }
  const currentUser = auth.user;
  if (!authDocumentId) {
    content.innerHTML = `<p class="app-muted">\u0394\u03B5\u03BD \u03B2\u03C1\u03AD\u03B8\u03B7\u03BA\u03B5 auth.json.</p>`;
    return;
  }
  let authDoc;
  try {
    authDoc = await fetchDocument(auth, authDocumentId);
  } catch (err) {
    content.innerHTML = `<p class="app-muted">${err.message}</p>`;
    return;
  }
  const data = authDoc.payload.data;
  if (!isAuthData(data)) {
    content.innerHTML = `<p class="app-muted">\u03A4\u03BF auth.json \u03B4\u03B5\u03BD \u03AD\u03C7\u03B5\u03B9 users.</p>`;
    return;
  }
  const users = data.users;
  const index = users.findIndex((user) => {
    if (user.email === currentUser.email)
      return true;
    if (user.id && user.id === currentUser.id)
      return true;
    if (user.uuid && user.uuid === currentUser.id)
      return true;
    return false;
  });
  if (index < 0) {
    content.innerHTML = `<p class="app-muted">\u039F \u03C7\u03C1\u03AE\u03C3\u03C4\u03B7\u03C2 \u03B4\u03B5\u03BD \u03B2\u03C1\u03AD\u03B8\u03B7\u03BA\u03B5 \u03C3\u03C4\u03BF auth.json.</p>`;
    return;
  }
  const current = users[index];
  const profile = profileCopy();
  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${profile.title}</h1>
      <p class="app-muted">${profile.subtitle}</p>
    </div>
    <div class="columns is-variable is-4 is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label">First Name</label>
          <div class="control">
            <input id="profile-firstname" class="input" type="text" value="${current.firstname || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Last Name</label>
          <div class="control">
            <input id="profile-lastname" class="input" type="text" value="${current.lastname || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Email</label>
          <div class="control">
            <input id="profile-email" class="input" type="email" value="${current.email || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Password</label>
          <div class="control">
            <input id="profile-password" class="input" type="password" placeholder="Leave blank to keep" />
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <button id="profile-save" class="button app-button app-primary">${profile.saveLabel}</button>
    </div>
  `;
  document.getElementById("profile-save")?.addEventListener("click", async () => {
    if (!isTokenAuth(auth) || !auth.user) {
      return;
    }
    const activeUser = auth.user;
    const firstname = document.getElementById("profile-firstname")?.value.trim();
    const lastname = document.getElementById("profile-lastname")?.value.trim();
    const email = document.getElementById("profile-email")?.value.trim();
    const password = document.getElementById("profile-password")?.value.trim();
    const updatedUser = {
      ...current,
      firstname: firstname ?? current.firstname,
      lastname: lastname ?? current.lastname,
      email: email ?? current.email
    };
    if (password) {
      updatedUser.password = password;
    }
    const updatedUsers = [...users];
    updatedUsers[index] = updatedUser;
    const updatedPayload = {
      ...authDoc.payload,
      data: {
        ...data,
        users: updatedUsers
      }
    };
    try {
      await updateDocument(auth, authDoc.id, updatedPayload);
      auth = {
        ...auth,
        user: {
          ...activeUser,
          firstname: updatedUser.firstname,
          lastname: updatedUser.lastname,
          email: updatedUser.email
        }
      };
      saveAuth(auth);
      renderProfile();
    } catch (err) {
      alert(err.message);
    }
  });
};
var loadDocument = async (id) => {
  if (!auth) {
    return;
  }
  try {
    currentDocument = await fetchDocument(auth, id);
    renderDocument(currentDocument);
  } catch (err) {
    alert(err.message);
  }
};
var loadAgent = async (id) => {
  if (!auth) {
    return;
  }
  try {
    const agent = await fetchAgent(auth, id);
    currentDocument = null;
    await renderAgentView(agent);
  } catch (err) {
    alert(err.message);
  }
};
var refreshNavigation = async () => {
  if (!auth) {
    return;
  }
  try {
    const nav = await fetchNavigation(auth);
    navigationPages = nav.pages;
    renderNavigation(nav.pages);
  } catch (err) {
    alert(err.message);
  }
};
var loadUiConfig = async () => {
  if (!auth) {
    return;
  }
  try {
    const response = await fetchUiConfig(auth);
    applyUiConfig(response.config);
  } catch {
    setTheme(currentTheme, false);
  }
};
var loadLayoutConfig = async () => {
  if (!auth) {
    return;
  }
  try {
    const response = await fetchLayoutConfig(auth);
    layoutConfig = response.config ?? {};
  } catch {
    layoutConfig = {};
  }
};
var loadAgents = async () => {
  if (!auth) {
    return;
  }
  try {
    const response = await fetchAgents(auth);
    agents = Array.isArray(response.agents) ? response.agents : [];
  } catch {
    agents = [];
  }
  renderAgentsMenu();
};
var loadModules = async () => {
  if (!auth) {
    return;
  }
  try {
    const response = await fetchModules(auth);
    if (Array.isArray(response.modules)) {
      modules = response.modules;
    } else if (response.modules && typeof response.modules === "object") {
      modules = Object.values(response.modules);
    } else {
      modules = [];
    }
  } catch {
    modules = [];
  }
};
var renderApp = async () => {
  if (!auth) {
    renderLogin();
    return;
  }
  await loadUiConfig();
  await loadLayoutConfig();
  await loadModules();
  renderAppShell();
  await loadAgents();
  await refreshNavigation();
};
renderApp().catch(() => renderLogin());
//# sourceMappingURL=app.js.map
