import { isRecord } from "../../utils";
const slugify = (value) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
export const resolveModuleForSettings = (modules, path) => {
    const filename = path.split("/").pop() ?? "";
    const base = filename.replace(/\.json$/i, "");
    if (!base) {
        return null;
    }
    const candidates = modules.map((module) => ({ module, slug: slugify(module.name) }));
    const direct = candidates.find((entry) => entry.slug === base);
    if (direct) {
        return direct.module;
    }
    const matched = candidates.find((entry) => base.endsWith(`-${entry.slug}`));
    return matched ? matched.module : null;
};
const humanizeKey = (value) => value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
const valueAtPath = (settings, key) => {
    if (!isRecord(settings)) {
        return undefined;
    }
    return settings[key];
};
const setValueAtPath = (target, path, value) => {
    let current = target;
    path.forEach((segment, index) => {
        if (index === path.length - 1) {
            current[segment] = value;
            return;
        }
        if (!isRecord(current[segment])) {
            current[segment] = {};
        }
        current = current[segment];
    });
};
const cloneSettings = (settings) => settings ? JSON.parse(JSON.stringify(settings)) : {};
export const renderModuleSettingsForm = ({ container, module, settings, agents, }) => {
    const parameters = isRecord(module.parameters) ? module.parameters : {};
    const fields = [];
    const form = document.createElement("div");
    form.className = "app-module-settings-form";
    container.append(form);
    const agentsByName = new Map(agents.map((agent) => [agent.name, agent]));
    const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
    let agentNameSelect = null;
    let agentIdInput = null;
    let pendingAgentId = "";
    const renderField = (parent, path, defaultValue, currentValue) => {
        const field = document.createElement("div");
        field.className = "field";
        const labelText = humanizeKey(path[path.length - 1] ?? "");
        if (typeof defaultValue === "boolean") {
            const control = document.createElement("div");
            control.className = "control";
            const checkboxLabel = document.createElement("label");
            checkboxLabel.className = "checkbox";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.checked = Boolean(currentValue ?? defaultValue);
            checkboxLabel.append(input, document.createTextNode(` ${labelText}`));
            control.append(checkboxLabel);
            field.append(control);
            fields.push({ path, type: "boolean", element: input, defaultValue });
            parent.append(field);
            return;
        }
        const label = document.createElement("label");
        label.className = "label";
        label.textContent = labelText;
        field.append(label);
        const control = document.createElement("div");
        control.className = "control";
        if (module.name === "chat" && path.join(".") === "agent.name") {
            const select = document.createElement("select");
            const emptyOption = document.createElement("option");
            emptyOption.value = "";
            emptyOption.textContent = agents.length ? "Select agent" : "No agents available";
            select.append(emptyOption);
            if (!agents.length) {
                select.disabled = true;
            }
            agents.forEach((agent) => {
                const option = document.createElement("option");
                option.value = agent.name;
                option.textContent = agent.name;
                select.append(option);
            });
            const currentName = typeof currentValue === "string" ? currentValue : "";
            if (currentName && !agentsByName.has(currentName)) {
                const option = document.createElement("option");
                option.value = currentName;
                option.textContent = currentName;
                select.append(option);
            }
            select.value = currentName;
            select.addEventListener("change", () => {
                if (!agentIdInput) {
                    return;
                }
                const selected = agentsByName.get(select.value);
                agentIdInput.value = selected?.id ?? "";
            });
            const selectWrapper = document.createElement("div");
            selectWrapper.className = "select is-fullwidth";
            selectWrapper.append(select);
            control.append(selectWrapper);
            agentNameSelect = select;
            fields.push({ path, type: "select", element: select, defaultValue });
            field.append(control);
            parent.append(field);
            return;
        }
        if (module.name === "chat" && path.join(".") === "agent.id") {
            const input = document.createElement("input");
            input.type = "text";
            input.className = "input";
            input.value = typeof currentValue === "string" ? currentValue : "";
            input.readOnly = true;
            pendingAgentId = input.value;
            agentIdInput = input;
            control.append(input);
            field.append(control);
            parent.append(field);
            fields.push({ path, type: "text", element: input, defaultValue });
            return;
        }
        if (Array.isArray(defaultValue)) {
            const input = document.createElement("input");
            input.type = "text";
            input.className = "input";
            const list = Array.isArray(currentValue) ? currentValue : defaultValue;
            input.value = list.map((entry) => String(entry)).join(", ");
            control.append(input);
            const help = document.createElement("p");
            help.className = "help";
            help.textContent = "Comma separated values.";
            field.append(control, help);
            const itemType = defaultValue.length > 0 && typeof defaultValue[0] === "number"
                ? "number"
                : defaultValue.length > 0 && typeof defaultValue[0] === "boolean"
                    ? "boolean"
                    : "string";
            fields.push({ path, type: "list", element: input, defaultValue, itemType });
            parent.append(field);
            return;
        }
        if (typeof defaultValue === "number") {
            const input = document.createElement("input");
            input.type = "number";
            input.step = Number.isInteger(defaultValue) ? "1" : "any";
            input.className = "input";
            const numericValue = typeof currentValue === "number" || typeof currentValue === "string"
                ? String(currentValue)
                : String(defaultValue);
            input.value = numericValue;
            control.append(input);
            field.append(control);
            fields.push({ path, type: "number", element: input, defaultValue });
            parent.append(field);
            return;
        }
        const input = document.createElement("input");
        input.type = "text";
        input.className = "input";
        input.value =
            typeof currentValue === "string"
                ? currentValue
                : currentValue == null
                    ? String(defaultValue ?? "")
                    : String(currentValue);
        control.append(input);
        field.append(control);
        fields.push({ path, type: "text", element: input, defaultValue });
        parent.append(field);
    };
    const renderGroup = (parent, group, current, path) => {
        Object.entries(group).forEach(([key, defaultValue]) => {
            const nextPath = [...path, key];
            const currentValue = valueAtPath(current, key);
            if (isRecord(defaultValue)) {
                const section = document.createElement("div");
                section.className = "app-module-settings-group";
                const heading = document.createElement("div");
                heading.className = "app-module-settings-title";
                heading.textContent = humanizeKey(key);
                section.append(heading);
                renderGroup(section, defaultValue, currentValue, nextPath);
                parent.append(section);
                return;
            }
            renderField(parent, nextPath, defaultValue, currentValue);
        });
    };
    if (!Object.keys(parameters).length) {
        const empty = document.createElement("p");
        empty.className = "app-muted";
        empty.textContent = "No module settings available.";
        form.append(empty);
    }
    else {
        renderGroup(form, parameters, settings, []);
    }
    const linkedAgentNameSelect = agentNameSelect;
    const linkedAgentIdInput = agentIdInput;
    if (linkedAgentNameSelect && linkedAgentIdInput) {
        if (!linkedAgentNameSelect.value && pendingAgentId) {
            const match = agentsById.get(pendingAgentId);
            if (match) {
                linkedAgentNameSelect.value = match.name;
            }
        }
        if (linkedAgentNameSelect.value) {
            const match = agentsByName.get(linkedAgentNameSelect.value);
            linkedAgentIdInput.value = match?.id ?? "";
        }
        else {
            linkedAgentIdInput.value = "";
        }
    }
    const getValue = () => {
        const output = cloneSettings(settings);
        fields.forEach((field) => {
            let value;
            if (field.type === "boolean") {
                value = field.element.checked;
            }
            else if (field.type === "number") {
                const raw = field.element.value.trim();
                const parsed = raw === "" ? NaN : Number(raw);
                value = Number.isFinite(parsed) ? parsed : field.defaultValue;
            }
            else if (field.type === "list") {
                const raw = field.element.value;
                const parts = raw
                    .split(",")
                    .map((entry) => entry.trim())
                    .filter((entry) => entry !== "");
                if (field.itemType === "number") {
                    value = parts.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
                }
                else if (field.itemType === "boolean") {
                    value = parts.map((entry) => entry === "true");
                }
                else {
                    value = parts;
                }
            }
            else {
                value = field.element.value.trim();
            }
            setValueAtPath(output, field.path, value);
        });
        return output;
    };
    return { getValue };
};
