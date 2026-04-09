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

/** Full product with all optional fields populated — for rendering tests */
export function makeFullProduct(
  overrides: Partial<SeedBaseProductDocument> = {},
): SeedBaseProductDocument {
  return makeProduct({
    mainImage: "https://example.com/product.jpg",
    images: [
      "https://example.com/product-1.jpg",
      "https://example.com/product-2.jpg",
    ],
    seoTitle: "Buy Amazing Product Online",
    tags: ["featured", "new-arrival"],
    ...overrides,
  });
}

/** Named fixtures used by seed scripts and integration tests */
export const PRODUCT_FIXTURES = {
  basic: makeProduct({ id: "product-1", title: "Basic Product", slug: "basic-product" }),
  full: makeFullProduct({
    id: "product-2",
    title: "Full Product",
    slug: "full-product",
    price: 1499,
    category: "clothing",
    tags: ["featured"],
  }),
  outOfStock: makeProduct({
    id: "product-3",
    title: "Out of Stock Product",
    slug: "out-of-stock-product",
    stockQuantity: 0,
    availableQuantity: 0,
  }),
};
