import type { ModuleRenderContext, ModuleRenderer } from "./types";
import { renderGalleryModule } from "./gallery";
import { renderUploaderModule } from "./uploader";

const registry: Record<string, ModuleRenderer> = {
  gallery: renderGalleryModule,
  uploader: renderUploaderModule,
};

export const renderModule = (
  name: string,
  panel: HTMLElement,
  context: ModuleRenderContext
): boolean => {
  const renderer = registry[name];
  if (!renderer) {
    return false;
  }
  renderer(panel, context);
  return true;
};
