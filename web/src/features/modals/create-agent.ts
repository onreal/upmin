import { createAgent, type AuthState } from "../../api";
import { state } from "../../app/state";
import { adminText } from "../../app/translations";
import { setupProviderModelControls } from "../integrations/helpers";

export type AgentModalController = {
  openAgentModal: () => void;
  refreshControls: () => void;
};

export type AgentModalContext = {
  getAuth: () => AuthState | null;
  reloadAgents: () => Promise<void>;
  onAgentCreated: (id: string) => Promise<void>;
};

export const initAgentModal = ({ getAuth, reloadAgents, onAgentCreated }: AgentModalContext): AgentModalController => {
  const agentModal = document.getElementById("agent-modal");
  const agentError = document.getElementById("agent-error");
  const agentForm = document.getElementById("agent-form") as HTMLFormElement | null;
  const agentStoreInput = document.getElementById("agent-store") as HTMLInputElement | null;
  const agentStoreTabs = Array.from(
    agentModal?.querySelectorAll<HTMLElement>("[data-agent-store]") ?? []
  );
  const agentProviderSelect = document.getElementById("agent-provider") as HTMLSelectElement | null;
  const agentModelSelect = document.getElementById("agent-model") as HTMLSelectElement | null;
  const agentModelSearch = document.getElementById("agent-model-search") as HTMLInputElement | null;
  const agentProviderHelp = document.getElementById("agent-provider-help");
  const agentSubmit = document.getElementById("agent-submit") as HTMLButtonElement | null;

  const showAgentError = (message: string) => {
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

  const setAgentStore = (store: "public" | "private") => {
    if (agentStoreInput) {
      agentStoreInput.value = store;
    }
    agentStoreTabs.forEach((tab) => {
      const value = tab.getAttribute("data-agent-store");
      tab.parentElement?.classList.toggle("is-active", value === store);
    });
  };

  const refreshControls = () => {
    if (!agentProviderSelect || !agentModelSelect) {
      return;
    }
    setupProviderModelControls(
      agentProviderSelect,
      agentModelSelect,
      agentModelSearch,
      agentProviderHelp,
      state.integrations,
      state.integrationSettings
    );
    if (agentSubmit) {
      agentSubmit.disabled = agentModelSelect.disabled || agentProviderSelect.disabled;
    }
  };

  const updateSubmitState = () => {
    if (agentSubmit && agentProviderSelect && agentModelSelect) {
      agentSubmit.disabled = agentModelSelect.disabled || agentProviderSelect.disabled;
    }
  };

  agentProviderSelect?.addEventListener("change", updateSubmitState);
  agentModelSelect?.addEventListener("change", updateSubmitState);

  const openAgentModal = () => {
    clearAgentError();
    agentForm?.reset();
    setAgentStore("public");
    refreshControls();
    agentModal?.classList.add("is-active");
  };

  const closeAgentModal = () => {
    agentModal?.classList.remove("is-active");
    clearAgentError();
  };

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
    const auth = getAuth();
    if (!auth) {
      return;
    }

    clearAgentError();

    const name = (document.getElementById("agent-name") as HTMLInputElement | null)?.value.trim() || "";
    const provider = agentProviderSelect?.value.trim() || "";
    const model = agentModelSelect?.value.trim() || "";
    const systemPrompt =
      (document.getElementById("agent-system") as HTMLTextAreaElement | null)?.value.trim() || "";
    const adminPrompt =
      (document.getElementById("agent-admin") as HTMLTextAreaElement | null)?.value.trim() || "";
    const storeValue =
      (document.getElementById("agent-store") as HTMLInputElement | null)?.value === "private"
        ? "private"
        : "public";

    if (!name || !provider || !model || !systemPrompt || !adminPrompt) {
      showAgentError(adminText("agents.allFieldsRequired", "All fields are required."));
      return;
    }
    if (agentProviderSelect?.disabled || agentModelSelect?.disabled) {
      showAgentError(adminText("agents.enableIntegrationFirst", "Enable an integration and sync models first."));
      return;
    }

    try {
      const created = await createAgent(auth, {
        store: storeValue,
        name,
        provider,
        model,
        systemPrompt,
        adminPrompt,
      });
      closeAgentModal();
      await reloadAgents();
      await onAgentCreated(created.id);
    } catch (err) {
      showAgentError((err as Error).message);
    }
  });

  return { openAgentModal, refreshControls };
};
