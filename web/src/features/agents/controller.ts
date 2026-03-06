import { fetchAgent } from "../../api";
import { state } from "../../app/state";
import { pushNotice } from "../../ui/notice";
import { clearRegisteredIntegrationCleanup } from "../integrations/runtime";
import { clearAgentState } from "./state";
import { renderAgentView } from "./view";

export const loadAgent = async (id: string, reloadAgents: () => Promise<void>) => {
  if (!state.auth) {
    return;
  }
  clearRegisteredIntegrationCleanup();
  try {
    const agent = await fetchAgent(state.auth, id);
    state.currentDocument = null;
    await renderAgentView({ auth: state.auth, agentDoc: agent, reloadAgents });
  } catch (err) {
    pushNotice("error", (err as Error).message);
  }
};

export { clearAgentState };
