import type { AuthState, DocumentPayload, ModuleDefinition } from "../api";
import type { JsonEditorHandle } from "../json-editor";

export type ModuleRenderContext = {
  auth: AuthState | null;
  module: ModuleDefinition;
  payload: DocumentPayload;
  editor: JsonEditorHandle | null;
  settings?: Record<string, unknown> | null;
  openSettings?: () => void;
  hideHeader?: boolean;
  autoLoadLatestConversation?: boolean;
};

export type ModuleRenderer = (panel: HTMLElement, context: ModuleRenderContext) => void;
