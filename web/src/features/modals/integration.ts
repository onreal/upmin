import { updateIntegrationSettings, type AuthState, type IntegrationSummary } from "../../api";
import { state } from "../../app/state";
import { adminText } from "../../app/translations";

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

  const getDefaultFieldValue = (integration: IntegrationSummary, key: string) => {
    if (integration.name === "codex-cli") {
      switch (key) {
        case "authMode":
          return "cliAuth";
        case "binary":
          return "codex";
        case "args":
          return "--dangerously-bypass-approvals-and-sandbox exec --json --output-last-message {outputFile} --skip-git-repo-check --cd {workingDir} --model {model}";
        case "workingDir":
          return "/app";
        default:
          return "";
      }
    }
    return "";
  };

  const buildIntegrationFields = (integration: IntegrationSummary) => {
    if (!integrationFields) {
      return;
    }
    integrationFields.innerHTML = "";

    const existing = state.integrationSettings[integration.name];

    if (integration.name === "codex-cli") {
      const notice = document.createElement("div");
      notice.className = "notification is-light app-muted";
      notice.innerHTML =
        adminText(
          "integrations.codexCliNotice",
          "Development setup: use <code>CLI authentication</code> to avoid API costs, then run <code>docker compose exec manage codex login --device-auth</code> once. The Docker volume keeps the Codex credentials between restarts."
        );
      integrationFields.appendChild(notice);
    }

    integration.fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = "field";
      wrapper.dataset.integrationFieldKey = field.key;

      const label = document.createElement("label");
      label.className = "label";
      label.textContent = field.label;

      const existingValue = existing?.[field.key];
      const fallback =
        integration.name === "codex-cli" &&
        field.key === "authMode" &&
        typeof existing?.apiKey === "string" &&
        existing.apiKey.trim() !== ""
          ? "apiKey"
          : getDefaultFieldValue(integration, field.key);
      const initialValue = typeof existingValue === "string" ? existingValue : fallback;

      if (field.type === "select") {
        const control = document.createElement("div");
        control.className = "control";
        const selectWrap = document.createElement("div");
        selectWrap.className = "select is-fullwidth";
        const select = document.createElement("select");
        select.id = `integration-${integration.name}-${field.key}`;
        select.required = field.required;

        (field.options ?? []).forEach((option) => {
          const optionEl = document.createElement("option");
          optionEl.value = option.value;
          optionEl.textContent = option.label;
          select.appendChild(optionEl);
        });

        if (initialValue) {
          select.value = initialValue;
        }

        selectWrap.appendChild(select);
        control.appendChild(selectWrap);
        wrapper.appendChild(label);
        wrapper.appendChild(control);
      } else {
        const input = document.createElement("input");
        input.className = "input";
        input.type = field.type === "password" ? "password" : "text";
        input.id = `integration-${integration.name}-${field.key}`;
        input.autocomplete = "off";
        input.required = field.required;

        if (initialValue && (field.type !== "password" || typeof existingValue === "string")) {
          input.value = initialValue;
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

      }

      if (field.required) {
        const help = document.createElement("p");
        help.className = "help app-muted";
        help.textContent = adminText("common.required", "Required");
        help.dataset.integrationRequired = field.key;
        wrapper.appendChild(help);
      }

      integrationFields.appendChild(wrapper);
    });

    if (integration.name === "codex-cli") {
      const authMode = document.getElementById("integration-codex-cli-authMode") as HTMLSelectElement | null;
      const apiKeyWrapper = integrationFields.querySelector<HTMLElement>("[data-integration-field-key='apiKey']");
      const apiKeyInput = document.getElementById("integration-codex-cli-apiKey") as HTMLInputElement | null;
      const apiKeyHelp = integrationFields.querySelector<HTMLElement>("[data-integration-required='apiKey']");

      const syncCodexAuthMode = () => {
        const usingApiKey = authMode?.value === "apiKey";
        if (apiKeyWrapper) {
          apiKeyWrapper.classList.toggle("is-hidden", !usingApiKey);
        }
        if (apiKeyInput) {
          apiKeyInput.required = usingApiKey;
        }
        if (apiKeyHelp) {
          apiKeyHelp.classList.toggle("is-hidden", !usingApiKey);
        }
      };

      authMode?.addEventListener("change", syncCodexAuthMode);
      syncCodexAuthMode();
    }
  };

  const openIntegrationModal = (integration: IntegrationSummary) => {
    currentIntegration = integration;
    clearIntegrationError();
    if (integrationTitle) {
      integrationTitle.textContent = integration.enabled
        ? adminText("integrations.editNamed", "Edit {name}", { name: integration.name })
        : adminText("integrations.enableNamed", "Enable {name}", { name: integration.name });
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
      ) as HTMLInputElement | HTMLSelectElement | null;
      const value = input?.value.trim() || "";
      if (!value) {
        const codexApiKeyRequired =
          currentIntegration.name === "codex-cli" &&
          field.key === "apiKey" &&
          (
            (document.getElementById("integration-codex-cli-authMode") as HTMLSelectElement | null)?.value ===
            "apiKey"
          );

        if (field.required || codexApiKeyRequired) {
          showIntegrationError(adminText("common.fieldRequired", "{field} is required.", { field: field.label }));
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
