type Cleanup = () => void;

let integrationCleanup: Cleanup | null = null;

const runCleanup = (cleanup: Cleanup | null) => {
  if (!cleanup) {
    return;
  }

  cleanup();
};

export const registerIntegrationCleanup = (cleanup: Cleanup | null) => {
  const previous = integrationCleanup;
  integrationCleanup = null;
  runCleanup(previous);
  integrationCleanup = cleanup;
};

export const clearRegisteredIntegrationCleanup = () => {
  const cleanup = integrationCleanup;
  integrationCleanup = null;
  runCleanup(cleanup);
};
