import { updateIntegrationSettings, type AuthState, type IntegrationSummary } from "../../api";
import { state } from "../../app/state";

export type IntegrationModalContext = {
  getAuth: () => AuthState | null;
  reloadIntegrations: () => Promise<void>;
  onAfterSave: () => void;
};

export type IntegrationModalController = {
  openIntegrationModal: (integration: IntegrationSummary) => void;
};

export const initIntegrationModal = ({
  getAuth,
  reloadIntegrations,
  onAfterSave,
}: IntegrationModalContext): IntegrationModalController => {
  const integrationModal = document.getElementById("integration-modal");
  const integrationForm = document.getElementById("integration-form") as HTMLFormElement | null;
  const integrationFields = document.getElementById("integration-fields");
  const integrationError = document.getElementById("integration-error");
  const integrationTitle = document.getElementById("integration-modal-title");
  const integrationCancel = document.getElementById("integration-cancel");

  let currentIntegration: IntegrationSummary | null = null;

  const showIntegrationError = (message: string) => {
    if (!integrationError) {
      alert(message);
      return;
    }
    integrationError.textContent = message;
    integrationError.classList.remove("is-hidden");
  };

  const clearIntegrationError = () => {
    if (!integrationError) {
      return;
    }
    integrationError.textContent = "";
    integrationError.classList.add("is-hidden");
  };

  const closeIntegrationModal = () => {
    integrationModal?.classList.remove("is-active");
    clearIntegrationError();
    currentIntegration = null;
  };

  const buildIntegrationFields = (integration: IntegrationSummary) => {
    if (!integrationFields) {
      return;
    }
    integrationFields.innerHTML = "";

    const existing = state.integrationSettings[integration.name];

    integration.fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = "field";

      const label = document.createElement("label");
      label.className = "label";
      label.textContent = field.label;

      const input = document.createElement("input");
      input.className = "input";
      input.type = field.type === "password" ? "password" : "text";
      input.id = `integration-${integration.name}-${field.key}`;
      input.autocomplete = "off";
      if (field.required) {
        input.required = true;
      }

      const existingValue = existing?.[field.key];
      if (typeof existingValue === "string") {
        input.value = existingValue;
      }

      wrapper.appendChild(label);

      if (field.type === "password") {
        const fieldRow = document.createElement("div");
        fieldRow.className = "field has-addons";

        const inputControl = document.createElement("div");
        inputControl.className = "control is-expanded";
        inputControl.appendChild(input);

        const buttonControl = document.createElement("div");
        buttonControl.className = "control";
        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "button app-button app-ghost";
        toggleButton.innerHTML = `
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
              <path
                d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              ></path>
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"></circle>
            </svg>
          </span>
        `;

        toggleButton.addEventListener("click", () => {
          input.type = input.type === "password" ? "text" : "password";
        });

        buttonControl.appendChild(toggleButton);
        fieldRow.appendChild(inputControl);
        fieldRow.appendChild(buttonControl);
        wrapper.appendChild(fieldRow);
      } else {
        const control = document.createElement("div");
        control.className = "control";
        control.appendChild(input);
        wrapper.appendChild(control);
      }

      if (field.required) {
        const help = document.createElement("p");
        help.className = "help app-muted";
        help.textContent = "Required";
        wrapper.appendChild(help);
      }

      integrationFields.appendChild(wrapper);
    });
  };

  const openIntegrationModal = (integration: IntegrationSummary) => {
    currentIntegration = integration;
    clearIntegrationError();
    if (integrationTitle) {
      integrationTitle.textContent = `${integration.enabled ? "Edit" : "Enable"} ${integration.name}`;
    }
    buildIntegrationFields(integration);
    integrationModal?.classList.add("is-active");
  };

  integrationCancel?.addEventListener("click", closeIntegrationModal);
  integrationModal?.querySelectorAll("[data-close='integration']").forEach((el) => {
    el.addEventListener("click", closeIntegrationModal);
  });

  integrationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const auth = getAuth();
    if (!auth || !currentIntegration) {
      return;
    }

    clearIntegrationError();

    const payload: Record<string, unknown> = {};
    for (const field of currentIntegration.fields) {
      const input = document.getElementById(
        `integration-${currentIntegration.name}-${field.key}`
      ) as HTMLInputElement | null;
      const value = input?.value.trim() || "";
      if (!value) {
        if (field.required) {
          showIntegrationError(`${field.label} is required.`);
          return;
        }
        continue;
      }
      payload[field.key] = value;
    }

    try {
      await updateIntegrationSettings(auth, currentIntegration.name, payload);
      closeIntegrationModal();
      await reloadIntegrations();
      onAfterSave();
    } catch (err) {
      showIntegrationError((err as Error).message);
    }
  });

  return { openIntegrationModal };
};
