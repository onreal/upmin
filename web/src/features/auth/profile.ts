import { fetchDocument, saveAuth, updateDocument, type AuthState, type DocumentPayload, type RemoteDocument } from "../../api";
import { state } from "../../app/state";
import { profileCopy } from "../../app/layout";
import { adminText } from "../../app/translations";
import { isAuthData, isTokenAuth, type EditableUser } from "./utils";
import { clearAgentState } from "../agents/state";
import { clearRegisteredIntegrationCleanup } from "../integrations/runtime";

export const renderProfile = async () => {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }
  clearAgentState();
  clearRegisteredIntegrationCleanup();

  const auth = state.auth;
  if (!isTokenAuth(auth) || !auth.user) {
    content.innerHTML = `<p class="app-muted">${adminText("profile.noApiKeyProfile", "No profile is available for API key authentication.")}</p>`;
    return;
  }
  const currentUser = auth.user;

  if (!state.authDocumentId) {
    content.innerHTML = `<p class="app-muted">${adminText("profile.authMissing", "auth.json was not found.")}</p>`;
    return;
  }

  let authDoc: RemoteDocument;
  try {
    authDoc = await fetchDocument(auth, state.authDocumentId);
  } catch (err) {
    content.innerHTML = `<p class="app-muted">${(err as Error).message}</p>`;
    return;
  }

  const data = authDoc.payload.data;
  if (!isAuthData(data)) {
    content.innerHTML = `<p class="app-muted">${adminText("profile.authNoUsers", "auth.json does not contain users.")}</p>`;
    return;
  }

  const users = data.users;
  const index = users.findIndex((user) => {
    if (user.email === currentUser.email) return true;
    if (user.id && user.id === currentUser.id) return true;
    if (user.uuid && user.uuid === currentUser.id) return true;
    return false;
  });

  if (index < 0) {
    content.innerHTML = `<p class="app-muted">${adminText("profile.userMissing", "The user was not found in auth.json.")}</p>`;
    return;
  }

  const current = users[index];
  const profile = profileCopy();
  content.innerHTML = `
    <div class="mb-4">
      <h1 class="title is-4">${profile.title}</h1>
      <p class="app-muted">${profile.subtitle}</p>
    </div>
    <div class="columns is-variable is-4 is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("profile.firstName", "First Name")}</label>
          <div class="control">
            <input id="profile-firstname" class="input" type="text" value="${current.firstname || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("profile.lastName", "Last Name")}</label>
          <div class="control">
            <input id="profile-lastname" class="input" type="text" value="${current.lastname || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("auth.email", "Email")}</label>
          <div class="control">
            <input id="profile-email" class="input" type="email" value="${current.email || ""}" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">${adminText("auth.password", "Password")}</label>
          <div class="control">
            <input id="profile-password" class="input" type="password" placeholder="${adminText("profile.passwordPlaceholder", "Leave blank to keep")}" />
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <button id="profile-save" class="button app-button app-primary">${profile.saveLabel}</button>
    </div>
  `;

  document.getElementById("profile-save")?.addEventListener("click", async () => {
    if (!isTokenAuth(state.auth) || !state.auth.user) {
      return;
    }

    const firstname = (document.getElementById("profile-firstname") as HTMLInputElement | null)
      ?.value.trim();
    const lastname = (document.getElementById("profile-lastname") as HTMLInputElement | null)
      ?.value.trim();
    const email = (document.getElementById("profile-email") as HTMLInputElement | null)
      ?.value.trim();
    const password = (document.getElementById("profile-password") as HTMLInputElement | null)
      ?.value.trim();

    const updatedUser: EditableUser = {
      ...current,
      firstname: firstname ?? current.firstname,
      lastname: lastname ?? current.lastname,
      email: email ?? current.email,
    };

    if (password) {
      updatedUser.password = password;
    }

    const updatedUsers = [...users];
    updatedUsers[index] = updatedUser;

    const updatedPayload: DocumentPayload = {
      ...authDoc.payload,
      data: {
        ...data,
        users: updatedUsers,
      },
    };

    try {
      await updateDocument(state.auth as AuthState, authDoc.id, updatedPayload);
      state.auth = {
        ...state.auth,
        user: {
          ...state.auth.user,
          firstname: updatedUser.firstname,
          lastname: updatedUser.lastname,
          email: updatedUser.email,
        },
      };
      saveAuth(state.auth);
      renderProfile();
    } catch (err) {
      alert((err as Error).message);
    }
  });
};
