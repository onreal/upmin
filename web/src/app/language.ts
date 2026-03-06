import type { NavigationPage, NavigationPageGroup, NavigationSectionGroup, NavigationVariant } from "../api";

const normalizeLanguage = (value?: string | null) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const collectLanguages = (variants: NavigationVariant[]) => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  variants.forEach((variant) => {
    const lang = normalizeLanguage(variant.language);
    if (!lang || seen.has(lang)) {
      return;
    }
    seen.add(lang);
    ordered.push(lang);
  });
  return ordered;
};

const pickVariant = (variants: NavigationVariant[], language: string | null) => {
  if (!variants.length) {
    return null;
  }
  if (language) {
    const match = variants.find((variant) => normalizeLanguage(variant.language) === language);
    if (match) {
      return match;
    }
  }
  return variants[variants.length - 1];
};

const pickFirstLanguage = (groups: NavigationPageGroup[]) => {
  for (const page of groups) {
    for (const variant of page.variants) {
      const lang = normalizeLanguage(variant.language);
      if (lang) {
        return lang;
      }
    }
    for (const section of page.sections) {
      for (const variant of section.variants) {
        const lang = normalizeLanguage(variant.language);
        if (lang) {
          return lang;
        }
      }
    }
  }
  return null;
};

export const resolveNavigationPages = (
  groups: NavigationPageGroup[],
  defaultLanguage: string | null,
  activeLanguage: string | null
) => {
  const normalizedDefault = normalizeLanguage(defaultLanguage);
  const seedLanguage = normalizedDefault ?? activeLanguage ?? pickFirstLanguage(groups);
  const resolvedLanguage = seedLanguage ?? null;

  const resolvedPages: NavigationPage[] = groups.map((group) => {
    const pageVariant = pickVariant(group.variants, resolvedLanguage);
    const pageLanguages = collectLanguages(group.variants);

    const resolvedSections = group.sections
      .map((section) => resolveSection(section, resolvedLanguage))
      .filter(Boolean) as NavigationPage["sections"];

    return {
      page: group.page,
      name: pageVariant?.name ?? group.page,
      language: normalizeLanguage(pageVariant?.language),
      order: pageVariant?.order ?? null,
      documentId: pageVariant?.id ?? null,
      store: pageVariant?.store ?? null,
      path: pageVariant?.path ?? null,
      position: pageVariant?.position ?? null,
      languages: pageLanguages,
      variants: group.variants,
      sections: resolvedSections,
    };
  });

  resolvedPages.sort(compareByOrder);
  resolvedPages.forEach((page) => {
    page.sections.sort(compareByOrder);
  });

  return {
    pages: resolvedPages,
    activeLanguage: resolvedLanguage,
  };
};

const resolveSection = (section: NavigationSectionGroup, language: string | null) => {
  const variant = pickVariant(section.variants, language);
  if (!variant) {
    return null;
  }
  return {
    id: variant.id,
    name: variant.name,
    language: normalizeLanguage(variant.language),
    order: variant.order ?? section.order ?? null,
    store: variant.store ?? "public",
    path: variant.path ?? "",
    position: variant.position ?? null,
    languages: collectLanguages(section.variants),
    variants: section.variants,
  };
};

export const findDocumentVariants = (
  groups: NavigationPageGroup[],
  documentId: string
): { variants: NavigationVariant[]; languages: string[] } | null => {
  for (const page of groups) {
    const pageMatch = page.variants.find((variant) => variant.id === documentId);
    if (pageMatch) {
      return {
        variants: page.variants,
        languages: collectLanguages(page.variants),
      };
    }
    for (const section of page.sections) {
      const sectionMatch = section.variants.find((variant) => variant.id === documentId);
      if (sectionMatch) {
        return {
          variants: section.variants,
          languages: collectLanguages(section.variants),
        };
      }
    }
  }
  return null;
};

const compareByOrder = (a: { order?: number | null; name?: string }, b: { order?: number | null; name?: string }) => {
  const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return (a.name || "").localeCompare(b.name || "");
};

export const filterAgentsByLanguage = (agents: Array<{ language?: string | null }>, language: string | null) => {
  if (!language) {
    return agents;
  }
  const matching = agents.filter((agent) => normalizeLanguage(agent.language) === language);
  if (matching.length) {
    return matching;
  }
  const untagged = agents.filter((agent) => !normalizeLanguage(agent.language));
  return untagged.length ? untagged : agents;
};

export const normalizeLanguageValue = normalizeLanguage;
