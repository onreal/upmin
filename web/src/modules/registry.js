import { renderChatModule } from "./chat";
import { renderGalleryModule } from "./gallery";
import { renderUploaderModule } from "./uploader";
const registry = {
    chat: renderChatModule,
    gallery: renderGalleryModule,
    uploader: renderUploaderModule,
};
export const renderModule = (name, panel, context) => {
    const renderer = registry[name];
    if (!renderer) {
        return false;
    }
    renderer(panel, context);
    return true;
};
