import type { NavigationPage } from "../api";
import { state } from "./state";

const MOBILE_DRAWER_CLOSE_EVENT = "app:mobile-drawer-close";

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

const renderDesktopNavList = (
  container: HTMLElement,
  pages: NavigationPage[],
  mode: "public" | "private",
  onSelectDocument: (id: string) => void
) => {
  container.innerHTML = "";

  pages
    .filter((page) => page.store === mode && page.position !== "system")
    .forEach((page) => {
      const pageItem = document.createElement("li");
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

      const sections = page.sections.filter(
        (section) => section.store === mode && section.position !== "system"
      );
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
    .filter((page) => page.store === mode && page.position !== "system")
    .forEach((page, index) => {
      const pageItem = document.createElement("li");
      pageItem.className = "app-mobile-nav-item";

      const pageLink = document.createElement("a");
      pageLink.className = "app-mobile-nav-link";
      pageLink.href = "#";
      pageLink.textContent = page.name;
      if (isCurrentDocument(page.documentId, page.variants)) {
        pageLink.classList.add("is-active");
      }
      pageLink.addEventListener("click", (event) => {
        event.preventDefault();
        if (!page.documentId) {
          return;
        }
        onSelectDocument(page.documentId);
        closeMobileDrawer();
      });

      const sections = page.sections.filter(
        (section) => section.store === mode && section.position !== "system"
      );

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
      toggle.setAttribute("aria-label", `Toggle ${page.name} sections`);
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
  const navSystem = document.getElementById("nav-system-pages");
  const navSystemMobile = document.getElementById("nav-system-pages-mobile");

  if (!navPublic || !navPrivate || !navSystem) {
    return;
  }

  state.authDocumentId = findAuthDocumentId(pages);
  renderDesktopNavList(navPublic, pages, "public", onSelectDocument);
  renderDesktopNavList(navPrivate, pages, "private", onSelectDocument);
  if (navPublicMobile) {
    renderMobileNavList(navPublicMobile, pages, "public", onSelectDocument);
  }
  if (navPrivateMobile) {
    renderMobileNavList(navPrivateMobile, pages, "private", onSelectDocument);
  }
  renderSystemPages(navSystem, pages, onSelectDocument, "desktop");
  if (navSystemMobile) {
    renderSystemPages(navSystemMobile, pages, onSelectDocument, "mobile");
  }
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
    empty.textContent = "No system pages.";
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
