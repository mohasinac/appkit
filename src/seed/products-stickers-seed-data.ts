/**
 * Stickers Products Seed Data (EMI/art-stickers session)
 *
 * Stored as ProductDocument with listingType: "stickers". Printed-only
 * sticker sheets/packs — standard cart/checkout flow, distinguished by
 * `printMeta` (size, material, finish, edition size).
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

const _rawStickersSeedData: Partial<ProductDocument>[] = [
  {
    id: "sticker-pokemon-starter-vinyl-sheet",
    slug: "sticker-pokemon-starter-vinyl-sheet",
    title: "Pokémon Starters Vinyl Sticker Sheet — Waterproof",
    description:
      "Die-cut waterproof vinyl sticker sheet featuring the classic starter trio. Fan art, unofficial. Great for water bottles, laptops, and binders.",
    categorySlugs: ["category-trading-cards"],
    categoryNames: ["Trading Cards"],
    brand: "Independent Artist",
    price: 19900,
    currency: "INR",
    stockQuantity: 80,
    availableQuantity: 80,
    mainImage: seedExtMedia("https://picsum.photos/seed/sticker-pokemon-sheet/800/800"),
    images: [seedExtMedia("https://picsum.photos/seed/sticker-pokemon-sheet/800/800")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-pokemon-palace",
    storeName: "Pokemon Palace",
    tags: ["stickers", "pokemon", "vinyl", "waterproof"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    printMeta: { size: "10x15 cm sheet", material: "Vinyl", finish: "Glossy" },
    allowOffers: false,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    id: "sticker-gundam-mech-holographic-pack",
    slug: "sticker-gundam-mech-holographic-pack",
    title: "Gundam Mech Squad Holographic Sticker Pack (10 pcs)",
    description:
      "Pack of 10 individual holographic stickers featuring iconic Gundam mech silhouettes. Weatherproof, laptop and helmet safe.",
    categorySlugs: ["category-model-kits"],
    categoryNames: ["Model Kits"],
    brand: "Independent Artist",
    price: 29900,
    currency: "INR",
    stockQuantity: 60,
    availableQuantity: 60,
    mainImage: seedExtMedia("https://picsum.photos/seed/sticker-gundam-pack/800/800"),
    images: [seedExtMedia("https://picsum.photos/seed/sticker-gundam-pack/800/800")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-gundam-galaxy",
    storeName: "Gundam Galaxy",
    tags: ["stickers", "gundam", "holographic", "pack"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    printMeta: { size: "5x5 cm each (x10)", material: "Vinyl", finish: "Holographic" },
    isPromoted: true,
    allowOffers: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: "sticker-beyblade-burst-die-cut-set",
    slug: "sticker-beyblade-burst-die-cut-set",
    title: "Beyblade Burst Die-Cut Sticker Set (6 pcs)",
    description:
      "Set of 6 die-cut matte stickers of fan-favorite Beyblade Burst tops. Perfect for notebooks and arena cases.",
    categorySlugs: ["category-spinning-tops"],
    categoryNames: ["Spinning Tops"],
    brand: "Independent Artist",
    price: 14900,
    currency: "INR",
    stockQuantity: 100,
    availableQuantity: 100,
    mainImage: seedExtMedia("https://picsum.photos/seed/sticker-beyblade-set/800/800"),
    images: [seedExtMedia("https://picsum.photos/seed/sticker-beyblade-set/800/800")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    tags: ["stickers", "beyblade", "die-cut", "set"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    printMeta: { size: "4x4 cm each (x6)", material: "Matte vinyl", finish: "Matte" },
    allowOffers: false,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(2),
  },
  {
    id: "sticker-hotwheels-retro-logo-pack",
    slug: "sticker-hotwheels-retro-logo-pack",
    title: "Hot Wheels Retro Logo Sticker Pack (5 pcs)",
    description:
      "Retro-style Hot Wheels-inspired logo stickers, glossy finish, weatherproof for toolboxes and diecast display cases.",
    categorySlugs: ["category-diecast-vehicles"],
    categoryNames: ["Diecast Vehicles"],
    brand: "Independent Artist",
    price: 12900,
    currency: "INR",
    stockQuantity: 120,
    availableQuantity: 120,
    mainImage: seedExtMedia("https://picsum.photos/seed/sticker-hotwheels-pack/800/800"),
    images: [seedExtMedia("https://picsum.photos/seed/sticker-hotwheels-pack/800/800")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-diecast-depot",
    storeName: "Diecast Depot",
    tags: ["stickers", "hot-wheels", "retro", "pack"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    printMeta: { size: "6x4 cm each (x5)", material: "Vinyl", finish: "Glossy" },
    allowOffers: false,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

export const productsStickersSeedData: Partial<ProductDocument>[] =
  _rawStickersSeedData.map((p) => withTokens({
    ...p,
    listingType: "stickers" as const,
  }));
