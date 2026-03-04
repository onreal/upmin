import { loginWithApiKey, loginWithPassword, saveAuth, type AuthState } from "../../api";

export type LoginContext = {
  container: HTMLElement;
  onAuth: (auth: AuthState | null) => void;
  onSuccess: () => Promise<void>;
  onClearAgentState: () => void;
};

export const renderLogin = (context: LoginContext, error?: string) => {
  const { container, onAuth, onSuccess, onClearAgentState } = context;
  onClearAgentState();

  container.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="box app-surface">
          <div class="mb-4">
            <h1 class="title is-4">Admin Login</h1>
            <p class="app-muted">Συνδεθείτε με API key ή email/password.</p>
          </div>
          ${error ? `<div class="notification is-danger is-light">${error}</div>` : ""}
          <div class="columns is-variable is-4">
            <div class="column">
              <form id="api-key-form">
                <div class="field">
                  <label class="label">API Key</label>
                  <div class="control">
                    <input class="input" type="password" name="apiKey" required />
                  </div>
                </div>
                <button type="submit" class="button app-button app-primary">Σύνδεση με API Key</button>
              </form>
            </div>
            <div class="column">
              <form id="user-form">
                <div class="field">
                  <label class="label">Email</label>
                  <div class="control">
                    <input class="input" type="email" name="email" required />
                  </div>
                </div>
                <div class="field">
                  <label class="label">Password</label>
                  <div class="control">
                    <input class="input" type="password" name="password" required />
                  </div>
                </div>
                <button type="submit" class="button app-button app-primary">Σύνδεση χρήστη</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  const apiKeyForm = document.getElementById("api-key-form") as HTMLFormElement | null;
  const userForm = document.getElementById("user-form") as HTMLFormElement | null;

  apiKeyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(apiKeyForm);
    const apiKey = String(form.get("apiKey") || "");
    if (!apiKey) {
      return;
    }
    try {
      await loginWithApiKey(apiKey);
      const nextAuth: AuthState = { type: "apiKey", value: apiKey };
      onAuth(nextAuth);
      saveAuth(nextAuth);
      await onSuccess();
    } catch (err) {
      renderLogin(context, (err as Error).message);
    }
  });

  userForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(userForm);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    if (!email || !password) {
      return;
    }
    try {
      const result = await loginWithPassword(email, password);
      const nextAuth: AuthState = { type: "token", value: result.token, user: result.user };
      onAuth(nextAuth);
      saveAuth(nextAuth);
      await onSuccess();
    } catch (err) {
      renderLogin(context, (err as Error).message);
    }
  });
};
