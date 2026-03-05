import { request, requestForm } from "./client";
export const fetchModules = (auth) => request("/api/modules", { method: "GET" }, auth);
export const uploadModuleFile = (auth, moduleName, file, settingsKey) => {
    const body = new FormData();
    body.append("file", file);
    if (settingsKey) {
        body.append("settings", settingsKey);
    }
    return requestForm(`/api/modules/${moduleName}`, body, auth);
};
export const fetchModuleList = (auth, moduleName, params) => {
    const search = new URLSearchParams();
    if (params.visibility) {
        search.set("visibility", params.visibility);
    }
    if (params.settings) {
        search.set("settings", params.settings);
    }
    const query = search.toString();
    const url = query ? `/api/modules/${moduleName}/list?${query}` : `/api/modules/${moduleName}/list`;
    return request(url, { method: "GET" }, auth);
};
export const deleteModuleFile = (auth, moduleName, payload) => request(`/api/modules/${moduleName}/delete`, { method: "POST", body: JSON.stringify(payload) }, auth);
export const fetchChatConversations = (auth, moduleName, params) => {
    const search = new URLSearchParams();
    search.set("settings", params.settings);
    return request(`/api/modules/${moduleName}/list?${search.toString()}`, { method: "GET" }, auth);
};
export const startChatConversation = (auth, moduleName, payload) => request(`/api/modules/${moduleName}`, { method: "POST", body: JSON.stringify(payload) }, auth);
export const appendChatMessage = (auth, moduleName, payload) => request(`/api/modules/${moduleName}/message`, { method: "POST", body: JSON.stringify(payload) }, auth, { notify: false });
export const pullChatConversation = (auth, moduleName, params) => {
    const search = new URLSearchParams();
    search.set("settings", params.settings);
    search.set("id", params.id);
    return request(`/api/modules/${moduleName}/pull?${search.toString()}`, { method: "GET" }, auth, { notify: false });
};
export const deleteChatConversation = (auth, moduleName, payload) => request(`/api/modules/${moduleName}/delete`, { method: "POST", body: JSON.stringify(payload) }, auth);
