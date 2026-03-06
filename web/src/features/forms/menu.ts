import type { FormSummary } from "../../api";

export const renderFormsMenu = (forms: FormSummary[]) => {
  const link = document.getElementById("forms-link");
  if (!link) {
    return;
  }

  if (!forms.length) {
    link.classList.add("is-hidden");
    return;
  }

  link.classList.remove("is-hidden");
  link.textContent = "Forms";
};
