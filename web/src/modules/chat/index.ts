import type { ModuleRenderContext } from "../types";
import { isRecord } from "../../utils";
import { moduleSettingsKey } from "../utils";
import { renderChatLayout } from "./layout";
import { mountChatController } from "./controller";

export const renderChatModule = (panel: HTMLElement, context: ModuleRenderContext) => {
  const settings = isRecord(context.settings) ? context.settings : null;
  const agentSettings = settings && isRecord(settings.agent) ? settings.agent : null;
  const agentName = typeof agentSettings?.name === "string" ? agentSettings.name.trim() : "";

  if (!agentName) {
    const notice = document.createElement("div");
    notice.className = "app-module";
    notice.innerHTML = `<div class="notification is-warning is-light">Set Chat.agent.name in module settings to start chatting.</div>`;
    panel.append(notice);
    return;
  }

  const outputSettings = settings && isRecord(settings.output) ? settings.output : null;
  const targetKey =
    typeof outputSettings?.target === "string" && outputSettings.target.trim() !== ""
      ? outputSettings.target.trim()
      : context.module.name;

  const dom = renderChatLayout(panel, context.module, agentName, context.openSettings);
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
  });
};
