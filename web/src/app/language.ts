import type { NavigationPage, NavigationPageGroup, NavigationSectionGroup, NavigationVariant } from "../api";

type NavigationStore = "public" | "private";

const normalizeLanguage = (value?: string | null) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeStore = (value?: string | null): NavigationStore | null => {
  if (value === "public" || value === "private") {
    return value;
  }
  return null;
};

const variantsForStore = (variants: NavigationVariant[], store: NavigationStore) =>
  variants.filter((variant) => normalizeStore(variant.store) === store);

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

const pickPublicVariant = (variants: NavigationVariant[], language: string | null) => {
  if (!variants.length) {
    return null;
  }
  if (language) {
    const match = variants.find((variant) => normalizeLanguage(variant.language) === language);
    if (match) {
      return match;
    }
  }
  const untagged = variants.find((variant) => normalizeLanguage(variant.language) === null);
  if (untagged) {
    return untagged;
  }
  return null;
};

const pickPrivateVariant = (variants: NavigationVariant[]) => {
  if (!variants.length) {
    return null;
  }
  return variants[variants.length - 1];
};

const storesForGroup = (group: NavigationPageGroup): NavigationStore[] => {
  const stores = new Set<NavigationStore>();
  group.variants.forEach((variant) => {
    const store = normalizeStore(variant.store);
    if (store) {
      stores.add(store);
    }
  });
  group.sections.forEach((section) => {
    section.variants.forEach((variant) => {
      const store = normalizeStore(variant.store);
      if (store) {
        stores.add(store);
      }
    });
  });
  return Array.from(stores);
};

const pickFirstPublicLanguage = (groups: NavigationPageGroup[]) => {
  for (const page of groups) {
    for (const variant of variantsForStore(page.variants, "public")) {
      const lang = normalizeLanguage(variant.language);
      if (lang) {
        return lang;
      }
    }
    for (const section of page.sections) {
      for (const variant of variantsForStore(section.variants, "public")) {
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
  const seedLanguage = normalizedDefault ?? activeLanguage ?? pickFirstPublicLanguage(groups);
  const resolvedLanguage = seedLanguage ?? null;

  const resolvedPages: NavigationPage[] = groups.flatMap((group) =>
    storesForGroup(group)
      .map((store) => {
        const scopedVariants = variantsForStore(group.variants, store);
        const pageVariant =
          store === "public"
            ? pickPublicVariant(scopedVariants, resolvedLanguage)
            : pickPrivateVariant(scopedVariants);
        const resolvedSections = group.sections
          .map((section) => resolveSection(section, resolvedLanguage, store))
          .filter(Boolean) as NavigationPage["sections"];

        if (!pageVariant && !resolvedSections.length) {
          return null;
        }

        return {
          page: group.page,
          name: pageVariant?.name ?? group.page,
          language: store === "public" ? normalizeLanguage(pageVariant?.language) : null,
          order: pageVariant?.order ?? null,
          documentId: pageVariant?.id ?? null,
          store,
          path: pageVariant?.path ?? null,
          position: pageVariant?.position ?? null,
          position_view: pageVariant?.position_view ?? null,
          languages: store === "public" ? collectLanguages(scopedVariants) : [],
          variants: scopedVariants,
          sections: resolvedSections,
        };
      })
      .filter(Boolean) as NavigationPage[]
  );

  resolvedPages.sort(compareByOrder);
  resolvedPages.forEach((page) => {
    page.sections.sort(compareByOrder);
  });

  return {
    pages: resolvedPages,
    activeLanguage: resolvedLanguage,
  };
};

const resolveSection = (
  section: NavigationSectionGroup,
  language: string | null,
  store: NavigationStore
) => {
  const scopedVariants = variantsForStore(section.variants, store);
  const variant =
    store === "public"
      ? pickPublicVariant(scopedVariants, language)
      : pickPrivateVariant(scopedVariants);
  if (!variant) {
    return null;
  }
  return {
    id: variant.id,
    name: variant.name,
    language: store === "public" ? normalizeLanguage(variant.language) : null,
    order: variant.order ?? section.order ?? null,
    store: variant.store ?? store,
    path: variant.path ?? "",
    position: variant.position ?? null,
    position_view: variant.position_view ?? null,
    languages: store === "public" ? collectLanguages(scopedVariants) : [],
    variants: scopedVariants,
  };
};

export const findDocumentVariants = (
  groups: NavigationPageGroup[],
  documentId: string
): { variants: NavigationVariant[]; languages: string[] } | null => {
  for (const page of groups) {
    const pageMatch = page.variants.find((variant) => variant.id === documentId);
    if (pageMatch) {
      if (normalizeStore(pageMatch.store) !== "public") {
        return null;
      }
      const scopedVariants = variantsForStore(page.variants, "public");
      return {
        variants: scopedVariants,
        languages: collectLanguages(scopedVariants),
      };
    }
    for (const section of page.sections) {
      const sectionMatch = section.variants.find((variant) => variant.id === documentId);
      if (sectionMatch) {
        if (normalizeStore(sectionMatch.store) !== "public") {
          return null;
        }
        const scopedVariants = variantsForStore(section.variants, "public");
        return {
          variants: scopedVariants,
          languages: collectLanguages(scopedVariants),
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

export const filterAgentsByLanguage = <T extends { language?: string | null }>(
  agents: T[],
  language: string | null
): T[] => {
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
