/**
 * Art Products Seed Data (EMI/art-stickers session)
 *
 * Stored as ProductDocument with listingType: "art". Printed-only fan art —
 * standard cart/checkout flow, distinguished by `printMeta` (size, material,
 * finish, edition size).
 *
 * Prices in INR paise (₹1 = 100 paise).
 */

import type { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTokens } from "../utils/search-tokens";
import { seedExtMedia } from "./_helpers/media";

function withTokens(p: Partial<ProductDocument>): Partial<ProductDocument> {
  return {
    tags: [],
    featured: false,
    ...p,
    searchTokens: buildSearchTokens(
      p.title, p.description, p.brand, p.brandSlug,
      p.categoryNames, p.tags, p.features, p.condition,
    ),
  };
}

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawArtSeedData: Partial<ProductDocument>[] = [
  {
    id: "art-charizard-fan-print-a3",
    slug: "art-charizard-fan-print-a3",
    title: "Charizard Fan Art Print — A3 Matte",
    description:
      "Hand-drawn fan art print of Charizard, digitally reproduced on matte photo paper. Unofficial fan work — not affiliated with or endorsed by the Pokémon Company. Ships flat in a rigid mailer.",
    categorySlugs: ["category-trading-cards"],
    categoryNames: ["Trading Cards"],
    brand: "Independent Artist",
    price: 89900,
    currency: "INR",
    stockQuantity: 25,
    availableQuantity: 25,
    mainImage: seedExtMedia("https://picsum.photos/seed/art-charizard-print/800/1000"),
    images: [seedExtMedia("https://picsum.photos/seed/art-charizard-print/800/1000")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-tokyo-toys-india",
    storeName: "Tokyo Toys India",
    tags: ["art", "fan-art", "charizard", "print", "a3"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    printMeta: { size: "A3 (297x420mm)", material: "Matte photo paper", finish: "Matte", editionSize: 100 },
    allowOffers: false,
    createdAt: daysAgo(6),
    updatedAt: daysAgo(2),
  },
  {
    id: "art-gundam-rx78-poster-12x18",
    slug: "art-gundam-rx78-poster-12x18",
    title: "RX-78-2 Gundam Illustration Poster — 12x18 Glossy",
    description:
      "Original illustration of the RX-78-2 Gundam in dynamic pose, printed glossy on 200gsm poster stock. Great for a model-kit display shelf backdrop.",
    categorySlugs: ["category-model-kits"],
    categoryNames: ["Model Kits"],
    brand: "Independent Artist",
    price: 129900,
    currency: "INR",
    stockQuantity: 15,
    availableQuantity: 15,
    mainImage: seedExtMedia("https://picsum.photos/seed/art-gundam-poster/800/1200"),
    images: [seedExtMedia("https://picsum.photos/seed/art-gundam-poster/800/1200")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-gundam-galaxy",
    storeName: "Gundam Galaxy",
    tags: ["art", "gundam", "poster", "illustration"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    printMeta: { size: "12x18 in", material: "200gsm poster paper", finish: "Glossy" },
    allowOffers: false,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
  },
  {
    id: "art-beyblade-burst-canvas-square",
    slug: "art-beyblade-burst-canvas-square",
    title: "Beyblade Burst Arena Canvas Print — 12x12 Square",
    description:
      "Stretched canvas print of a Beyblade Burst arena battle scene. Ready to hang, no framing needed. Limited run of 50 numbered canvases.",
    categorySlugs: ["category-spinning-tops"],
    categoryNames: ["Spinning Tops"],
    brand: "Independent Artist",
    price: 249900,
    currency: "INR",
    stockQuantity: 8,
    availableQuantity: 8,
    mainImage: seedExtMedia("https://picsum.photos/seed/art-beyblade-canvas/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/art-beyblade-canvas/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    tags: ["art", "beyblade", "canvas", "limited-edition"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    printMeta: { size: "12x12 in", material: "Stretched canvas", finish: "Matte", editionSize: 50 },
    isPromoted: true,
    allowOffers: false,
    createdAt: daysAgo(9),
    updatedAt: daysAgo(3),
  },
  {
    id: "art-hotwheels-redline-mini-print",
    slug: "art-hotwheels-redline-mini-print",
    title: "Hot Wheels Redline Vintage Ad Art — Mini Print Set (3)",
    description:
      "Set of 3 mini prints (5x7 in each) recreating vintage Hot Wheels Redline-era print ads in a retro poster style. Perfect for a collector's display case.",
    categorySlugs: ["category-diecast-vehicles"],
    categoryNames: ["Diecast Vehicles"],
    brand: "Independent Artist",
    price: 69900,
    currency: "INR",
    stockQuantity: 30,
    availableQuantity: 30,
    mainImage: seedExtMedia("https://picsum.photos/seed/art-hotwheels-print/700/900"),
    images: [seedExtMedia("https://picsum.photos/seed/art-hotwheels-print/700/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-diecast-depot",
    storeName: "Diecast Depot",
    tags: ["art", "hot-wheels", "retro", "print-set"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    printMeta: { size: "5x7 in (x3)", material: "Matte cardstock", finish: "Matte" },
    allowOffers: false,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
];

export const productsArtSeedData: Partial<ProductDocument>[] =
  _rawArtSeedData.map((p) => withTokens({
    ...p,
    listingType: "art" as const,
  }));
