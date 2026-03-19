import type { LayoutConfig } from "../api";

export type TranslationVariables = Record<string, string | number | boolean | null | undefined>;

let currentTranslations: Record<string, Record<string, string>> = {};
let currentLanguage: string | null = null;

const normalizeLanguage = (value?: string | null) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};

const candidateLanguages = () => {
  const documentLanguage = typeof document !== "undefined" ? normalizeLanguage(document.documentElement.lang) : null;
  const active = currentLanguage ?? documentLanguage;
  const primary = active?.split("-")[0] ?? null;
  return [active, primary, "en"].filter((value, index, items): value is string => !!value && items.indexOf(value) === index);
};

export const setAdminTranslationConfig = (layoutConfig: LayoutConfig | null | undefined) => {
  currentTranslations = layoutConfig?.translations ?? {};
};

export const getAdminLanguage = () => currentLanguage;

export const setAdminLanguage = (language: string | null | undefined) => {
  const normalized = normalizeLanguage(language);
  const changed = normalized !== currentLanguage;
  currentLanguage = normalized;
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized ?? "en";
  }
  return changed;
};

const lookupTranslation = (key: string) => {
  for (const language of candidateLanguages()) {
    const table = currentTranslations[language];
    if (!table) {
      continue;
    }
    const value = table[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return null;
};

const translatedValue = (key: string) => lookupTranslation(key);

const interpolate = (template: string, variables?: TranslationVariables) => {
  if (!variables) {
    return template;
  }
  return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_, key: string) => {
    const value = variables[key];
    return value == null ? "" : String(value);
  });
};

export const adminText = (key: string, fallback: string, variables?: TranslationVariables) =>
  interpolate(lookupTranslation(key) ?? fallback, variables);

export const adminConfiguredText = (
  configured: unknown,
  key: string,
  fallback: string,
  variables?: TranslationVariables
) => {
  const translated = translatedValue(key);
  if (translated) {
    return interpolate(translated, variables);
  }
  if (typeof configured === "string" && configured.trim() !== "") {
    return interpolate(configured, variables);
  }
  return interpolate(fallback, variables);
};
