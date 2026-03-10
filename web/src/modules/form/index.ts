import type { ModuleRenderContext } from "../types";
import { isRecord } from "../../utils";

const resolveLabel = (settings: Record<string, unknown> | null, fallback: string) => {
  const name = settings?.name;
  if (typeof name === "string" && name.trim() !== "") {
    return name.trim();
  }
  return `${fallback} - form`;
};

const resolveFlag = (settings: Record<string, unknown> | null, key: string) => {
  return settings?.[key] === true;
};

export const renderFormModule = (panel: HTMLElement, context: ModuleRenderContext) => {
  const settings = isRecord(context.settings) ? context.settings : null;
  const label = resolveLabel(settings, context.payload.name);
  const pageId = typeof context.payload.id === "string" ? context.payload.id : "";

  const wrapper = document.createElement("div");
  wrapper.className = "app-module";

  const flags = [
    { key: "sendadminemail", label: "Send admin email" },
    { key: "senduseremail", label: "Send user email" },
    { key: "captcha", label: "Captcha" },
  ];

  const flagMarkup = flags
    .map((flag) => {
      const value = resolveFlag(settings, flag.key) ? "enabled" : "disabled";
      return `<div class="app-form-flag"><span>${flag.label}</span><strong>${value}</strong></div>`;
    })
    .join("");

  wrapper.innerHTML = `
    <div class="app-module-header">
      <div>
        <h3 class="title is-6">${label}</h3>
        <p class="app-muted">Form page id: <code>${pageId || "missing"}</code></p>
      </div>
      <div class="buttons">
        <button class="button app-button app-ghost" data-form-settings>Settings</button>
      </div>
    </div>
    <div class="app-form-flags">${flagMarkup}</div>
    <p class="app-muted">Entries appear under Settings → Forms.</p>
  `;

  const settingsButton = wrapper.querySelector("[data-form-settings]") as HTMLButtonElement | null;
  settingsButton?.addEventListener("click", () => {
    context.openSettings?.();
  });

  panel.append(wrapper);
};
