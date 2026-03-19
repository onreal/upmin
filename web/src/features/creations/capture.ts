const CAPTURE_WIDTH = 1440;
const CAPTURE_HEIGHT = 900;
const CAPTURE_TIMEOUT_MS = 15000;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const loadIframe = (iframe: HTMLIFrameElement) =>
  new Promise<Document>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(adminText("creations.snapshotTimedOut", "Snapshot timed out while loading the website.")));
    }, CAPTURE_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timer);
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      cleanup();
      const doc = iframe.contentDocument;
      if (!doc) {
        reject(new Error(adminText("creations.snapshotUnavailable", "Snapshot failed because the website document is unavailable.")));
        return;
      }
      resolve(doc);
    };

    const handleError = () => {
      cleanup();
      reject(new Error(adminText("creations.snapshotLoadFailed", "Snapshot failed while loading the website.")));
    };

    iframe.addEventListener("load", handleLoad, { once: true });
    iframe.addEventListener("error", handleError, { once: true });
  });

const waitForImages = async (doc: Document) => {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.loading = "eager";
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
};

const rewriteCssUrls = (cssText: string, baseUrl: string) =>
  cssText.replace(/url\((["']?)(.*?)\1\)/gi, (_match, quote: string, rawUrl: string) => {
    const url = rawUrl.trim();
    if (
      !url ||
      url.startsWith("data:") ||
      url.startsWith("blob:") ||
      url.startsWith("#") ||
      /^[a-z]+:/i.test(url) ||
      url.startsWith("//")
    ) {
      return `url(${quote}${url}${quote})`;
    }

    try {
      return `url(${quote}${new URL(url, baseUrl).href}${quote})`;
    } catch {
      return `url(${quote}${url}${quote})`;
    }
  });

const collectStyles = (doc: Document) => {
  let css = "";
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules);
      const baseUrl = sheet.href ?? doc.baseURI;
      css += `${rules.map((rule) => rewriteCssUrls(rule.cssText, baseUrl)).join("\n")}\n`;
    } catch {
      // Ignore inaccessible stylesheets and keep the capture moving.
    }
  }
  return css;
};

const absolutizeAttribute = (value: string, baseUrl: string) => {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("#") ||
    /^[a-z]+:/i.test(trimmed) ||
    trimmed.startsWith("//")
  ) {
    return trimmed;
  }

  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
};

const inlineCanvasSnapshots = (sourceDoc: Document, clonedRoot: HTMLElement) => {
  const sourceCanvases = Array.from(sourceDoc.querySelectorAll("canvas"));
  const clonedCanvases = Array.from(clonedRoot.querySelectorAll("canvas"));

  sourceCanvases.forEach((canvas, index) => {
    const clone = clonedCanvases[index];
    if (!clone) {
      return;
    }
    try {
      const image = sourceDoc.createElement("img");
      image.setAttribute("src", canvas.toDataURL("image/png"));
      image.setAttribute("alt", "");
      clone.replaceWith(image);
    } catch {
      // Ignore tainted canvases.
    }
  });
};

const cloneWebsiteDocument = (doc: Document) => {
  const clonedRoot = doc.documentElement.cloneNode(true) as HTMLElement;
  clonedRoot.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  clonedRoot.querySelectorAll("script").forEach((script) => script.remove());

  const head = clonedRoot.querySelector("head");
  if (head) {
    const base = doc.createElement("base");
    base.setAttribute("href", doc.baseURI);
    head.prepend(base);

    const style = doc.createElement("style");
    style.textContent = collectStyles(doc);
    head.append(style);
  }

  inlineCanvasSnapshots(doc, clonedRoot);

  clonedRoot.querySelectorAll<HTMLElement>("*").forEach((element) => {
    ["src", "href", "poster"].forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current) {
        return;
      }
      element.setAttribute(attribute, absolutizeAttribute(current, doc.baseURI));
    });

    const inlineStyle = element.getAttribute("style");
    if (inlineStyle) {
      element.setAttribute("style", rewriteCssUrls(inlineStyle, doc.baseURI));
    }
  });

  return clonedRoot;
};

const svgMarkup = (root: HTMLElement) => {
  const serialized = new XMLSerializer().serializeToString(root);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CAPTURE_WIDTH}" height="${CAPTURE_HEIGHT}" viewBox="0 0 ${CAPTURE_WIDTH} ${CAPTURE_HEIGHT}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;
};

const drawSvgToCanvas = async (svg: string) => {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "sync";
      img.addEventListener("load", () => resolve(img), { once: true });
      img.addEventListener(
        "error",
        () => reject(new Error(adminText("creations.snapshotImageFailed", "Snapshot image could not be rendered."))),
        { once: true }
      );
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(adminText("creations.snapshotUnsupported", "Snapshot capture is not supported in this browser."));
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    context.drawImage(image, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);

    try {
      return canvas.toDataURL("image/png");
    } catch {
      throw new Error(
        adminText(
          "creations.snapshotBlockedAssets",
          "Snapshot capture failed because the website uses blocked external assets."
        )
      );
    }
  } finally {
    URL.revokeObjectURL(url);
  }
};

const svgToDataUrl = (svg: string) => {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
};

export const captureWebsiteSnapshot = async (path = "/") => {
  const iframe = document.createElement("iframe");
  iframe.src = path;
  iframe.width = String(CAPTURE_WIDTH);
  iframe.height = String(CAPTURE_HEIGHT);
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-200vw";
  iframe.style.top = "0";
  iframe.style.width = `${CAPTURE_WIDTH}px`;
  iframe.style.height = `${CAPTURE_HEIGHT}px`;
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";
  document.body.append(iframe);

  try {
    const doc = await loadIframe(iframe);
    iframe.contentWindow?.scrollTo(0, 0);
    await doc.fonts?.ready;
    await waitForImages(doc);
    await wait(450);

    const cloned = cloneWebsiteDocument(doc);
    const svg = svgMarkup(cloned);
    try {
      return await drawSvgToCanvas(svg);
    } catch {
      // External assets can taint canvas rendering. In that case we still keep a
      // portable visual snapshot by storing the SVG image directly.
      return svgToDataUrl(svg);
    }
  } finally {
    iframe.remove();
  }
};
import { adminText } from "../../app/translations";
