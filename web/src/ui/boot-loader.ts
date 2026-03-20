import { adminText } from "../app/translations";

const LOADER_ID = "app-boot-loader";
const VISIBLE_CLASS = "is-visible";
const HIDING_CLASS = "is-hiding";

const loaderMarkup = () => `
  <div class="app-boot-loader__panel" aria-live="polite" aria-busy="true">
    <svg class="app-boot-loader__svg" viewBox="0 0 120 120" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="appBootLoaderGradient" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="var(--app-accent)"></stop>
          <stop offset="100%" stop-color="color-mix(in srgb, var(--app-accent) 35%, var(--app-text))"></stop>
        </linearGradient>
      </defs>
      <circle class="app-boot-loader__halo" cx="60" cy="60" r="34"></circle>
      <path class="app-boot-loader__arc app-boot-loader__arc--outer" d="M60 20 A40 40 0 0 1 100 60"></path>
      <path class="app-boot-loader__arc app-boot-loader__arc--inner" d="M26 60 A34 34 0 0 1 60 26"></path>
      <g class="app-boot-loader__orbit">
        <circle cx="60" cy="18" r="4.5" fill="url(#appBootLoaderGradient)"></circle>
      </g>
      <g class="app-boot-loader__orbit app-boot-loader__orbit--reverse">
        <circle cx="60" cy="92" r="3.5" fill="color-mix(in srgb, var(--app-text) 24%, var(--app-accent))"></circle>
      </g>
      <circle class="app-boot-loader__core" cx="60" cy="60" r="10"></circle>
    </svg>
    <div class="app-boot-loader__label">${adminText("boot.loading", "Loading admin")}</div>
  </div>
`;

const getLoader = () => document.getElementById(LOADER_ID);

export const showBootLoader = () => {
  let loader = getLoader();
  if (!loader) {
    loader = document.createElement("div");
    loader.id = LOADER_ID;
    loader.className = "app-boot-loader";
    loader.innerHTML = loaderMarkup();
    document.body.appendChild(loader);
  }

  loader.classList.remove(HIDING_CLASS);
  window.requestAnimationFrame(() => {
    loader?.classList.add(VISIBLE_CLASS);
  });
};

export const hideBootLoader = () => {
  const loader = getLoader();
  if (!loader) {
    return;
  }

  loader.classList.remove(VISIBLE_CLASS);
  loader.classList.add(HIDING_CLASS);
  window.setTimeout(() => {
    if (loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
  }, 220);
};
