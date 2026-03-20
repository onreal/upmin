import {
  createUserApiKey,
  deleteUserApiKey,
  listUserApiKeys,
  type RemoteDocument,
} from "../../api";
import { state } from "../../app/state";
import { adminText } from "../../app/translations";
import { clearAgentState } from "../agents/state";
import { clearRegisteredIntegrationCleanup } from "../integrations/runtime";
import { isTokenAuth } from "./utils";
import { renderApiKeysView } from "../../views/api-keys";

export const isApiKeysDocument = (doc: RemoteDocument) =>
  doc.store === "private" && doc.path === "system/api-keys.json";

export const renderApiKeysPage = async () => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  clearAgentState();
  clearRegisteredIntegrationCleanup();

  if (!isTokenAuth(state.auth) || !state.auth.user) {
    content.innerHTML = `<p class="app-muted">${adminText("apiKeys.unavailable", "API Keys are available only for signed-in users.")}</p>`;
    return;
  }

  let rawKey: string | null = null;

  const render = async () => {
    if (!isTokenAuth(state.auth)) {
      return;
    }

    const response = await listUserApiKeys(state.auth);
    renderApiKeysView({
      content,
      keys: response.items,
      rawKey,
      onCreate: async (name, expiry) => {
        if (!isTokenAuth(state.auth)) {
          return;
        }
        const created = await createUserApiKey(state.auth, { name, expiry });
        rawKey = created.key;
        await render();
      },
      onDelete: async (id) => {
        if (!isTokenAuth(state.auth)) {
          return;
        }
        await deleteUserApiKey(state.auth, id);
        rawKey = null;
        await render();
      },
    });

    const copyButton = document.getElementById("api-key-copy");
    copyButton?.addEventListener("click", async () => {
      if (!rawKey) {
        return;
      }
      await navigator.clipboard.writeText(rawKey);
    });
  };

  try {
    await render();
  } catch (err) {
    content.innerHTML = `<p class="app-muted">${(err as Error).message}</p>`;
  }
};
