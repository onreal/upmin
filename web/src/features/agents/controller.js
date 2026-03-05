import { fetchAgent } from "../../api";
import { state } from "../../app/state";
import { clearAgentState } from "./state";
import { renderAgentView } from "./view";
export const loadAgent = async (id, reloadAgents) => {
    if (!state.auth) {
        return;
    }
    try {
        const agent = await fetchAgent(state.auth, id);
        state.currentDocument = null;
        await renderAgentView({ auth: state.auth, agentDoc: agent, reloadAgents });
    }
    catch (err) {
        alert(err.message);
    }
};
export { clearAgentState };
