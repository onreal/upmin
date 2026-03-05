export type NoticeType = "success" | "error";

export const pushNotice = (type: NoticeType, message: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("app:notice", { detail: { type, message } }));
};
