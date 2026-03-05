import { createDocument } from "../../api";
import { readSelectedModules } from "../modules/helpers";
export const initCreateModal = ({ getAuth, onCreated, refreshNavigation }) => {
    const createModal = document.getElementById("create-modal");
    const createError = document.getElementById("create-error");
    const createForm = document.getElementById("create-form");
    const createStoreInput = document.getElementById("create-store");
    const createStoreTabs = Array.from(createModal?.querySelectorAll("[data-store]") ?? []);
    const showCreateError = (message) => {
        if (!createError) {
            alert(message);
            return;
        }
        createError.textContent = message;
        createError.classList.remove("is-hidden");
    };
    const clearCreateError = () => {
        if (!createError) {
            return;
        }
        createError.textContent = "";
        createError.classList.add("is-hidden");
    };
    const setCreateStore = (store) => {
        if (createStoreInput) {
            createStoreInput.value = store;
        }
        createStoreTabs.forEach((tab) => {
            const value = tab.getAttribute("data-store");
            tab.parentElement?.classList.toggle("is-active", value === store);
        });
    };
    const openCreateModal = () => {
        clearCreateError();
        createForm?.reset();
        const dataInput = document.getElementById("create-data");
        if (dataInput) {
            dataInput.value = "{}";
        }
        setCreateStore("public");
        createModal?.classList.add("is-active");
    };
    const closeCreateModal = () => {
        createModal?.classList.remove("is-active");
        clearCreateError();
    };
    document.getElementById("create-cancel")?.addEventListener("click", closeCreateModal);
    createModal?.querySelectorAll("[data-close='create']").forEach((el) => {
        el.addEventListener("click", closeCreateModal);
    });
    createStoreTabs.forEach((tab) => {
        tab.addEventListener("click", (event) => {
            event.preventDefault();
            const value = tab.getAttribute("data-store");
            if (value === "public" || value === "private") {
                setCreateStore(value);
            }
        });
    });
    createForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const auth = getAuth();
        if (!auth) {
            return;
        }
        clearCreateError();
        const path = document.getElementById("create-path")?.value.trim() || "";
        const orderRaw = document.getElementById("create-order")?.value.trim() || "";
        const page = document.getElementById("create-page")?.value.trim() || "";
        const name = document.getElementById("create-name")?.value.trim() || "";
        const language = document.getElementById("create-language")?.value.trim() || "";
        const modulesValue = readSelectedModules(document.getElementById("create-modules"));
        const section = document.getElementById("create-section")?.value === "true";
        const storeValue = document.getElementById("create-store")?.value === "private"
            ? "private"
            : "public";
        const dataRaw = document.getElementById("create-data")?.value.trim() || "";
        if (!path) {
            showCreateError("Filename is required.");
            return;
        }
        if (!path.endsWith(".json")) {
            showCreateError("Filename must end with .json.");
            return;
        }
        if (path.includes("/") || path.includes("\\") || path.includes("..")) {
            showCreateError("Filename must not include path separators.");
            return;
        }
        if (!page) {
            showCreateError("Page is required.");
            return;
        }
        if (!name) {
            showCreateError("Name is required.");
            return;
        }
        if (!orderRaw) {
            showCreateError("Order is required.");
            return;
        }
        const orderValue = Number(orderRaw);
        if (!Number.isInteger(orderValue)) {
            showCreateError("Order must be an integer.");
            return;
        }
        if (!dataRaw) {
            showCreateError("Data is required.");
            return;
        }
        let data;
        try {
            data = JSON.parse(dataRaw);
        }
        catch {
            showCreateError("Data must be valid JSON.");
            return;
        }
        const payloadToCreate = {
            type: "page",
            page,
            name,
            language: language || undefined,
            order: orderValue,
            section,
            modules: modulesValue.length ? modulesValue : undefined,
            data,
        };
        try {
            const created = await createDocument(auth, {
                store: storeValue,
                path,
                payload: payloadToCreate,
            });
            closeCreateModal();
            await refreshNavigation();
            await onCreated(created.id);
        }
        catch (err) {
            showCreateError(err.message);
        }
    });
    return { openCreateModal };
};
