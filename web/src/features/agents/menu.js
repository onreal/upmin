export const renderAgentsMenu = (agents, onSelectAgent) => {
    const container = document.getElementById("nav-agents");
    if (!container) {
        return;
    }
    container.innerHTML = "";
    if (!agents.length) {
        container.innerHTML = `<div class="navbar-item is-size-7 app-muted">No agents found.</div>`;
        return;
    }
    agents.forEach((agent) => {
        const link = document.createElement("a");
        link.className = "navbar-item";
        link.textContent = agent.name;
        link.addEventListener("click", () => {
            onSelectAgent(agent.id);
            document.getElementById("agents-dropdown")?.classList.remove("is-active");
        });
        container.append(link);
    });
};
