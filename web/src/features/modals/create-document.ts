import { createDocument, type AuthState, type DocumentPayload } from "../../api";
import { readSelectedModules } from "../modules/helpers";

export type CreateModalContext = {
  getAuth: () => AuthState | null;
  onCreated: (id: string) => Promise<void>;
  refreshNavigation: () => Promise<void>;
};

export const initCreateModal = ({ getAuth, onCreated, refreshNavigation }: CreateModalContext) => {
  const createModal = document.getElementById("create-modal");
  const createError = document.getElementById("create-error");
  const createForm = document.getElementById("create-form") as HTMLFormElement | null;
  const createStoreInput = document.getElementById("create-store") as HTMLInputElement | null;
  const createStoreTabs = Array.from(
    createModal?.querySelectorAll<HTMLElement>("[data-store]") ?? []
  );

  const showCreateError = (message: string) => {
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

  const setCreateStore = (store: "public" | "private") => {
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
    const dataInput = document.getElementById("create-data") as HTMLTextAreaElement | null;
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

    const path =
      (document.getElementById("create-path") as HTMLInputElement | null)?.value.trim() || "";
    const orderRaw =
      (document.getElementById("create-order") as HTMLInputElement | null)?.value.trim() || "";
    const page =
      (document.getElementById("create-page") as HTMLInputElement | null)?.value.trim() || "";
    const name =
      (document.getElementById("create-name") as HTMLInputElement | null)?.value.trim() || "";
    const language =
      (document.getElementById("create-language") as HTMLInputElement | null)?.value.trim() || "";
    const modulesValue = readSelectedModules(document.getElementById("create-modules"));
    const section =
      (document.getElementById("create-section") as HTMLSelectElement | null)?.value === "true";
    const storeValue =
      (document.getElementById("create-store") as HTMLInputElement | null)?.value === "private"
        ? "private"
        : "public";
    const dataRaw =
      (document.getElementById("create-data") as HTMLTextAreaElement | null)?.value.trim() || "";

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

    let data: unknown;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      showCreateError("Data must be valid JSON.");
      return;
    }

    const payloadToCreate: DocumentPayload = {
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
    } catch (err) {
      showCreateError((err as Error).message);
    }
  });

  return { openCreateModal };
};
