import { fetchAgents, fetchIntegrations, fetchIntegrationSettings, fetchLayoutConfig, fetchModules, fetchNavigation, fetchUiConfig, } from "../api";
import { applyUiConfig, getCurrentTheme, setTheme } from "../ui/theme";
import { state } from "./state";
import { renderNavigation } from "./navigation";
import { renderAgentsMenu } from "../features/agents/menu";
export const loadUiConfig = async () => {
    if (!state.auth) {
        return;
    }
    try {
        const response = await fetchUiConfig(state.auth);
        applyUiConfig((response.config ?? {}));
    }
    catch {
        setTheme(getCurrentTheme(), false);
    }
};
export const loadLayoutConfig = async () => {
    if (!state.auth) {
        return;
    }
    try {
        const response = await fetchLayoutConfig(state.auth);
        state.layoutConfig = response.config ?? {};
    }
    catch {
        state.layoutConfig = {};
    }
};
export const loadModules = async () => {
    if (!state.auth) {
        return;
    }
    try {
        const response = await fetchModules(state.auth);
        if (Array.isArray(response.modules)) {
            state.modules = response.modules;
        }
        else if (response.modules && typeof response.modules === "object") {
            state.modules = Object.values(response.modules);
        }
        else {
            state.modules = [];
        }
    }
    catch {
        state.modules = [];
    }
};
export const loadIntegrations = async ({ onAfterLoad } = {}) => {
    if (!state.auth) {
        return;
    }
    try {
        const response = await fetchIntegrations(state.auth);
        state.integrations = Array.isArray(response.integrations) ? response.integrations : [];
    }
    catch {
        state.integrations = [];
    }
    Object.keys(state.integrationSettings).forEach((key) => {
        delete state.integrationSettings[key];
    });
    if (!state.auth) {
        return;
    }
    const enabled = state.integrations.filter((integration) => integration.enabled);
    await Promise.all(enabled.map(async (integration) => {
        try {
            const response = await fetchIntegrationSettings(state.auth, integration.name);
            state.integrationSettings[integration.name] = response.settings ?? {};
        }
        catch {
            state.integrationSettings[integration.name] = {};
        }
    }));
    onAfterLoad?.();
};
export const loadAgents = async (onSelectAgent) => {
    if (!state.auth) {
        return;
    }
    try {
        const response = await fetchAgents(state.auth);
        state.agents = Array.isArray(response.agents) ? response.agents : [];
    }
    catch {
        state.agents = [];
    }
    renderAgentsMenu(state.agents, onSelectAgent);
};
export const refreshNavigation = async (onSelectDocument) => {
    if (!state.auth) {
        return;
    }
    try {
        const nav = await fetchNavigation(state.auth);
        state.navigationPages = nav.pages;
        renderNavigation(nav.pages, onSelectDocument);
    }
    catch (err) {
        alert(err.message);
    }
};
