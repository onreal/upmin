type Cleanup = () => void;

let agentChatCleanup: Cleanup | null = null;
let moduleChatCleanup: Cleanup | null = null;

const runCleanup = (cleanup: Cleanup | null) => {
  if (!cleanup) {
    return;
  }

  cleanup();
};

export const registerAgentChatCleanup = (cleanup: Cleanup | null) => {
  const previous = agentChatCleanup;
  agentChatCleanup = null;
  runCleanup(previous);
  agentChatCleanup = cleanup;
};

export const registerModuleChatCleanup = (cleanup: Cleanup | null) => {
  const previous = moduleChatCleanup;
  moduleChatCleanup = null;
  runCleanup(previous);
  moduleChatCleanup = cleanup;
};

export const clearRegisteredChatCleanups = () => {
  const agentCleanup = agentChatCleanup;
  const moduleCleanup = moduleChatCleanup;
  agentChatCleanup = null;
  moduleChatCleanup = null;
  runCleanup(agentCleanup);
  runCleanup(moduleCleanup);
};
