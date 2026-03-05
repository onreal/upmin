import { setTheme, getCurrentTheme } from "../ui/theme";

export type ShellEventHandlers = {
  onLogout: () => void;
  onShowProfile: () => void;
  onShowModules: () => void;
  onShowIntegrations: () => void;
  onShowLogs: () => void;
  onShowWebsiteBuild: () => void;
  onExportAll: () => void;
  onOpenCreate: () => void;
  onOpenAgentModal: () => void;
};

export const initShellEvents = ({
  onLogout,
  onShowProfile,
  onShowModules,
  onShowIntegrations,
  onShowLogs,
  onShowWebsiteBuild,
  onExportAll,
  onOpenCreate,
  onOpenAgentModal,
}: ShellEventHandlers) => {
  const burger = document.querySelector(".navbar-burger") as HTMLElement | null;
  const menu = document.getElementById("adminNavbar");
  burger?.addEventListener("click", () => {
    burger.classList.toggle("is-active");
    menu?.classList.toggle("is-active");
  });

  const dropdowns = [
    document.getElementById("private-dropdown"),
    document.getElementById("agents-dropdown"),
    document.getElementById("user-dropdown"),
  ];

  dropdowns.forEach((dropdown) => {
    const link = dropdown?.querySelector(".navbar-link");
    link?.addEventListener("click", (event) => {
      event.preventDefault();
      dropdown?.classList.toggle("is-active");
    });
  });

  document.addEventListener("click", (event) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown || dropdown.contains(event.target as Node)) {
        return;
      }
      dropdown.classList.remove("is-active");
    });
  });

  document.getElementById("logout")?.addEventListener("click", onLogout);
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const next = getCurrentTheme() === "light" ? "dark" : "light";
    setTheme(next);
  });

  document.getElementById("profile-link")?.addEventListener("click", () => {
    onShowProfile();
  });

  document.getElementById("modules-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    onShowModules();
    document.getElementById("private-dropdown")?.classList.remove("is-active");
  });

  document.getElementById("integrations-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    onShowIntegrations();
    document.getElementById("private-dropdown")?.classList.remove("is-active");
  });

  document.getElementById("logs-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    onShowLogs();
    document.getElementById("private-dropdown")?.classList.remove("is-active");
  });

  document.getElementById("website-build-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    onShowWebsiteBuild();
    document.getElementById("private-dropdown")?.classList.remove("is-active");
  });

  document.getElementById("export-zip-header")?.addEventListener("click", () => {
    onExportAll();
  });

  document.getElementById("create-action")?.addEventListener("click", onOpenCreate);

  document.getElementById("agents-create-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    onOpenAgentModal();
    document.getElementById("agents-dropdown")?.classList.remove("is-active");
  });
};
