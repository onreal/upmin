import type { NavigationPage } from "../api";
import { state } from "./state";

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

const renderNavList = (
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
      if (page.documentId && state.currentDocument?.id === page.documentId) {
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
          if (state.currentDocument?.id === section.id) {
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

export const renderNavigation = (pages: NavigationPage[], onSelectDocument: (id: string) => void) => {
  const navPublic = document.getElementById("nav-public");
  const navPrivate = document.getElementById("nav-private");
  const navSystem = document.getElementById("nav-system-pages");
  if (!navPublic || !navPrivate || !navSystem) {
    return;
  }

  state.authDocumentId = findAuthDocumentId(pages);
  renderNavList(navPublic, pages, "public", onSelectDocument);
  renderNavList(navPrivate, pages, "private", onSelectDocument);
  renderSystemPages(navSystem, pages, onSelectDocument);
};

const renderSystemPages = (
  container: HTMLElement,
  pages: NavigationPage[],
  onSelectDocument: (id: string) => void
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
    empty.className = "navbar-item is-size-7 app-muted";
    empty.textContent = "No system pages.";
    container.append(empty);
    return;
  }

  systemPages.forEach((page) => {
    if (!page.documentId) {
      return;
    }
    const link = document.createElement("a");
    link.className = "navbar-item";
    link.textContent = page.name;
    if (state.currentDocument?.id === page.documentId) {
      link.classList.add("is-active");
    }
    link.addEventListener("click", () => {
      onSelectDocument(page.documentId as string);
      document.getElementById("private-dropdown")?.classList.remove("is-active");
    });
    container.append(link);
  });
};
