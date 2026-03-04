import type { UiConfig } from "../api";

const THEME_KEY = "manage_theme";
const tokenRegistry = [
  "app-gap-xs",
  "app-gap-sm",
  "app-gap-md",
  "app-gap-lg",
  "app-radius-sm",
  "app-radius-md",
  "app-radius-lg",
  "app-shadow",
  "app-border",
  "app-bg",
  "app-surface",
  "app-text",
  "app-muted",
  "app-accent",
  "app-accent-contrast",
  "app-danger",
];

const uiTokens: { light: Record<string, string>; dark: Record<string, string> } = {
  light: {},
  dark: {},
};

const getStoredTheme = (): "light" | "dark" | null => {
  const value = localStorage.getItem(THEME_KEY);
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
};

let currentTheme: "light" | "dark" = getStoredTheme() ?? "light";

const applyTokensForTheme = (theme: "light" | "dark") => {
  const root = document.documentElement;
  const tokens = uiTokens[theme];
  tokenRegistry.forEach((key) => {
    const cssKey = `--${key}`;
    if (tokens[key]) {
      root.style.setProperty(cssKey, tokens[key]);
    } else {
      root.style.removeProperty(cssKey);
    }
  });
};

export const setTheme = (theme: "light" | "dark", persist = true) => {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  applyTokensForTheme(theme);
  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
};

export const getCurrentTheme = () => currentTheme;

export const applyUiConfig = (config: UiConfig) => {
  const normalize = (input?: Record<string, string>) => {
    const output: Record<string, string> = {};
    if (!input) return output;
    tokenRegistry.forEach((key) => {
      if (input[key]) {
        output[key] = input[key];
      }
    });
    return output;
  };

  uiTokens.light = normalize(config.tokens);
  uiTokens.dark = normalize(config.darkTokens);

  const storedTheme = getStoredTheme();
  if (!storedTheme && (config.theme === "light" || config.theme === "dark")) {
    setTheme(config.theme, false);
    return;
  }

  setTheme(currentTheme, false);
};

export const initTheme = () => {
  setTheme(currentTheme, false);
};
