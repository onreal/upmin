import { isRecord, triggerDownload } from "../utils";
const buildLogSelector = (logs, currentId) => {
    if (!logs.length) {
        return `
      <div class="field">
        <label class="label">Log file</label>
        <div class="control">
          <div class="select is-fullwidth">
            <select disabled>
              <option>No logs available</option>
            </select>
          </div>
        </div>
      </div>
    `;
    }
    const options = logs
        .map((log) => {
        const selected = log.id === currentId ? "selected" : "";
        return `<option value="${log.id}" ${selected}>${log.name}</option>`;
    })
        .join("");
    return `
    <div class="field">
      <label class="label">Log file</label>
      <div class="control">
        <div class="select is-fullwidth">
          <select id="log-file-select">${options}</select>
        </div>
      </div>
    </div>
  `;
};
export const renderLogsView = async ({ content, auth, logs, setLogs, fetchLogs, loadDocument, clearAgentState, openLoggerSettings, }) => {
    if (!content) {
        return;
    }
    clearAgentState();
    if (!auth) {
        content.innerHTML = `<p class="app-muted">Authentication required.</p>`;
        return;
    }
    content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">Logs</h1>
        <p class="app-muted">Recent backend errors stored in manage/store/logs.</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="Logger settings"
          title="Logger settings"
        >
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              ></path>
              <path
                d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              ></path>
            </svg>
          </span>
        </button>
      </div>
    </div>
    <div class="notification is-light">Loading logs...</div>
  `;
    try {
        const response = await fetchLogs(auth);
        logs = Array.isArray(response.logs) ? response.logs : [];
        setLogs(logs);
    }
    catch (err) {
        content.innerHTML = `<p class="app-muted">${err.message}</p>`;
        return;
    }
    if (!logs.length) {
        content.innerHTML = `
      <div class="app-view-header mb-4">
        <div>
          <h1 class="title is-4">Logs</h1>
          <p class="app-muted">Recent backend errors stored in manage/store/logs.</p>
        </div>
        <div class="app-view-actions">
          <button
            id="logger-settings-open"
            class="button app-button app-ghost app-icon-button"
            aria-label="Logger settings"
            title="Logger settings"
          >
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                ></path>
                <path
                  d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                ></path>
              </svg>
            </span>
          </button>
        </div>
      </div>
      <div class="notification is-light">No logs found.</div>
    `;
        document.getElementById("logger-settings-open")?.addEventListener("click", () => {
            openLoggerSettings();
        });
        return;
    }
    const list = logs
        .map((log) => {
        const metaParts = [];
        if (log.count !== undefined) {
            metaParts.push(`${log.count} items`);
        }
        if (log.updatedAt) {
            metaParts.push(`updated ${log.updatedAt}`);
        }
        const meta = metaParts.length ? metaParts.join(" · ") : "";
        return `
        <div class="app-module-row">
          <div class="app-module-row-title">${log.name}</div>
          <div class="app-module-row-meta">${log.path}</div>
          ${meta ? `<div class="app-module-row-meta">${meta}</div>` : ""}
          <div class="buttons">
            <button class="button app-button app-ghost" data-log-id="${encodeURIComponent(log.id)}">Open</button>
          </div>
        </div>
      `;
    })
        .join("");
    content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">Logs</h1>
        <p class="app-muted">Recent backend errors stored in manage/store/logs.</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="Logger settings"
          title="Logger settings"
        >
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              ></path>
              <path
                d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              ></path>
            </svg>
          </span>
        </button>
      </div>
    </div>
    <div class="app-log-toolbar mb-4">
      ${buildLogSelector(logs)}
    </div>
    <div class="app-module-list">${list}</div>
  `;
    document.getElementById("logger-settings-open")?.addEventListener("click", () => {
        openLoggerSettings();
    });
    const select = document.getElementById("log-file-select");
    select?.addEventListener("change", () => {
        const id = select.value.trim();
        if (id) {
            loadDocument(id);
        }
    });
    document.querySelectorAll("[data-log-id]").forEach((button) => {
        button.addEventListener("click", () => {
            const encoded = button.getAttribute("data-log-id") || "";
            const id = decodeURIComponent(encoded);
            if (id) {
                loadDocument(id);
            }
        });
    });
};
export const renderLogDocument = ({ content, auth, doc, logs, loadDocument, openLoggerSettings, downloadDocument, }) => {
    if (!content) {
        return;
    }
    const payload = doc.payload;
    const data = isRecord(payload.data) ? payload.data : {};
    const items = Array.isArray(data.items) ? data.items : [];
    const createdAt = typeof data.createdAt === "string" ? data.createdAt : "";
    const updatedAt = typeof data.updatedAt === "string" ? data.updatedAt : "";
    const count = items.length;
    const listHtml = items.length
        ? items
            .map((item) => {
            const record = isRecord(item) ? item : {};
            const timestamp = typeof record.timestamp === "string" ? record.timestamp : "";
            const endpoint = typeof record.endpoint === "string" ? record.endpoint : "";
            const message = typeof record.message === "string" ? record.message : "";
            const type = typeof record.type === "string" ? record.type : "";
            const status = typeof record.status === "number" ? record.status : null;
            const statusLabel = status !== null ? `${status}` : "";
            return `
            <div class="app-log-item">
              <div class="app-log-header">
                <div class="app-log-title">${endpoint || "Request"}</div>
                <div class="app-log-meta">${statusLabel}</div>
              </div>
              <div class="app-log-message">${message}</div>
              <div class="app-log-meta">
                ${timestamp ? `${timestamp} · ` : ""}${type}
              </div>
            </div>
          `;
        })
            .join("")
        : `<div class="notification is-light">No log entries yet.</div>`;
    content.innerHTML = `
    <div class="app-view-header mb-4">
      <div>
        <h1 class="title is-4">${payload.name}</h1>
        <p class="app-muted">Logs · ${doc.store}/${doc.path}</p>
      </div>
      <div class="app-view-actions">
        <button
          id="logger-settings-open"
          class="button app-button app-ghost app-icon-button"
          aria-label="Logger settings"
          title="Logger settings"
        >
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              ></path>
              <path
                d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              ></path>
            </svg>
          </span>
        </button>
      </div>
    </div>
    <div class="app-log-toolbar mb-4">
      ${buildLogSelector(logs, doc.id)}
    </div>
    <div class="app-log-summary">
      <div class="app-log-summary-item"><span class="app-muted">Items</span> ${count}</div>
      ${createdAt ? `<div class="app-log-summary-item"><span class="app-muted">Created</span> ${createdAt}</div>` : ""}
      ${updatedAt ? `<div class="app-log-summary-item"><span class="app-muted">Updated</span> ${updatedAt}</div>` : ""}
    </div>
    <div class="mb-4 buttons">
      <button id="export-json" class="button app-button app-ghost">Export JSON</button>
    </div>
    <div class="app-log-list">
      ${listHtml}
    </div>
  `;
    document.getElementById("logger-settings-open")?.addEventListener("click", () => {
        openLoggerSettings();
    });
    const select = document.getElementById("log-file-select");
    select?.addEventListener("change", () => {
        const id = select.value.trim();
        if (id) {
            loadDocument(id);
        }
    });
    document.getElementById("export-json")?.addEventListener("click", async () => {
        if (!auth) {
            return;
        }
        try {
            const result = await downloadDocument(auth, doc.id);
            const filename = result.filename ?? `${doc.path.split("/").pop() || "log"}.json`;
            triggerDownload(result.blob, filename);
        }
        catch (err) {
            alert(err.message);
        }
    });
};
