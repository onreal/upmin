import type { ModuleDefinition } from "../../api";
import { adminText } from "../../app/translations";

export const normalizeModuleList = (modulesValue?: string[] | null, fallback?: string | null) => {
  const list = Array.isArray(modulesValue) ? [...modulesValue] : [];
  if (fallback && !list.includes(fallback)) {
    list.push(fallback);
  }
  return list
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .filter((entry, index, self) => self.indexOf(entry) === index);
};

export const moduleChecklistHtml = (modules: ModuleDefinition[], selected: string[] = []) => {
  if (!modules.length) {
    return `<p class="help">${adminText("modules.noModulesAvailable", "No modules available.")}</p>`;
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

export const readSelectedModules = (container: HTMLElement | null) => {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll<HTMLInputElement>("input[type='checkbox']"))
    .filter((input) => input.checked)
    .map((input) => input.value.trim())
    .filter((value) => value !== "");
};

export const findModuleDefinition = (modules: ModuleDefinition[], name: string | null | undefined) =>
  modules.find((module) => module.name === name) ?? null;
