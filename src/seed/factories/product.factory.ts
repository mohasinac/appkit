// appkit/src/seed/factories/product.factory.ts
import {
  getSeedLocale,
  getDefaultCurrency,
  pick,
  irand,
} from "../seed-market-config";

let _seq = 1;

// ─── Realistic data pools (from seed locale config) ───────────────────────────
const PRODUCT_NAMES = [
  "Handloom Cotton Saree",
  "Silver Oxidised Jhumkas",
  "Brass Pooja Diya Set",
  "Khadi Kurta & Pyjama Set",
  "Terracotta Flower Vase",
  "Sandalwood Incense Sticks",
  "Batik Print Salwar Suit",
  "Copper Water Bottle",
  "Warli Art Wall Frame",
  "Clay Tea Kadai Set",
  "Jute Laptop Bag",
  "Madhubani Painting Print",
  "Organic Tulsi Green Tea",
  "Kantha Embroidered Cushion",
  "Brass Dancing Ganesha Figurine",
  "Block Print Bedsheet Set",
  "Bamboo Cutlery Kit",
  "Dhokra Metal Elephant",
  "Rajasthani Mojari Jutti",
  "Coconut Shell Bowl Set",
] as const;

const CATEGORIES = [
  "clothing",
  "jewellery",
  "home-decor",
  "food-beverages",
  "art-crafts",
  "wellness",
  "accessories",
  "kitchenware",
] as const;

const TAGS_POOL = [
  ["handmade", "artisan"],
  ["featured", "new-arrival"],
  ["bestseller", "eco-friendly"],
  ["sale"],
  ["handcrafted", "traditional"],
  ["organic", "sustainable"],
  ["limited-edition"],
  ["gift-worthy", "premium"],
] as const;

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
  const locale = getSeedLocale();
  const title = pick(locale.productNames, n);
  const category = pick(locale.productCategories, n);
  const price = irand(n, 99, 9999);
  const stock = irand(n + 7, 5, 200);
  return {
    id: overrides.id ?? `product-${n}`,
    title: overrides.title ?? title,
    description:
      overrides.description ??
      `Authentic ${title} — handcrafted by skilled artisans.`,
    slug: overrides.slug ?? `product-${n}`,
    seoTitle: overrides.seoTitle ?? `Buy ${title} Online | Free Shipping`,
    price: overrides.price ?? price,
    currency: overrides.currency ?? getDefaultCurrency(),
    stockQuantity: overrides.stockQuantity ?? stock,
    availableQuantity:
      overrides.availableQuantity ?? Math.max(0, stock - irand(n, 0, 5)),
    mainImage: overrides.mainImage ?? "",
    images: overrides.images ?? [],
    status: overrides.status ?? "published",
    category: overrides.category ?? category,
    tags: overrides.tags ?? [...pick(TAGS_POOL, n)],
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
  basic: makeProduct({
    id: "product-1",
    title: "Basic Product",
    slug: "basic-product",
  }),
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
