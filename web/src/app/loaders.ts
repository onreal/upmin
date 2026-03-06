import {
  fetchAgents,
  fetchIntegrations,
  fetchIntegrationSettings,
  fetchLayoutConfig,
  fetchModules,
  fetchNavigation,
  fetchForms,
  fetchUiConfig,
  type IntegrationSettings,
  type IntegrationSummary,
  type ModuleDefinition,
  type UiConfig,
} from "../api";
import { applyUiConfig, getCurrentTheme, setTheme } from "../ui/theme";
import { state } from "./state";
import { renderNavigation } from "./navigation";
import { renderAgentsMenu } from "../features/agents/menu";
import { renderFormsMenu } from "../features/forms/menu";

export const loadUiConfig = async () => {
  if (!state.auth) {
    return;
  }
  try {
    const response = await fetchUiConfig(state.auth);
    applyUiConfig((response.config ?? {}) as UiConfig);
  } catch {
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
  } catch {
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
      state.modules = response.modules as ModuleDefinition[];
    } else if (response.modules && typeof response.modules === "object") {
      state.modules = Object.values(response.modules as Record<string, ModuleDefinition>);
    } else {
      state.modules = [];
    }
  } catch {
    state.modules = [];
  }
};

export type LoadIntegrationsOptions = {
  onAfterLoad?: () => void;
};

export const loadIntegrations = async ({ onAfterLoad }: LoadIntegrationsOptions = {}) => {
  if (!state.auth) {
    return;
  }

  try {
    const response = await fetchIntegrations(state.auth);
    state.integrations = Array.isArray(response.integrations) ? response.integrations : [];
  } catch {
    state.integrations = [];
  }

  Object.keys(state.integrationSettings).forEach((key) => {
    delete state.integrationSettings[key];
  });

  if (!state.auth) {
    return;
  }

  const enabled = state.integrations.filter((integration) => integration.enabled);
  await Promise.all(
    enabled.map(async (integration: IntegrationSummary) => {
      try {
        const response = await fetchIntegrationSettings(state.auth as NonNullable<typeof state.auth>, integration.name);
        state.integrationSettings[integration.name] = response.settings ?? ({} as IntegrationSettings);
      } catch {
        state.integrationSettings[integration.name] = {};
      }
    })
  );

  onAfterLoad?.();
};

export const loadAgents = async (onSelectAgent: (id: string) => void) => {
  if (!state.auth) {
    return;
  }
  try {
    const response = await fetchAgents(state.auth);
    state.agents = Array.isArray(response.agents) ? response.agents : [];
  } catch {
    state.agents = [];
  }
  renderAgentsMenu(state.agents, onSelectAgent);
};

export const loadForms = async () => {
  if (!state.auth) {
    return;
  }
  try {
    const response = await fetchForms(state.auth);
    state.forms = Array.isArray(response.forms) ? response.forms : [];
  } catch {
    state.forms = [];
  }

  renderFormsMenu(state.forms);
};

export const refreshNavigation = async (onSelectDocument: (id: string) => void) => {
  if (!state.auth) {
    return;
  }
  try {
    const nav = await fetchNavigation(state.auth);
    state.navigationPages = nav.pages;
    renderNavigation(nav.pages, onSelectDocument);
    await loadForms();
  } catch (err) {
    alert((err as Error).message);
  }
};
