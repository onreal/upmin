let noticeTimer: number | null = null;
let noticeListenerAttached = false;

const showNotice = (type: "success" | "error", message: string) => {
  const container = document.getElementById("app-notifications");
  if (!container) {
    return;
  }

  const toneClass = type === "error" ? "app-toast-error" : "app-toast-success";
  container.innerHTML = `
    <div class="notification app-toast ${toneClass}">
      <button class="delete" aria-label="close"></button>
      <span>${message}</span>
    </div>
  `;

  const closeButton = container.querySelector<HTMLButtonElement>(".delete");
  closeButton?.addEventListener("click", () => {
    container.innerHTML = "";
  });

  if (noticeTimer !== null) {
    window.clearTimeout(noticeTimer);
  }
  noticeTimer = window.setTimeout(() => {
    container.classList.add("app-toast-hide");
    window.setTimeout(() => {
      container.classList.remove("app-toast-hide");
      container.innerHTML = "";
      noticeTimer = null;
    }, 200);
  }, 300);
};

export const initNotifications = () => {
  if (noticeListenerAttached) {
    return;
  }
  noticeListenerAttached = true;
  window.addEventListener("app:notice", (event) => {
    const customEvent = event as CustomEvent<{ type: "success" | "error"; message: string }>;
    showNotice(customEvent.detail.type, customEvent.detail.message);
  });
};
