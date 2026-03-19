import { adminText } from "../../app/translations";

export type ConfirmModalOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClassName?: string;
};

export const initConfirmModal = () => {
  const confirmModal = document.getElementById("confirm-modal");
  const confirmTitle = document.getElementById("confirm-modal-title");
  const confirmMessage = document.getElementById("confirm-modal-message");
  const confirmButton = document.getElementById("confirm-submit") as HTMLButtonElement | null;
  const cancelButton = document.getElementById("confirm-cancel") as HTMLButtonElement | null;

  let resolver: ((confirmed: boolean) => void) | null = null;
  const defaultConfirmClassName = "button app-button app-primary";

  const close = (confirmed: boolean) => {
    resetConfirmButton();
    confirmModal?.classList.remove("is-active");
    if (resolver) {
      resolver(confirmed);
      resolver = null;
    }
  };

  const resetConfirmButton = () => {
    if (!confirmButton) {
      return;
    }
    confirmButton.className = defaultConfirmClassName;
    confirmButton.textContent = adminText("confirm.confirm", "Confirm");
  };

  const openConfirmModal = ({
    title,
    message,
    confirmLabel = adminText("confirm.confirm", "Confirm"),
    confirmClassName = defaultConfirmClassName,
  }: ConfirmModalOptions) => {
    if (!confirmModal || !confirmTitle || !confirmMessage || !confirmButton) {
      return Promise.resolve(false);
    }

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmButton.textContent = confirmLabel;
    confirmButton.className = confirmClassName;
    confirmModal.classList.add("is-active");

    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  };

  confirmButton?.addEventListener("click", () => close(true));
  cancelButton?.addEventListener("click", () => close(false));
  confirmModal?.querySelectorAll("[data-close='confirm']").forEach((el) => {
    el.addEventListener("click", () => close(false));
  });
  confirmModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close(false);
    }
  });

  return { openConfirmModal };
};
