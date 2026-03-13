import { loginWithPassword, saveAuth, type AuthState } from "../../api";

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
            <p class="app-muted">Συνδεθείτε με email και password.</p>
          </div>
          ${error ? `<div class="notification is-danger is-light">${error}</div>` : ""}
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
            <button type="submit" class="button app-button app-primary">Σύνδεση</button>
          </form>
        </div>
      </div>
    </section>
  `;

  const userForm = document.getElementById("user-form") as HTMLFormElement | null;

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
