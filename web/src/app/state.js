import { loadAuth } from "../api";
export const state = {
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
    moduleSettingsCache: new Map(),
    currentAgent: null,
    currentConversation: null,
    agentPoller: null,
    returnToDocumentId: null,
};
export const editorRef = {
    get: () => state.editor,
    set: (next) => {
        state.editor = next;
    },
};
