// appkit/src/seed/factories/category.factory.ts
let _seq = 1;

export interface SeedCategoryDocument {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  icon?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

export function makeCategory(
  overrides: Partial<SeedCategoryDocument> = {},
): SeedCategoryDocument {
  const n = _seq++;
  return {
    id: overrides.id ?? `category-${n}`,
    name: overrides.name ?? `Category ${n}`,
    slug: overrides.slug ?? `category-${n}`,
    parentId: overrides.parentId ?? null,
    icon: overrides.icon,
    image: overrides.image,
    sortOrder: overrides.sortOrder ?? n,
    isActive: overrides.isActive ?? true,
    ...overrides,
  };
}
