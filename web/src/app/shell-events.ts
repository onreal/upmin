import { setTheme, getCurrentTheme } from "../ui/theme";

const MOBILE_DRAWER_CLOSE_EVENT = "app:mobile-drawer-close";

export type ShellEventHandlers = {
  onLogout: () => void;
  onShowProfile: () => void;
  onShowModules: () => void;
  onShowIntegrations: () => void;
  onShowLogs: () => void;
  onShowForms: () => void;
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
  onShowForms,
  onExportAll,
  onOpenCreate,
  onOpenAgentModal,
}: ShellEventHandlers) => {
  const burger = document.querySelector(".navbar-burger") as HTMLElement | null;
  const drawer = document.getElementById("mobileNavDrawer");
  const dropdowns = [
    document.getElementById("private-dropdown"),
    document.getElementById("agents-dropdown"),
    document.getElementById("user-dropdown"),
  ];

  const closeDropdowns = () => {
    dropdowns.forEach((dropdown) => dropdown?.classList.remove("is-active"));
  };

  const setMobileDrawerOpen = (isOpen: boolean) => {
    burger?.classList.toggle("is-active", isOpen);
    burger?.setAttribute("aria-expanded", String(isOpen));
    drawer?.classList.toggle("is-open", isOpen);
    drawer?.setAttribute("aria-hidden", String(!isOpen));
    document.body.classList.toggle("app-mobile-drawer-open", isOpen);
  };

  const closeAllNavigation = () => {
    closeDropdowns();
    setMobileDrawerOpen(false);
  };

  burger?.addEventListener("click", () => {
    const isOpen = !(drawer?.classList.contains("is-open") ?? false);
    closeDropdowns();
    setMobileDrawerOpen(isOpen);
  });

  drawer?.querySelectorAll<HTMLElement>("[data-mobile-drawer-close]").forEach((element) => {
    element.addEventListener("click", () => {
      setMobileDrawerOpen(false);
    });
  });

  document.addEventListener(MOBILE_DRAWER_CLOSE_EVENT, () => {
    setMobileDrawerOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllNavigation();
    }
  });

  window.matchMedia("(min-width: 1024px)").addEventListener("change", (event) => {
    if (event.matches) {
      setMobileDrawerOpen(false);
    }
  });

  drawer?.querySelectorAll<HTMLElement>("[data-mobile-accordion]").forEach((button) => {
    const section = button.closest(".app-mobile-accordion-section");
    button.addEventListener("click", () => {
      if (!section) {
        return;
      }
      const isOpen = section.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });

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

  const bindAction = (action: string, handler: () => void) => {
    document.querySelectorAll<HTMLElement>(`[data-shell-action="${action}"]`).forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        closeAllNavigation();
        handler();
      });
    });
  };

  bindAction("logout", onLogout);
  bindAction("profile", onShowProfile);
  bindAction("modules", onShowModules);
  bindAction("integrations", onShowIntegrations);
  bindAction("logs", onShowLogs);
  bindAction("forms", onShowForms);
  bindAction("export", onExportAll);
  bindAction("create", onOpenCreate);
  bindAction("agents-create", onOpenAgentModal);
  bindAction("theme", () => {
    const next = getCurrentTheme() === "light" ? "dark" : "light";
    setTheme(next);
  });
};
