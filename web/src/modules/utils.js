const slug = (value) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
export const moduleSettingsKey = (payload, moduleName) => {
    const moduleSlug = slug(moduleName) || "module";
    if (!payload.section) {
        const pageSlug = slug(payload.page) || "page";
        return `${pageSlug}-${moduleSlug}`;
    }
    const sectionSlug = slug(payload.name) || "section";
    return `${sectionSlug}-${moduleSlug}`;
};
export const legacyModuleSettingsKey = (moduleName) => slug(moduleName) || "module";
