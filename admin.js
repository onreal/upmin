const form = document.getElementById("content-form");
const textarea = document.getElementById("content_json");
const formatButton = document.getElementById("format-json");
const projectsForm = document.getElementById("projects-form");
const projectsTextarea = document.getElementById("projects_json");
const formatProjectsButton = document.getElementById("format-projects");
const tabs = document.querySelectorAll(".admin-tab");
const panels = document.querySelectorAll(".admin-panel");
const modal = document.getElementById("gallery-modal");
const modalSrc = document.getElementById("gallery-src");
const modalAlt = document.getElementById("gallery-alt");
const modalCaption = document.getElementById("gallery-caption");
const openButtons = document.querySelectorAll(".open-gallery-modal");
const energyToolForm = document.getElementById("energy-tool-form");
const energyToolTextarea = document.getElementById("energy_tool_json");
const formatEnergyToolButton = document.getElementById("format-energy-tool");

const buildJsonEditor = (textarea, form) => {
  if (!textarea || !form) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(textarea.value || "{}");
  } catch (error) {
    return null;
  }

  const editorWrap = document.createElement("div");
  editorWrap.className = "json-editor";

  const controls = document.createElement("div");
  controls.className = "json-controls";

  const editorButton = document.createElement("button");
  editorButton.type = "button";
  editorButton.className = "json-toggle active";
  editorButton.textContent = "Επεξεργαστής";

  const rawButton = document.createElement("button");
  rawButton.type = "button";
  rawButton.className = "json-toggle";
  rawButton.textContent = "JSON";

  controls.append(editorButton, rawButton);
  editorWrap.append(controls);

  const editorBody = document.createElement("div");
  editorBody.className = "json-body";
  editorWrap.append(editorBody);

  const openState = new Map();

  const getPath = (parentPath, key) => {
    if (key === null || key === undefined) {
      return parentPath;
    }
    if (typeof key === "number") {
      return `${parentPath}[${key}]`;
    }
    return parentPath ? `${parentPath}.${key}` : String(key);
  };

  const snapshotOpenState = () => {
    openState.clear();
    editorBody.querySelectorAll("details[data-path]").forEach((el) => {
      openState.set(el.dataset.path, el.open);
    });
  };

  const restoreOpenState = () => {
    editorBody.querySelectorAll("details[data-path]").forEach((el) => {
      if (openState.has(el.dataset.path)) {
        el.open = openState.get(el.dataset.path);
      }
    });
  };

  const createPrimitiveInput = (value, onChange) => {
    const type = typeof value;
    if (type === "boolean") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = value;
      checkbox.addEventListener("change", () => onChange(checkbox.checked));
      return checkbox;
    }

    if (type === "number") {
      const input = document.createElement("input");
      input.type = "number";
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
      textarea.value = textValue;
      textarea.rows = Math.min(6, Math.max(3, textValue.split("\n").length));
      textarea.addEventListener("input", () => onChange(textarea.value));
      return textarea;
    }

    const text = document.createElement("input");
    text.type = "text";
    text.value = textValue;
    text.addEventListener("input", () => onChange(text.value));
    return text;
  };

  const renderNode = (node, parent, key, path) => {
    if (Array.isArray(node)) {
      return renderArray(node, parent, key, path);
    }
    if (node && typeof node === "object") {
      return renderObject(node, parent, key, path);
    }
    return renderPrimitive(node, parent, key);
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
    summaryLabel.textContent = `${key ?? "object"} · ${Object.keys(obj).length} πεδία`;
    summary.append(summaryLabel);
    if (Array.isArray(parent) && key !== null && key !== undefined) {
      const removeBtn = createRemoveButton(() => {
        parent.splice(key, 1);
        rerender();
      });
      removeBtn.classList.add("json-remove-inline");
      summary.append(removeBtn);
    }
    details.append(summary);

    const body = document.createElement("div");
    body.className = "json-children";

    Object.keys(obj).forEach((childKey) => {
      const child = obj[childKey];
      const childPath = getPath(path, childKey);
      if (Array.isArray(child) || (child && typeof child === "object")) {
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
    summaryLabel.textContent = `${key ?? "array"} · ${arr.length} στοιχεία`;
    summary.append(summaryLabel);
    if (Array.isArray(parent) && key !== null && key !== undefined) {
      const removeBtn = createRemoveButton(() => {
        parent.splice(key, 1);
        rerender();
      });
      removeBtn.classList.add("json-remove-inline");
      summary.append(removeBtn);
    }
    details.append(summary);

    const body = document.createElement("div");
    body.className = "json-children";

    arr.forEach((item, index) => {
      const childPath = getPath(path, index);
      if (Array.isArray(item) || (item && typeof item === "object")) {
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
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Προσθήκη στοιχείου";
    addBtn.addEventListener("click", () => {
      if (arr.length > 0) {
        const template = arr[0];
        arr.push(cloneValue(template));
      } else {
        arr.push(defaultValueForType(typeSelect.value));
      }
      rerender();
    });
    addRow.append(typeSelect, addBtn);
    body.append(addRow);

    details.append(body);
    return details;
  };

  const createRemoveButton = (handler) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "json-remove";
    button.textContent = "Αφαίρεση";
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

  const cloneValue = (value) => JSON.parse(JSON.stringify(value));

  const render = () => {
    editorBody.innerHTML = "";
    const rootNode = renderNode(data, null, "root", "root");
    rootNode.open = true;
    editorBody.append(rootNode);
    restoreOpenState();
  };

  const rerender = () => {
    snapshotOpenState();
    render();
  };

  render();

  const syncTextarea = () => {
    textarea.value = JSON.stringify(data, null, 2);
  };

  const showEditor = () => {
    textarea.classList.remove("json-raw-visible");
    editorWrap.classList.remove("json-hidden");
    editorButton.classList.add("active");
    rawButton.classList.remove("active");
  };

  const showRaw = () => {
    syncTextarea();
    textarea.classList.add("json-raw-visible");
    editorWrap.classList.add("json-hidden");
    editorButton.classList.remove("active");
    rawButton.classList.add("active");
  };

  editorButton.addEventListener("click", () => {
    if (textarea.classList.contains("json-raw-visible")) {
      try {
        data = JSON.parse(textarea.value || "{}");
        rerender();
      } catch (error) {
        showError("Το JSON δεν είναι έγκυρο.");
        return;
      }
    }
    showEditor();
  });
  rawButton.addEventListener("click", showRaw);

  form.addEventListener("submit", () => {
    if (textarea.classList.contains("json-raw-visible")) {
      try {
        data = JSON.parse(textarea.value || "{}");
      } catch (error) {
        showError("Το JSON δεν είναι έγκυρο.");
      }
    }
    syncTextarea();
  });

  textarea.classList.add("json-raw");
  textarea.insertAdjacentElement("beforebegin", editorWrap);

  return {
    rerender,
    syncTextarea
  };
};

const showError = (message) => {
  alert(message);
};

if (formatButton && textarea) {
  formatButton.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed, null, 2);
    } catch (error) {
      showError("Το JSON δεν είναι έγκυρο.");
    }
  });
}

if (formatProjectsButton && projectsTextarea) {
  formatProjectsButton.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(projectsTextarea.value);
      projectsTextarea.value = JSON.stringify(parsed, null, 2);
    } catch (error) {
      showError("Το JSON (projects) δεν είναι έγκυρο.");
    }
  });
}

