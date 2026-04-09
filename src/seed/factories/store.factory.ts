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
  /** PII — encrypted before Firestore write by seed runner */
  ownerEmail?: string;
  commissionRate?: number;
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

/** Full store with all optional fields populated — for rendering + PII tests */
export function makeFullStore(
  overrides: Partial<SeedBaseStoreDocument> = {},
): SeedBaseStoreDocument {
  return makeStore({
    logo: "https://example.com/logo.jpg",
    coverImage: "https://example.com/cover.jpg",
    ownerEmail: "seller@example.com",
    commissionRate: 10,
    ...overrides,
  });
}

/** Named fixtures used by seed scripts and integration tests */
export const STORE_FIXTURES = {
  main: makeFullStore({
    id: "store-1",
    name: "Main Store",
    slug: "main-store",
    ownerId: "seller-user-1",
    ownerEmail: "seller@example.com",
  }),
  secondary: makeStore({
    id: "store-2",
    name: "Secondary Store",
    slug: "secondary-store",
    ownerId: "seller-user-1",
  }),
};
