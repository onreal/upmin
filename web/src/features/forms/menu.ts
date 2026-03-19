import type { FormSummary } from "../../api";
import { adminText } from "../../app/translations";

export const renderFormsMenu = (forms: FormSummary[]) => {
  const links = [
    document.getElementById("forms-link"),
    document.getElementById("forms-link-mobile"),
  ].filter((link): link is HTMLElement => !!link);

  if (!links.length) {
    return;
  }

  if (!forms.length) {
    links.forEach((link) => link.classList.add("is-hidden"));
    return;
  }

  links.forEach((link) => {
    link.classList.remove("is-hidden");
    link.textContent = adminText("forms.title", "Forms");
  });
};
