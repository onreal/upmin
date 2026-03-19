import type { NavigationPage } from "../api";
import { state } from "./state";
import { adminText } from "./translations";

const MOBILE_DRAWER_CLOSE_EVENT = "app:mobile-drawer-close";
type NavigationPlacement = "settings" | "sidebar" | "header" | "footer";
type NavigationLinkEntry = {
  id: string;
  name: string;
  variants?: { id: string }[];
};

export const findAuthDocumentId = (pages: NavigationPage[]) => {
  for (const page of pages) {
    if (page.store === "private" && page.path?.endsWith("auth.json") && page.documentId) {
      return page.documentId;
    }
    for (const section of page.sections) {
      if (section.store === "private" && section.path.endsWith("auth.json")) {
        return section.id;
      }
    }
  }
  return null;
};

const closeMobileDrawer = () => {
  document.dispatchEvent(new CustomEvent(MOBILE_DRAWER_CLOSE_EVENT));
};

const isCurrentDocument = (documentId: string | null | undefined, variants?: { id: string }[]) => {
  const currentId = state.currentDocument?.id;
  return !!currentId && (documentId === currentId || (variants ?? []).some((variant) => variant.id === currentId));
};

const matchesPlacement = (
  item: { store?: string | null; position?: string | null; position_view?: string | null },
  placement: NavigationPlacement,
  mode?: "public" | "private"
) =>
  item.store === "private" &&
  item.position_view === placement &&
  (!mode || item.store === mode);

