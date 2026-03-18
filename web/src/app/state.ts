import { loadAuth } from "../api";
import type {
  AgentSummary,
  AuthState,
  IntegrationSettings,
  IntegrationSummary,
  LayoutConfig,
  LogSummary,
  FormSummary,
  ModuleDefinition,
  NavigationPage,
  NavigationPageGroup,
  RemoteDocument,
  SystemUpdateStatus,
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
  openConfirmModalHandler: ((
    options: {
      title: string;
      message: string;
      confirmLabel?: string;
      confirmClassName?: string;
    }
  ) => Promise<boolean>) | null;
  agents: AgentSummary[];
  agentsAll: AgentSummary[];
  logs: LogSummary[];
  forms: FormSummary[];
  navigationPages: NavigationPage[];
  navigationGroups: NavigationPageGroup[];
  activeLanguage: string | null;
  defaultLanguage: string | null;
  moduleSettingsCache: Map<string, Record<string, unknown> | null>;
  currentAgent: RemoteDocument | null;
  currentConversation: RemoteDocument | null;
  returnToDocumentId: string | null;
  onSelectAgentMenu: ((id: string) => void) | null;
  systemUpdate: SystemUpdateStatus | null;
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
  openConfirmModalHandler: null,
  agents: [],
  agentsAll: [],
  logs: [],
  forms: [],
  navigationPages: [],
  navigationGroups: [],
  activeLanguage: null,
  defaultLanguage: null,
  moduleSettingsCache: new Map<string, Record<string, unknown> | null>(),
  currentAgent: null,
  currentConversation: null,
  returnToDocumentId: null,
  onSelectAgentMenu: null,
  systemUpdate: null,
};

export const editorRef: DocumentEditorRef = {
  get: () => state.editor,
  set: (next) => {
    state.editor = next;
  },
};
