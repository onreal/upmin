import type { IntegrationSettings, IntegrationSummary } from "../../api";

export const getEnabledIntegrations = (integrations: IntegrationSummary[]) =>
  integrations.filter((integration) => integration.enabled);

export const getIntegrationModels = (
  integrationSettings: Record<string, IntegrationSettings>,
  name: string
) => {
  const settings = integrationSettings[name];
  const models = settings?.models;
  if (!Array.isArray(models)) {
    return [];
  }
  return models.filter((model): model is string => typeof model === "string");
};

export const populateProviderSelect = (
  select: HTMLSelectElement,
  integrations: IntegrationSummary[],
  selectedProvider?: string | null,
  help?: HTMLElement | null,
  includeDisabledCurrent = false
) => {
  const enabled = getEnabledIntegrations(integrations);
  select.innerHTML = "";

  if (!enabled.length) {
    const option = new Option("No integrations enabled", "", true, true);
    option.disabled = true;
    select.append(option);
    select.disabled = true;
    if (help) {
      help.textContent = "Enable an integration from Settings > Integrations.";
    }
    return "";
  }

  select.disabled = false;

  if (includeDisabledCurrent && selectedProvider) {
    const exists = enabled.some((integration) => integration.name === selectedProvider);
    if (!exists) {
      const option = new Option(`${selectedProvider} (disabled)`, selectedProvider, true, true);
      option.disabled = true;
      select.append(option);
      if (help) {
        help.textContent = "Current provider is disabled. Select an enabled provider.";
      }
    } else if (help) {
      help.textContent = "";
    }
  } else if (help) {
    help.textContent = "";
  }

  enabled.forEach((integration) => {
    const option = new Option(integration.name, integration.name);
    select.append(option);
  });

  const defaultProvider = enabled[0]?.name ?? "";
  const provider =
    selectedProvider && enabled.some((integration) => integration.name === selectedProvider)
      ? selectedProvider
      : defaultProvider;
  if (provider) {
    select.value = provider;
  }

  return select.value;
};

export const populateModelSelect = (
  select: HTMLSelectElement,
  models: string[],
  selectedModel?: string | null,
  includeDisabledCurrent = false
) => {
  select.innerHTML = "";

  if (!models.length) {
    const option = new Option("No models synced", "", true, true);
    option.disabled = true;
    select.append(option);
    select.disabled = true;
    return "";
  }

  select.disabled = false;

  if (includeDisabledCurrent && selectedModel && !models.includes(selectedModel)) {
    const option = new Option(`${selectedModel} (unavailable)`, selectedModel, true, true);
    option.disabled = true;
    select.append(option);
  }

  models.forEach((model) => {
    const option = new Option(model, model);
    select.append(option);
  });

  const defaultModel = models[0] ?? "";
  const model = selectedModel && models.includes(selectedModel) ? selectedModel : defaultModel;
  if (model) {
    select.value = model;
  }

  return select.value;
};

export const setupProviderModelControls = (
  providerSelect: HTMLSelectElement,
  modelSelect: HTMLSelectElement,
  modelSearch: HTMLInputElement | null,
  providerHelp: HTMLElement | null,
  integrations: IntegrationSummary[],
  integrationSettings: Record<string, IntegrationSettings>,
  selectedProvider?: string | null,
  selectedModel?: string | null,
  includeDisabledCurrent = false
) => {
  const modelsForProvider = (provider: string) =>
    getIntegrationModels(integrationSettings, provider);

  let activeProvider = populateProviderSelect(
    providerSelect,
    integrations,
    selectedProvider,
    providerHelp,
    includeDisabledCurrent
  );
  let availableModels = modelsForProvider(activeProvider);
  let activeModel = populateModelSelect(
    modelSelect,
    availableModels,
    selectedModel,
    includeDisabledCurrent
  );

  const applySearch = () => {
    if (!modelSearch) {
      return;
    }
    const query = modelSearch.value.trim().toLowerCase();
    const filtered = query
      ? availableModels.filter((model) => model.toLowerCase().includes(query))
      : availableModels;
    activeModel = populateModelSelect(modelSelect, filtered, activeModel, includeDisabledCurrent);
  };

  providerSelect.addEventListener("change", () => {
    activeProvider = providerSelect.value;
    availableModels = modelsForProvider(activeProvider);
    activeModel = populateModelSelect(modelSelect, availableModels, null, includeDisabledCurrent);
    applySearch();
  });

  modelSelect.addEventListener("change", () => {
    activeModel = modelSelect.value;
  });

  modelSearch?.addEventListener("input", applySearch);

  return {
    getProvider: () => activeProvider,
    getModel: () => activeModel,
  };
};
