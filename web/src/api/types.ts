export type AuthUser = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  attributes?: Record<string, unknown>;
};

export type AuthState =
  | { type: "apiKey"; value: string }
  | { type: "token"; value: string; user?: AuthUser }
  | null;

export type NavigationPage = {
  page: string;
  name: string;
  language?: string | null;
  order?: number | null;
  documentId?: string | null;
  store?: string | null;
  path?: string | null;
  position?: string | null;
  sections: Array<{
    id: string;
    name: string;
    language?: string | null;
    order?: number | null;
    store: string;
    path: string;
    position?: string | null;
  }>;
};

export type DocumentPayload = {
  type?: string | null;
  page: string;
  name: string;
  language?: string | null;
  order: number;
  section?: boolean;
  modules?: string[] | null;
  module?: string | null;
  position?: string | null;
  data: unknown;
};

export type RemoteDocument = {
  id: string;
  store: string;
  path: string;
  payload: DocumentPayload;
};

export type AgentSummary = {
  id: string;
  name: string;
  store: string;
  path: string;
  order?: number;
};

export type AgentConversationSummary = {
  id: string;
  name: string;
  createdAt?: string | null;
  store: string;
  path: string;
};

export type ChatConversationSummary = {
  id: string;
  name: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  store: string;
  path: string;
};

export type UiConfig = {
  theme?: "light" | "dark";
  tokens?: Record<string, string>;
  darkTokens?: Record<string, string>;
};

export type ModuleDefinition = {
  name: string;
  description: string;
  input: string;
  output: string;
  parameters?: Record<string, unknown>;
  author?: string;
  schema: Record<string, unknown>;
};

export type IntegrationField = {
  key: string;
  label: string;
  type: "text" | "password";
  required: boolean;
};

export type IntegrationSummary = {
  name: string;
  description: string;
  fields: IntegrationField[];
  supportsModels: boolean;
  enabled: boolean;
};

export type IntegrationSettings = Record<string, unknown> & {
  models?: string[];
};

export type LogSummary = {
  id: string;
  name: string;
  path: string;
  count?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type LayoutConfig = {
  header?: {
    title?: string;
    subtitle?: string;
    settingsLabel?: string;
    themeLabel?: string;
    createLabel?: string;
    profileLabel?: string;
    logoutLabel?: string;
  };
  sidebar?: {
    publicLabel?: string;
    privateLabel?: string;
  };
  profile?: {
    title?: string;
    subtitle?: string;
    saveLabel?: string;
  };
};
