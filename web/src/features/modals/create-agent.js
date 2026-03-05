import { createAgent } from "../../api";
import { state } from "../../app/state";
import { setupProviderModelControls } from "../integrations/helpers";
export const initAgentModal = ({ getAuth, reloadAgents, onAgentCreated }) => {
    const agentModal = document.getElementById("agent-modal");
    const agentError = document.getElementById("agent-error");
    const agentForm = document.getElementById("agent-form");
    const agentStoreInput = document.getElementById("agent-store");
    const agentStoreTabs = Array.from(agentModal?.querySelectorAll("[data-agent-store]") ?? []);
    const agentProviderSelect = document.getElementById("agent-provider");
    const agentModelSelect = document.getElementById("agent-model");
    const agentModelSearch = document.getElementById("agent-model-search");
    const agentProviderHelp = document.getElementById("agent-provider-help");
    const agentSubmit = document.getElementById("agent-submit");
    const showAgentError = (message) => {
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
    const setAgentStore = (store) => {
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
        setupProviderModelControls(agentProviderSelect, agentModelSelect, agentModelSearch, agentProviderHelp, state.integrations, state.integrationSettings);
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
        const name = document.getElementById("agent-name")?.value.trim() || "";
        const provider = agentProviderSelect?.value.trim() || "";
        const model = agentModelSelect?.value.trim() || "";
        const systemPrompt = document.getElementById("agent-system")?.value.trim() || "";
        const adminPrompt = document.getElementById("agent-admin")?.value.trim() || "";
        const storeValue = document.getElementById("agent-store")?.value === "private"
            ? "private"
            : "public";
        if (!name || !provider || !model || !systemPrompt || !adminPrompt) {
            showAgentError("All fields are required.");
            return;
        }
        if (agentProviderSelect?.disabled || agentModelSelect?.disabled) {
            showAgentError("Enable an integration and sync models first.");
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
        }
        catch (err) {
            showAgentError(err.message);
        }
    });
    return { openAgentModal, refreshControls };
};