const collectPlacementLinks = (
  pages: NavigationPage[],
  placement: NavigationPlacement,
  mode?: "public" | "private"
): NavigationLinkEntry[] => {
  const seen = new Set<string>();
  const items: NavigationLinkEntry[] = [];

  const pushItem = (item: NavigationLinkEntry) => {
    if (seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    items.push(item);
  };

  pages.forEach((page) => {
    if (page.documentId && matchesPlacement(page, placement, mode)) {
      pushItem({ id: page.documentId, name: page.name, variants: page.variants });
    }
    page.sections.forEach((section) => {
      if (matchesPlacement(section, placement, mode)) {
        pushItem({ id: section.id, name: section.name, variants: section.variants });
      }
    });
  });

  return items;
};

const renderDesktopNavList = (
  container: HTMLElement,
  pages: NavigationPage[],
  mode: "public" | "private",
  onSelectDocument: (id: string) => void
) => {
  container.innerHTML = "";

  pages
    .forEach((page) => {
      const pageVisible =
        mode === "public"
          ? page.store === "public" && page.position !== "system" && !!page.documentId
          : !!page.documentId && matchesPlacement(page, "sidebar", mode);
      const sections =
        mode === "public"
          ? page.sections.filter((section) => section.store === "public" && section.position !== "system")
          : page.sections.filter((section) => matchesPlacement(section, "sidebar", mode));
      if (!pageVisible && sections.length === 0) {
        return;
      }

      const pageItem = document.createElement("li");
      if (pageVisible) {
        const pageLink = document.createElement("a");
        pageLink.textContent = page.name;
        if (isCurrentDocument(page.documentId, page.variants)) {
          pageLink.classList.add("is-active");
        }
        pageLink.addEventListener("click", () => {
          if (page.documentId) {
            onSelectDocument(page.documentId);
          }
        });
        pageItem.append(pageLink);
      } else {
        const pageLabel = document.createElement("div");
        pageLabel.className = "menu-label";
        pageLabel.textContent = page.name;
        pageItem.append(pageLabel);
      }

      if (sections.length > 0) {
        const sectionList = document.createElement("ul");
        sections.forEach((section) => {
          const sectionItem = document.createElement("li");
          const sectionLink = document.createElement("a");
          sectionLink.textContent = section.name;
          if (isCurrentDocument(section.id, section.variants)) {
            sectionLink.classList.add("is-active");
          }
          sectionLink.addEventListener("click", () => {
            onSelectDocument(section.id);
          });
          sectionItem.append(sectionLink);
          sectionList.append(sectionItem);
        });
        pageItem.append(sectionList);
      }

      container.append(pageItem);
    });
};

const renderMobileNavList = (
  container: HTMLElement,
  pages: NavigationPage[],
  mode: "public" | "private",
  onSelectDocument: (id: string) => void
) => {
  container.innerHTML = "";

  pages
    .forEach((page, index) => {
      const pageVisible =
        mode === "public"
          ? page.store === "public" && page.position !== "system" && !!page.documentId
          : !!page.documentId && matchesPlacement(page, "sidebar", mode);
      const sections =
        mode === "public"
          ? page.sections.filter((section) => section.store === "public" && section.position !== "system")
          : page.sections.filter((section) => matchesPlacement(section, "sidebar", mode));
      if (!pageVisible && sections.length === 0) {
        return;
      }

      const pageItem = document.createElement("li");
      pageItem.className = "app-mobile-nav-item";

      const pageLink = pageVisible ? document.createElement("a") : document.createElement("div");
      pageLink.className = "app-mobile-nav-link";
      if (pageVisible) {
        (pageLink as HTMLAnchorElement).href = "#";
      }
      pageLink.textContent = page.name;
      if (pageVisible && isCurrentDocument(page.documentId, page.variants)) {
        pageLink.classList.add("is-active");
      }
      if (pageVisible) {
        pageLink.addEventListener("click", (event) => {
          event.preventDefault();
          if (!page.documentId) {
            return;
          }
          onSelectDocument(page.documentId);
          closeMobileDrawer();
        });
      }

      if (sections.length === 0) {
        pageItem.append(pageLink);
        container.append(pageItem);
        return;
      }

      const row = document.createElement("div");
      row.className = "app-mobile-nav-row";
      row.append(pageLink);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "app-mobile-nav-disclosure";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", `mobile-nav-submenu-${mode}-${index}`);
      toggle.setAttribute(
        "aria-label",
        adminText("navigation.toggleSections", "Toggle {name} sections", { name: page.name })
      );
      toggle.innerHTML = `<span aria-hidden="true">+</span>`;
      toggle.addEventListener("click", () => {
        const isOpen = pageItem.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.innerHTML = `<span aria-hidden="true">${isOpen ? "-" : "+"}</span>`;
      });
      row.append(toggle);
      pageItem.append(row);

      const sectionList = document.createElement("ul");
      sectionList.id = `mobile-nav-submenu-${mode}-${index}`;
      sectionList.className = "app-mobile-nav-submenu";
      sections.forEach((section) => {
        const sectionItem = document.createElement("li");
        const sectionLink = document.createElement("a");
        sectionLink.className = "app-mobile-nav-sublink";
        sectionLink.href = "#";
        sectionLink.textContent = section.name;
        if (isCurrentDocument(section.id, section.variants)) {
          sectionLink.classList.add("is-active");
        }
        sectionLink.addEventListener("click", (event) => {
          event.preventDefault();
          onSelectDocument(section.id);
          closeMobileDrawer();
        });
        sectionItem.append(sectionLink);
        sectionList.append(sectionItem);
      });
      pageItem.append(sectionList);

      container.append(pageItem);
    });
};

export const renderNavigation = (pages: NavigationPage[], onSelectDocument: (id: string) => void) => {
  const navPublic = document.getElementById("nav-public");
  const navPrivate = document.getElementById("nav-private");
  const navPublicMobile = document.getElementById("nav-mobile-public");
  const navPrivateMobile = document.getElementById("nav-mobile-private");
  const navPrivateLabel = document.getElementById("nav-private-label");
  const mobilePrivateToggle = document.getElementById("mobile-private-toggle");
  const navSystem = document.getElementById("nav-system-pages");
  const navSystemMobile = document.getElementById("nav-system-pages-mobile");
  const navSettings = document.getElementById("nav-settings-pages");
  const navSettingsMobile = document.getElementById("nav-settings-pages-mobile");
  const navHeader = document.getElementById("nav-header-links");
  const navHeaderMobile = document.getElementById("nav-header-links-mobile");
  const navFooter = document.getElementById("nav-footer-links");

  if (!navPublic || !navPrivate || !navSystem) {
    return;
  }

  state.authDocumentId = findAuthDocumentId(pages);
  renderDesktopNavList(navPublic, pages, "public", onSelectDocument);
  renderDesktopNavList(navPrivate, pages, "private", onSelectDocument);
  const hasPrivateSidebarItems = navPrivate.children.length > 0;
  navPrivate.classList.toggle("is-hidden", !hasPrivateSidebarItems);
  navPrivateLabel?.classList.toggle("is-hidden", !hasPrivateSidebarItems);
  if (navPublicMobile) {
    renderMobileNavList(navPublicMobile, pages, "public", onSelectDocument);
  }
  if (navPrivateMobile) {
    renderMobileNavList(navPrivateMobile, pages, "private", onSelectDocument);
    const hasMobilePrivateItems = navPrivateMobile.children.length > 0;
    navPrivateMobile.classList.toggle("is-hidden", !hasMobilePrivateItems);
    mobilePrivateToggle?.closest(".app-mobile-accordion-section")?.classList.toggle("is-hidden", !hasMobilePrivateItems);
  }
  if (navSettings) {
    renderPlacementLinks(navSettings, pages, "settings", onSelectDocument, "desktop");
  }
  if (navSettingsMobile) {
    renderPlacementLinks(navSettingsMobile, pages, "settings", onSelectDocument, "mobile");
  }
  if (navHeader) {
    renderPlacementLinks(navHeader, pages, "header", onSelectDocument, "header");
  }
  if (navHeaderMobile) {
    renderPlacementLinks(navHeaderMobile, pages, "header", onSelectDocument, "mobile");
  }
  if (navFooter) {
    renderPlacementLinks(navFooter, pages, "footer", onSelectDocument, "footer");
  }
  renderSystemPages(navSystem, pages, onSelectDocument, "desktop");
  if (navSystemMobile) {
    renderSystemPages(navSystemMobile, pages, onSelectDocument, "mobile");
  }
};

const renderPlacementLinks = (
  container: HTMLElement,
  pages: NavigationPage[],
  placement: NavigationPlacement,
  onSelectDocument: (id: string) => void,
  variant: "desktop" | "mobile" | "header" | "footer"
) => {
  container.innerHTML = "";
  const mode: "private" = "private";
  const items = collectPlacementLinks(pages, placement, mode);
  container.classList.toggle("is-hidden", items.length === 0);

  items.forEach((item) => {
    const link =
      variant === "header"
        ? document.createElement("button")
        : document.createElement("a");

    if (variant === "header") {
      link.className = "button app-button app-ghost";
      link.setAttribute("type", "button");
    } else if (variant === "mobile") {
      link.className = "app-mobile-action-link";
      (link as HTMLAnchorElement).href = "#";
    } else if (variant === "footer") {
      link.className = "app-footer-nav-link";
      (link as HTMLAnchorElement).href = "#";
    } else {
      link.className = "navbar-item";
      (link as HTMLAnchorElement).href = "#";
    }

    link.textContent = item.name;
    if (isCurrentDocument(item.id, item.variants)) {
      link.classList.add("is-active");
    }
    link.addEventListener("click", (event) => {
      event.preventDefault();
      onSelectDocument(item.id);
      if (variant !== "footer") {
        document.getElementById("private-dropdown")?.classList.remove("is-active");
      }
      closeMobileDrawer();
    });
    container.append(link);
  });
};

const renderSystemPages = (
  container: HTMLElement,
  pages: NavigationPage[],
  onSelectDocument: (id: string) => void,
  variant: "desktop" | "mobile"
) => {
  container.innerHTML = "";
  const systemPages = pages
    .filter((page) => page.store === "private" && page.position === "system")
    .sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.name || "").localeCompare(b.name || "");
    });

  if (systemPages.length === 0) {
    const empty = document.createElement("div");
    empty.className =
      variant === "desktop" ? "navbar-item is-size-7 app-muted" : "app-mobile-empty app-muted";
    empty.textContent = adminText("navigation.noSystemPages", "No system pages.");
    container.append(empty);
    return;
  }

  systemPages.forEach((page) => {
    if (!page.documentId) {
      return;
    }
    const link = document.createElement("a");
    link.className = variant === "desktop" ? "navbar-item" : "app-mobile-action-link";
    link.href = "#";
    link.textContent = page.name;
    if (state.currentDocument?.id === page.documentId) {
      link.classList.add("is-active");
    }
    link.addEventListener("click", (event) => {
      event.preventDefault();
      onSelectDocument(page.documentId as string);
      document.getElementById("private-dropdown")?.classList.remove("is-active");
      closeMobileDrawer();
    });
    container.append(link);
  });
};
