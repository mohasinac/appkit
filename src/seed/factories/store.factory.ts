// appkit/src/seed/factories/store.factory.ts
let _seq = 1;

export interface SeedBaseStoreDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  coverImage: string;
  ownerId: string;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

export function makeStore(
  overrides: Partial<SeedBaseStoreDocument> = {},
): SeedBaseStoreDocument {
  const n = _seq++;
  const now = new Date();
  const slug = overrides.slug ?? `store-${n}`;
  return {
    id: overrides.id ?? `store-${n}`,
    name: overrides.name ?? `Store ${n}`,
    slug,
    description: overrides.description ?? "A great store with amazing products.",
    logo: overrides.logo ?? "",
    coverImage: overrides.coverImage ?? "",
    ownerId: overrides.ownerId ?? "seller-1",
    status: overrides.status ?? "active",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}
