// appkit/src/seed/factories/homepage-section.factory.ts
let _seq = 1;

export type HomepageSectionType =
  | "hero"
  | "featured-products"
  | "categories"
  | "blog"
  | "faqs"
  | "stats"
  | "testimonials"
  | "banner";

export interface SeedHomepageSectionDocument {
  id: string;
  type: HomepageSectionType;
  sortOrder: number;
  isActive: boolean;
  content: Record<string, unknown>;
}

export function makeHomepageSection(
  type: HomepageSectionType,
  overrides: Partial<SeedHomepageSectionDocument> = {},
): SeedHomepageSectionDocument {
  const n = _seq++;
  return {
    id: overrides.id ?? `section-${n}`,
    type,
    sortOrder: overrides.sortOrder ?? n,
    isActive: overrides.isActive ?? true,
    content: overrides.content ?? {},
    ...overrides,
  };
}
