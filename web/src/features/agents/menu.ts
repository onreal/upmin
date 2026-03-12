import type { AgentSummary } from "../../api";

export const renderAgentsMenu = (agents: AgentSummary[], onSelectAgent: (id: string) => void) => {
  const containers = [
    document.getElementById("nav-agents"),
    document.getElementById("nav-agents-mobile"),
  ].filter((container): container is HTMLElement => !!container);

  if (!containers.length) {
    return;
  }

  containers.forEach((container) => {
    container.innerHTML = "";

    if (!agents.length) {
      container.innerHTML =
        container.id === "nav-agents"
          ? `<div class="navbar-item is-size-7 app-muted">No agents found.</div>`
          : `<div class="app-mobile-empty app-muted">No agents found.</div>`;
      return;
    }

    agents.forEach((agent) => {
      const link = document.createElement("a");
      link.className = container.id === "nav-agents" ? "navbar-item" : "app-mobile-action-link";
      link.href = "#";
      link.textContent = agent.name;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        onSelectAgent(agent.id);
        document.getElementById("agents-dropdown")?.classList.remove("is-active");
        document.dispatchEvent(new CustomEvent("app:mobile-drawer-close"));
      });
      container.append(link);
    });
  });
};
