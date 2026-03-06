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
import { filterAgentsByLanguage, normalizeLanguageValue, resolveNavigationPages } from "./language";

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
  state.onSelectAgentMenu = onSelectAgent;
  try {
    const response = await fetchAgents(state.auth);
    state.agentsAll = Array.isArray(response.agents) ? response.agents : [];
    state.agents = filterAgentsByLanguage(state.agentsAll, state.activeLanguage);
  } catch {
    state.agentsAll = [];
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
    const pages = Array.isArray(nav.pages) ? nav.pages : [];
    const defaultLanguage = normalizeLanguageValue(nav.defaultLanguage ?? null);
    state.navigationGroups = pages;
    state.defaultLanguage = defaultLanguage;
    const resolved = resolveNavigationPages(pages, defaultLanguage, state.activeLanguage);
    state.activeLanguage = resolved.activeLanguage;
    state.navigationPages = resolved.pages;
    state.agents = filterAgentsByLanguage(state.agentsAll, state.activeLanguage);
    if (state.onSelectAgentMenu) {
      renderAgentsMenu(state.agents, state.onSelectAgentMenu);
    }
    renderNavigation(resolved.pages, onSelectDocument);
    await loadForms();
  } catch (err) {
    alert((err as Error).message);
  }
};
