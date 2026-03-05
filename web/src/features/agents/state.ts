import { state } from "../../app/state";
import { clearRegisteredChatCleanups } from "../chat/runtime";

export const clearAgentState = () => {
  clearRegisteredChatCleanups();
  state.currentAgent = null;
  state.currentConversation = null;
};