if (form && textarea) {
  form.addEventListener("submit", (event) => {
    try {
      JSON.parse(textarea.value);
    } catch (error) {
      event.preventDefault();
      showError("Το JSON δεν είναι έγκυρο και δεν μπορεί να αποθηκευτεί.");
    }
  });
}

if (projectsForm && projectsTextarea) {
  projectsForm.addEventListener("submit", (event) => {
    try {
      JSON.parse(projectsTextarea.value);
    } catch (error) {
      event.preventDefault();
      showError("Το JSON (projects) δεν είναι έγκυρο και δεν μπορεί να αποθηκευτεί.");
    }
  });
}

if (formatEnergyToolButton && energyToolTextarea) {
  formatEnergyToolButton.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(energyToolTextarea.value);
      energyToolTextarea.value = JSON.stringify(parsed, null, 2);
    } catch (error) {
      showError("Το JSON (υπολογιστής) δεν είναι έγκυρο.");
    }
  });
}

if (energyToolForm && energyToolTextarea) {
  energyToolForm.addEventListener("submit", (event) => {
    try {
      JSON.parse(energyToolTextarea.value);
    } catch (error) {
      event.preventDefault();
      showError("Το JSON (υπολογιστής) δεν είναι έγκυρο και δεν μπορεί να αποθηκευτεί.");
    }
  });
}

const contentEditor = buildJsonEditor(textarea, form);
const projectsEditor = buildJsonEditor(projectsTextarea, projectsForm);
const energyToolEditor = buildJsonEditor(energyToolTextarea, energyToolForm);

if (formatButton && contentEditor) {
  formatButton.addEventListener("click", () => {
    contentEditor.syncTextarea();
  });
}

if (formatProjectsButton && projectsEditor) {
  formatProjectsButton.addEventListener("click", () => {
    projectsEditor.syncTextarea();
  });
}

if (formatEnergyToolButton && energyToolEditor) {
  formatEnergyToolButton.addEventListener("click", () => {
    energyToolEditor.syncTextarea();
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document
      .querySelector(`.admin-panel[data-panel=\"${target}\"]`)
      ?.classList.add("active");
  });
});

const openModal = (src) => {
  if (!modal || !modalSrc || !modalAlt) {
    return;
  }
  modalSrc.value = src;
  modalAlt.value = "";
  if (modalCaption) {
    modalCaption.value = "";
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  modalAlt.focus();
};

const closeModal = () => {
  if (!modal) {
    return;
  }
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
};

openButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const src = button.dataset.src || "";
    if (src) {
      openModal(src);
    }
  });
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});
