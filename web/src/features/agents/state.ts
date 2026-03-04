import { state } from "../../app/state";

export const stopAgentPolling = () => {
  if (state.agentPoller !== null) {
    window.clearInterval(state.agentPoller);
    state.agentPoller = null;
  }
};

export const clearAgentState = () => {
  stopAgentPolling();
  state.currentAgent = null;
  state.currentConversation = null;
};
