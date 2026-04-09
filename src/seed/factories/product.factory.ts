// appkit/src/seed/factories/product.factory.ts
let _seq = 1;

export interface SeedBaseProductDocument {
  id: string;
  title: string;
  description: string;
  slug: string;
  seoTitle?: string;
  price: number;
  currency: string;
  stockQuantity: number;
  availableQuantity: number;
  mainImage: string;
  images: string[];
  status: "draft" | "published" | "archived";
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function makeProduct(
  overrides: Partial<SeedBaseProductDocument> = {},
): SeedBaseProductDocument {
  const n = _seq++;
  const now = new Date();
  return {
    id: overrides.id ?? `product-${n}`,
    title: overrides.title ?? `Product ${n}`,
    description: overrides.description ?? "",
    slug: overrides.slug ?? `product-${n}`,
    seoTitle: overrides.seoTitle ?? `Product ${n}`,
    price: overrides.price ?? 100,
    currency: overrides.currency ?? "INR",
    stockQuantity: overrides.stockQuantity ?? 10,
    availableQuantity: overrides.availableQuantity ?? 10,
    mainImage: overrides.mainImage ?? "",
    images: overrides.images ?? [],
    status: overrides.status ?? "published",
    category: overrides.category ?? "",
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}
