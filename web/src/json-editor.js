const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const clone = (value) => JSON.parse(JSON.stringify(value));
export const buildJsonEditor = (container, initialValue) => {
    let data = clone(initialValue ?? {});
    const openState = new Map();
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
            }
            else {
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
            }
            else {
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
            }
            else {
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
        addBtn.textContent = "Προσθήκη στοιχείου";
        addBtn.addEventListener("click", () => {
            if (arr.length > 0) {
                arr.push(clone(arr[0]));
            }
            else {
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
        },
    };
};
