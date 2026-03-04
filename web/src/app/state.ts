import { loadAuth } from "../api";
import type {
  AgentSummary,
  AuthState,
  IntegrationSettings,
  IntegrationSummary,
  LayoutConfig,
  LogSummary,
  ModuleDefinition,
  NavigationPage,
  RemoteDocument,
} from "../api";
import type { JsonEditorHandle } from "../json-editor";
import type { DocumentEditorRef } from "../views/documents";

export type AppState = {
  auth: AuthState;
  currentDocument: RemoteDocument | null;
  editor: JsonEditorHandle | null;
  authDocumentId: string | null;
  layoutConfig: LayoutConfig;
  modules: ModuleDefinition[];
  integrations: IntegrationSummary[];
  integrationSettings: Record<string, IntegrationSettings>;
  currentIntegration: IntegrationSummary | null;
  openIntegrationModalHandler: ((integration: IntegrationSummary) => void) | null;
  agents: AgentSummary[];
  logs: LogSummary[];
  navigationPages: NavigationPage[];
  moduleSettingsCache: Map<string, Record<string, unknown> | null>;
  currentAgent: RemoteDocument | null;
  currentConversation: RemoteDocument | null;
  agentPoller: number | null;
};

export const state: AppState = {
  auth: loadAuth(),
  currentDocument: null,
  editor: null,
  authDocumentId: null,
  layoutConfig: {},
  modules: [],
  integrations: [],
  integrationSettings: {},
  currentIntegration: null,
  openIntegrationModalHandler: null,
  agents: [],
  logs: [],
  navigationPages: [],
  moduleSettingsCache: new Map<string, Record<string, unknown> | null>(),
  currentAgent: null,
  currentConversation: null,
  agentPoller: null,
};

export const editorRef: DocumentEditorRef = {
  get: () => state.editor,
  set: (next) => {
    state.editor = next;
  },
};
