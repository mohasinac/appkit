/*
 * WHY: Seeds a minimal, Beyblade-focused catalog of standard product listings — 2 products per
 *      generation (Original, Metal Fight, Burst, X), all from the Beyblade Arena store.
 * WHAT: Exports 8 standard products with listingType:"standard", covering all 4 generation
 *       leaf categories (tagged with both leaf + root category slugs).
 *
 * EXPORTS:
 *   productsStandardSeedData — Array of 8 standard products with listingType:"standard"
 *
 * @tag domain:products,catalog
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";
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
      p.specifications?.map((s) => `${s.name} ${s.value}`),
    ),
  };
}

const _rawProductsStandardSeedData: Partial<ProductDocument>[] = [
  // ===== Beyblade Original =====
  {
    id: "product-beyblade-original-dranzer-s",
    slug: "product-beyblade-original-dranzer-s",
    barcodeId: "LIR-BEY-ORIG-001",
    title: "Beyblade Original — Dranzer S",
    description: "Plastic Generation era Dranzer S with launcher and ripcord. A classic from the original 1999-2003 Beyblade series.",
    categorySlugs: ["category-beyblade-original", "category-spinning-tops"],
    categoryNames: ["Beyblade Original", "Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 149900,
    currency: "INR",
    stockQuantity: 4,
    availableQuantity: 4,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-beyblade-original-dranzer-s-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-beyblade-original-dranzer-s-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    featured: true,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-10"),
    updatedAt: new Date("2026-05-01"),
  },
  {
    id: "product-beyblade-original-driger-v",
    slug: "product-beyblade-original-driger-v",
    barcodeId: "LIR-BEY-ORIG-002",
    title: "Beyblade Original — Driger V",
    description: "Vintage Driger V attack-type top from the original series, complete with launcher grip.",
    categorySlugs: ["category-beyblade-original", "category-spinning-tops"],
    categoryNames: ["Beyblade Original", "Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 179900,
    currency: "INR",
    stockQuantity: 2,
    availableQuantity: 2,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-beyblade-original-driger-v-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-beyblade-original-driger-v-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-12"),
    updatedAt: new Date("2026-05-01"),
  },

  // ===== Beyblade Metal Fight =====
  {
    id: "product-beyblade-metal-storm-pegasus",
    slug: "product-beyblade-metal-storm-pegasus",
    barcodeId: "LIR-BEY-META-001",
    title: "Metal Fight Beyblade BB-28 Storm Pegasus",
    description: "Storm Pegasus 105RF from the Metal Fusion era — one of the most iconic Metal Fight tops.",
    categorySlugs: ["category-beyblade-metal", "category-spinning-tops"],
    categoryNames: ["Beyblade Metal Fight", "Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 129900,
    currency: "INR",
    stockQuantity: 6,
    availableQuantity: 6,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-beyblade-metal-storm-pegasus-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-beyblade-metal-storm-pegasus-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-14"),
    updatedAt: new Date("2026-05-02"),
  },
  {
    id: "product-beyblade-metal-flame-sagittario",
    slug: "product-beyblade-metal-flame-sagittario",
    barcodeId: "LIR-BEY-META-002",
    title: "Metal Fight Beyblade BB-43 Flame Sagittario",
    description: "Flame Sagittario C145S, a balance-type top from the Metal Masters generation.",
    categorySlugs: ["category-beyblade-metal", "category-spinning-tops"],
    categoryNames: ["Beyblade Metal Fight", "Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 119900,
    currency: "INR",
    stockQuantity: 3,
    availableQuantity: 3,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-beyblade-metal-flame-sagittario-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-beyblade-metal-flame-sagittario-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-16"),
    updatedAt: new Date("2026-05-02"),
  },

  // ===== Beyblade Burst =====
  {
    id: "product-beyblade-burst-valkyrie",
    slug: "product-beyblade-burst-valkyrie",
    barcodeId: "LIR-BEY-BURS-001",
    title: "Beyblade Burst B-01 Valkyrie",
    description: "Starter set Valkyrie Wing Accel with launcher and grip — the top that launched the Burst generation.",
    categorySlugs: ["category-beyblade-burst", "category-spinning-tops"],
    categoryNames: ["Beyblade Burst", "Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 99900,
    currency: "INR",
    stockQuantity: 10,
    availableQuantity: 10,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-beyblade-burst-valkyrie-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-beyblade-burst-valkyrie-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-18"),
    updatedAt: new Date("2026-05-03"),
  },
  {
    id: "product-beyblade-burst-regalia-genesis",
    slug: "product-beyblade-burst-regalia-genesis",
    barcodeId: "LIR-BEY-BURS-002",
    title: "Beyblade Burst B-59 Regalia Genesis",
    description: "Regalia Genesis.Zt with switch launcher — Burst Rise generation attack-type top.",
    categorySlugs: ["category-beyblade-burst", "category-spinning-tops"],
    categoryNames: ["Beyblade Burst", "Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 139900,
    currency: "INR",
    stockQuantity: 5,
    availableQuantity: 5,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-beyblade-burst-regalia-genesis-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-beyblade-burst-regalia-genesis-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-20"),
    updatedAt: new Date("2026-05-03"),
  },

  // ===== Beyblade X =====
  {
    id: "product-beyblade-x-wizard-arrow",
    slug: "product-beyblade-x-wizard-arrow",
    barcodeId: "LIR-BEY-X-001",
    title: "Beyblade X BX-01 Wizard Arrow",
    description: "Wizard Arrow 4-60F, a starter top from the Beyblade X Xtreme Gear generation.",
    categorySlugs: ["category-beyblade-x", "category-spinning-tops"],
    categoryNames: ["Beyblade X", "Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 89900,
    currency: "INR",
    stockQuantity: 12,
    availableQuantity: 12,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-beyblade-x-wizard-arrow-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-beyblade-x-wizard-arrow-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-22"),
    updatedAt: new Date("2026-05-04"),
  },
  {
    id: "product-beyblade-x-knife-shinobi",
    slug: "product-beyblade-x-knife-shinobi",
    barcodeId: "LIR-BEY-X-002",
    title: "Beyblade X BX-05 Knife Shinobi",
    description: "Knife Shinobi 3-60GF, a balance-type top with tournament-grade stamina parts.",
    categorySlugs: ["category-beyblade-x", "category-spinning-tops"],
    categoryNames: ["Beyblade X", "Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 94900,
    currency: "INR",
    stockQuantity: 7,
    availableQuantity: 7,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-beyblade-x-knife-shinobi-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-beyblade-x-knife-shinobi-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-24"),
    updatedAt: new Date("2026-05-04"),
  },
];

export const productsStandardSeedData: Partial<ProductDocument>[] = [
  ..._rawProductsStandardSeedData.map((p) => withTokens({
    ...p,
    listingType: PRODUCT_FIELDS.LISTING_TYPE_VALUES.STANDARD,
  })),
];
