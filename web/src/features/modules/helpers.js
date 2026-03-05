export const normalizeModuleList = (modulesValue, fallback) => {
    const list = Array.isArray(modulesValue) ? [...modulesValue] : [];
    if (fallback && !list.includes(fallback)) {
        list.push(fallback);
    }
    return list
        .map((entry) => entry.trim())
        .filter((entry) => entry !== "")
        .filter((entry, index, self) => self.indexOf(entry) === index);
};
export const moduleChecklistHtml = (modules, selected = []) => {
    if (!modules.length) {
        return `<p class="help">No modules available.</p>`;
    }
    const selectedSet = new Set(selected);
    return modules
        .map((module) => {
        const isChecked = selectedSet.has(module.name);
        const description = module.description
            ? `<span class="app-module-option-meta">${module.description}</span>`
            : "";
        return `
        <label class="checkbox app-module-option">
          <input type="checkbox" value="${module.name}" ${isChecked ? "checked" : ""} />
          <span class="app-module-option-label">${module.name}</span>
          ${description}
        </label>
      `;
    })
        .join("");
};
export const readSelectedModules = (container) => {
    if (!container) {
        return [];
    }
    return Array.from(container.querySelectorAll("input[type='checkbox']"))
        .filter((input) => input.checked)
        .map((input) => input.value.trim())
        .filter((value) => value !== "");
};
export const findModuleDefinition = (modules, name) => modules.find((module) => module.name === name) ?? null;
