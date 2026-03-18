import type { ModuleRenderContext } from "../types";
import { isRecord } from "../../utils";
import { moduleSettingsKey } from "../utils";
import { renderChatLayout } from "./layout";
import { mountChatController } from "./controller";

export const renderChatModule = (panel: HTMLElement, context: ModuleRenderContext) => {
  const settings = isRecord(context.settings) ? context.settings : null;
  const agentSettings = settings && isRecord(settings.agent) ? settings.agent : null;
  const agentName = typeof agentSettings?.name === "string" ? agentSettings.name.trim() : "";
  const agentId = typeof agentSettings?.id === "string" ? agentSettings.id.trim() : "";

  if (!agentName || !agentId) {
    const card = document.createElement("div");
    card.className = "app-module";

    if (!context.hideHeader) {
      const header = document.createElement("div");
      header.className = "app-module-header";

      const headerRow = document.createElement("div");
      headerRow.className = "app-module-header-row";

      const title = document.createElement("div");
      title.className = "app-module-title";
      title.textContent = context.module.name;
      headerRow.append(title);

      if (context.openSettings) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button app-button app-ghost app-icon-button app-module-settings-button";
        button.title = "Module settings";
        button.setAttribute("aria-label", "Module settings");
        button.innerHTML = `
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
              <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
            </svg>
          </span>
        `;
        button.addEventListener("click", context.openSettings);
        headerRow.append(button);
      }

      const meta = document.createElement("div");
      meta.className = "app-module-meta";
      meta.textContent = context.module.description;
      header.append(headerRow, meta);
      card.append(header);
    }

    const body = document.createElement("div");
    body.className = "app-module-body";
    const note = document.createElement("div");
    note.className = "app-module-note";
    note.innerHTML = `
      <strong>Chat needs an agent.</strong>
      <p class="app-muted">Select an agent in module settings to start chatting.</p>
    `;
    body.append(note);

    card.append(body);
    panel.append(card);
    return;
  }

  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const targetKey =
    typeof outputSettings?.target === "string" && outputSettings.target.trim() !== ""
      ? outputSettings.target.trim()
      : context.module.name;

  const dom = renderChatLayout(panel, context.module, agentName, context.openSettings, context.hideHeader);
  if (!dom) {
    return;
  }

  mountChatController({
    moduleName: context.module.name,
    settingsKey: moduleSettingsKey(context.payload, context.module.name),
    agentName,
    auth: context.auth,
    payload: context.payload,
    editor: context.editor,
    dom,
    targetKey,
    autoLoadLatestConversation: context.autoLoadLatestConversation,
  });
};
