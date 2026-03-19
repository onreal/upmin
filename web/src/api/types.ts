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

export type NavigationVariant = {
  id: string;
  name: string;
  language?: string | null;
  order?: number | null;
  store?: string | null;
  path?: string | null;
  position?: string | null;
  position_view?: string | null;
};

export type NavigationSectionGroup = {
  key: string;
  order?: number | null;
  variants: NavigationVariant[];
};

export type NavigationPageGroup = {
  page: string;
  variants: NavigationVariant[];
  sections: NavigationSectionGroup[];
};

export type NavigationPage = {
  page: string;
  name: string;
  language?: string | null;
  order?: number | null;
  documentId?: string | null;
  store?: string | null;
  path?: string | null;
  position?: string | null;
  position_view?: string | null;
  languages?: string[];
  variants?: NavigationVariant[];
  sections: Array<{
    id: string;
    name: string;
    language?: string | null;
    order?: number | null;
    store: string;
    path: string;
    position?: string | null;
    position_view?: string | null;
    languages?: string[];
    variants?: NavigationVariant[];
  }>;
};

export type DocumentPayload = {
  id?: string | null;
  type?: string | null;
  page: string;
  name: string;
  language?: string | null;
  order: number;
  section?: boolean;
  modules?: string[] | null;
  module?: string | null;
  position?: string | null;
  position_view?: string | null;
  data: unknown;
};

export type RemoteDocument = {
  id: string;
  store: string;
  path: string;
  payload: DocumentPayload;
};

export type CreationRecord = {
  id: string;
  createdAt: string;
  reason?: string | null;
  target?: "public" | "build" | null;
  snapshotPath: string;
  snapshotMimeType?: string | null;
  backupPath: string;
};

export type CreationActionResponse = {
  document: RemoteDocument;
  creation?: CreationRecord;
};

export type WebsiteBuildActionResponse = {
  status: string;
  entries?: number;
  publishedAt?: string;
  cleanedAt?: string;
  copiedAt?: string;
  creation?: CreationRecord;
};

export type SystemUpdateStatus = {
  status: "idle" | "checking" | "ready" | "running" | "failed" | "completed";
  locked: boolean;
  currentVersion?: string | null;
  latestVersion?: string | null;
  updateAvailable: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
  message?: string | null;
  error?: string | null;
  systemPagesSynced?: number;
};

export type AgentSummary = {
  id: string;
  uid?: string | null;
  name: string;
  language?: string | null;
  provider?: string | null;
  providerId?: string | null;
  store: string;
  path: string;
  order?: number;
};

export type AgentConversationSummary = {
  id: string;
  name: string;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  type: "text" | "password" | "select";
  required: boolean;
  options?: Array<{
    value: string;
    label: string;
  }>;
};

export type IntegrationSummary = {
  id: string;
  name: string;
  description: string;
  fields: IntegrationField[];
  supportsModels: boolean;
  enabled: boolean;
  syncing?: boolean;
  lastSyncError?: string | null;
  lastSyncedAt?: string | null;
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

export type FormSummary = {
  id: string;
  formId: string;
  pageId?: string | null;
  formSettingsId?: string | null;
  name: string;
  label?: string | null;
  store: string;
  path: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  entries?: number;
  settingsKey?: string | null;
  source?: {
    documentUid?: string;
    documentId?: string;
    store?: string;
    path?: string;
    page?: string;
    name?: string;
    section?: boolean;
  } | null;
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
  translations?: Record<string, Record<string, string>>;
};
