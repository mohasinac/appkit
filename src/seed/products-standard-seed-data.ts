/*
 * WHY: Seeds a minimal, Beyblade-focused catalog of standard product listings — 2 products per
 *      generation (Original, Metal Fight, Burst, X), all from the Beyblade Arena store, plus
 *      4 video-demo products so the product gallery's video slide (theater-mode playback,
 *      zoom/rotate, fullscreen) has real, playable fixtures covering every supported video
 *      source: a raw file from Google's public sample-video bucket (x2, one per Original/X),
 *      a YouTube-embed URL (Metal Fight — exercises getYouTubeVideoId()'s iframe-embed path,
 *      2026-08-21), and a second raw-external-host file from Wikimedia Commons (Burst,
 *      2026-08-21). A real MediaUploadField file-upload video can't be reproduced from seed
 *      data (no Storage object actually exists for a seeded URL to point at) — that path is
 *      covered by a tester-checklist manual test case instead, not a fixture here.
 * WHAT: Exports 14 standard products with listingType:"standard", covering all 4 generation
 *       leaf categories (tagged with both leaf + root category slugs).
 *
 * EXPORTS:
 *   productsStandardSeedData — Array of 14 standard products with listingType:"standard"
 *
 * @tag domain:products,catalog
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { ProductDocument, ProductSpecification, CustomField, CustomSection } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTxt } from "../utils/search-txt";
import { seedPhoto } from "./_helpers/media";
import { withFinalSale } from "./_helpers/final-sale-fixtures";

/*
 * Real Beyblade attributes per fixture — Root Cause #6 (standard was the
 * "richest" seed file by fixture count but never exercised customFields/
 * customSections/specifications, the actual product-spec render pipeline).
 * Keyed by product id, merged into each fixture below.
 */
const SPEC_OVERRIDES: Record<
  string,
  { specifications?: ProductSpecification[]; customFields?: CustomField[]; customSections?: CustomSection[] }
> = {
  "product-beyblade-original-dranzer-s": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "31.8", unit: "g" },
      { name: "Stamina Rating", value: "5", unit: "/10" },
      { name: "Attack Rating", value: "8", unit: "/10" },
    ],
    customFields: [
      { key: "Launcher Included", type: "boolean", value: "true" },
      { key: "Ripcord Length", type: "text", value: "Standard (short-pull)" },
    ],
  },
  "product-beyblade-original-driger-v": {
    specifications: [
      { name: "Spin Direction", value: "Left (Left-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "33.1", unit: "g" },
      { name: "Stamina Rating", value: "6", unit: "/10" },
      { name: "Attack Rating", value: "7", unit: "/10" },
    ],
    customFields: [{ key: "Launcher Included", type: "boolean", value: "false" }],
    customSections: [
      {
        id: "battle-tips",
        title: "Battle Tips",
        text: "Driger V's left-spin makes it a strong counter-pick against right-spin attack types — pair with a wide-angle stadium for maximum recoil advantage.",
      },
    ],
  },
  "product-beyblade-metal-storm-pegasus": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "50.2", unit: "g" },
      { name: "Stamina Rating", value: "4", unit: "/10" },
      { name: "Attack Rating", value: "9", unit: "/10" },
      { name: "Track & Bottom", value: "105 / RF (Rubber Flat)" },
    ],
    customFields: [{ key: "Launcher Included", type: "boolean", value: "true" }],
  },
  "product-beyblade-metal-flame-sagittario": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Balance" },
      { name: "Weight", value: "56.8", unit: "g" },
      { name: "Stamina Rating", value: "7", unit: "/10" },
      { name: "Defense Rating", value: "6", unit: "/10" },
      { name: "Track & Bottom", value: "C145 / S (Spike)" },
    ],
    customFields: [{ key: "Tournament Legal", type: "boolean", value: "true" }],
  },
  "product-beyblade-burst-valkyrie": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "28.6", unit: "g" },
      { name: "Stamina Rating", value: "5", unit: "/10" },
      { name: "Attack Rating", value: "9", unit: "/10" },
      { name: "Layer / Disc / Driver", value: "Valkyrie / Wing / Accel" },
    ],
    customFields: [
      { key: "Launcher Included", type: "boolean", value: "true" },
      { key: "Burst Resistance", type: "text", value: "Medium — tighten disc lock before battle" },
    ],
    customSections: [
      {
        id: "battle-tips",
        title: "Battle Tips",
        text: "Accel driver gives Valkyrie an aggressive early-game charge — best used in Attack vs. Stamina matchups where a fast KO matters more than late-game endurance.",
      },
    ],
  },
  "product-beyblade-burst-regalia-genesis": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "32.4", unit: "g" },
      { name: "Stamina Rating", value: "4", unit: "/10" },
      { name: "Attack Rating", value: "8", unit: "/10" },
      { name: "Layer / Disc / Driver", value: "Regalia Genesis / .Zt" },
    ],
    customFields: [{ key: "Switch Launcher Compatible", type: "boolean", value: "true" }],
  },
  "product-beyblade-x-wizard-arrow": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Balance" },
      { name: "Weight", value: "34.9", unit: "g" },
      { name: "Stamina Rating", value: "6", unit: "/10" },
      { name: "Attack Rating", value: "6", unit: "/10" },
      { name: "Blade / Ratchet / Bit", value: "Wizard / 4-60 / Flat" },
    ],
    customFields: [{ key: "Launcher Included", type: "boolean", value: "true" }],
  },
  "product-beyblade-x-knife-shinobi": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Balance" },
      { name: "Weight", value: "36.1", unit: "g" },
      { name: "Stamina Rating", value: "8", unit: "/10" },
      { name: "Defense Rating", value: "6", unit: "/10" },
      { name: "Blade / Ratchet / Bit", value: "Knife Shinobi / 3-60 / Glide Flat" },
    ],
    customFields: [{ key: "Tournament Legal", type: "boolean", value: "true" }],
    customSections: [
      {
        id: "battle-tips",
        title: "Battle Tips",
        text: "Glide Flat bit gives Knife Shinobi excellent late-game stamina in X-format stadiums with a ring — hold back and let opponents burn attack power first.",
      },
    ],
  },
  "product-beyblade-original-dragoon-f-video-demo": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "30.5", unit: "g" },
      { name: "Attack Rating", value: "8", unit: "/10" },
    ],
    customFields: [{ key: "Launcher Included", type: "boolean", value: "true" }],
  },
  "product-beyblade-x-dran-sword-video-demo": {
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "35.7", unit: "g" },
      { name: "Attack Rating", value: "9", unit: "/10" },
      { name: "Blade / Ratchet / Bit", value: "Dran Sword / 3-60 / Flat" },
    ],
    customFields: [{ key: "Tournament Legal", type: "boolean", value: "true" }],
  },
};

function withTokens(p: Partial<ProductDocument>): Partial<ProductDocument> {
  return {
    tags: [],
    featured: false,
    ...p,
    searchTxt: buildSearchTxt([
      p.title, p.description, p.brand, p.brandSlug,
      p.categoryNames, p.tags, p.features, p.condition,
      p.specifications?.map((s) => `${s.name} ${s.value}`),
    ]),
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
    categorySlugs: ["category-original-hms","category-original-tops","category-beyblade-original","category-spinning-tops"],
    categoryNames: ["Heavy Metal System","Original Tops","Beyblade Original","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 1499,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 4,
    availableQuantity: 4,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-original-dranzer-s-1-20260101", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-original-dranzer-s-1-20260101", 900, 900),
      seedPhoto("product-image-beyblade-original-dranzer-s-2-20260101", 900, 900),
      seedPhoto("product-image-beyblade-original-dranzer-s-3-20260101", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    featured: true,
    tags: ["attack-type"],
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
    categorySlugs: ["category-original-plastic-gen","category-original-tops","category-beyblade-original","category-spinning-tops"],
    categoryNames: ["Plastic Generation","Original Tops","Beyblade Original","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 1799,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 2,
    availableQuantity: 2,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-original-driger-v-1-20260101", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-original-driger-v-1-20260101", 900, 900),
      seedPhoto("product-image-beyblade-original-driger-v-2-20260101", 900, 900),
      seedPhoto("product-image-beyblade-original-driger-v-3-20260101", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    tags: ["vintage-collectible"],
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
    categorySlugs: ["category-metal-masters","category-metal-tops","category-beyblade-metal","category-spinning-tops"],
    categoryNames: ["Metal Masters","Metal Fight Tops","Beyblade Metal Fight","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 1299,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 6,
    availableQuantity: 6,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-metal-storm-pegasus-1-20260101", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-metal-storm-pegasus-1-20260101", 900, 900),
      seedPhoto("product-image-beyblade-metal-storm-pegasus-2-20260101", 900, 900),
      seedPhoto("product-image-beyblade-metal-storm-pegasus-3-20260101", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    tags: ["attack-type"],
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
    categorySlugs: ["category-metal-fury","category-metal-tops","category-beyblade-metal","category-spinning-tops"],
    categoryNames: ["Metal Fury","Metal Fight Tops","Beyblade Metal Fight","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 1199,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 3,
    availableQuantity: 3,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-metal-flame-sagittario-1-20260101", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-metal-flame-sagittario-1-20260101", 900, 900),
      seedPhoto("product-image-beyblade-metal-flame-sagittario-2-20260101", 900, 900),
      seedPhoto("product-image-beyblade-metal-flame-sagittario-3-20260101", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["balance-type", "tournament-grade"],
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
    categorySlugs: ["category-burst-superking","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Superking","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 999,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 10,
    availableQuantity: 10,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-burst-valkyrie-1-20260101", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-burst-valkyrie-1-20260101", 900, 900),
      seedPhoto("product-image-beyblade-burst-valkyrie-2-20260101", 900, 900),
      seedPhoto("product-image-beyblade-burst-valkyrie-3-20260101", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    tags: ["attack-type", "starter-set"],
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
    categorySlugs: ["category-burst-classic","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Burst Classic","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 1399,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 5,
    availableQuantity: 5,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-burst-regalia-genesis-1-20260101", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-burst-regalia-genesis-1-20260101", 900, 900),
      seedPhoto("product-image-beyblade-burst-regalia-genesis-2-20260101", 900, 900),
      seedPhoto("product-image-beyblade-burst-regalia-genesis-3-20260101", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["attack-type"],
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
    categorySlugs: ["category-x-starters","category-x-tops","category-beyblade-x","category-spinning-tops"],
    categoryNames: ["Starter Sets","Beyblade X Tops","Beyblade X","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 899,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 12,
    availableQuantity: 12,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-x-wizard-arrow-1-20260101", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-x-wizard-arrow-1-20260101", 900, 900),
      seedPhoto("product-image-beyblade-x-wizard-arrow-2-20260101", 900, 900),
      seedPhoto("product-image-beyblade-x-wizard-arrow-3-20260101", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    tags: ["attack-type", "starter-set"],
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
    categorySlugs: ["category-x-boosters","category-x-tops","category-beyblade-x","category-spinning-tops"],
    categoryNames: ["Boosters","Beyblade X Tops","Beyblade X","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 949,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 7,
    availableQuantity: 7,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-x-knife-shinobi-1-20260101", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-x-knife-shinobi-1-20260101", 900, 900),
      seedPhoto("product-image-beyblade-x-knife-shinobi-2-20260101", 900, 900),
      seedPhoto("product-image-beyblade-x-knife-shinobi-3-20260101", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["balance-type", "tournament-grade"],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-04-24"),
    updatedAt: new Date("2026-05-04"),
  },

  // ===== Video-demo fixtures — real playable video field for gallery testing =====
  {
    id: "product-beyblade-original-dragoon-f-video-demo",
    slug: "product-beyblade-original-dragoon-f-video-demo",
    barcodeId: "LIR-BEY-VID-001",
    title: "Beyblade Original — Dragoon F (Video Demo)",
    description: "Dragoon F attack-type top from the original series. Listed with an unboxing/spin video for gallery testing.",
    categorySlugs: ["category-original-hms","category-original-tops","category-beyblade-original","category-spinning-tops"],
    categoryNames: ["Heavy Metal System","Original Tops","Beyblade Original","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 1599,
    currency: "INR",
    stockQuantity: 5,
    availableQuantity: 5,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-original-dragoon-f-video-demo-1-20260819", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-original-dragoon-f-video-demo-1-20260819", 900, 900),
      seedPhoto("product-image-beyblade-original-dragoon-f-video-demo-2-20260819", 900, 900),
    ],
    video: {
      url: "/test-media/sample-video.mp4",
      thumbnailUrl: seedPhoto("product-video-thumb-beyblade-original-dragoon-f-video-demo-20260819", 800, 450),
      duration: 15,
    },
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["vintage-collectible"],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-19"),
    updatedAt: new Date("2026-08-19"),
  },
  {
    id: "product-beyblade-x-dran-sword-video-demo",
    slug: "product-beyblade-x-dran-sword-video-demo",
    barcodeId: "LIR-BEY-VID-002",
    title: "Beyblade X BX-02 Dran Sword (Video Demo)",
    description: "Dran Sword 3-60F attack-type top from the Beyblade X Xtreme Gear generation. Listed with a battle-test video for gallery testing.",
    categorySlugs: ["category-x-starters","category-x-tops","category-beyblade-x","category-spinning-tops"],
    categoryNames: ["Starter Sets","Beyblade X Tops","Beyblade X","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 949,
    currency: "INR",
    stockQuantity: 8,
    availableQuantity: 8,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-x-dran-sword-video-demo-1-20260819", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-x-dran-sword-video-demo-1-20260819", 900, 900),
      seedPhoto("product-image-beyblade-x-dran-sword-video-demo-2-20260819", 900, 900),
    ],
    video: {
      url: "/test-media/sample-video.mp4",
      thumbnailUrl: seedPhoto("product-video-thumb-beyblade-x-dran-sword-video-demo-20260819", 800, 450),
      duration: 20,
    },
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["attack-type", "tournament-grade"],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-19"),
    updatedAt: new Date("2026-08-19"),
  },
  {
    // Added 2026-08-21 — the first two video-demo fixtures only covered a raw,
    // directly-playable <video src> from one external host (Google's public
    // sample-video bucket). MediaUploadField's "YouTube" tab is a real,
    // separately-supported video source (see getYouTubeVideoId() /
    // Recurrent Root Cause Pattern for the YouTube-embed fix), but until now
    // NO permanent seed fixture exercised it — the only reproduction was an
    // ephemeral manual edit on a tester-sandbox product that a reseed would
    // silently wipe out.
    id: "product-beyblade-metal-dark-bull-video-demo",
    slug: "product-beyblade-metal-dark-bull-video-demo",
    barcodeId: "LIR-BEY-VID-003",
    title: "Metal Fight Beyblade BB-118 Dark Bull (Video Demo, YouTube)",
    description: "Dark Bull H145SD, a defense-type top from the Metal Masters generation. Listed with a YouTube battle video to exercise the gallery's YouTube-embed video source.",
    categorySlugs: ["category-metal-fusion","category-metal-tops","category-beyblade-metal","category-spinning-tops"],
    categoryNames: ["Metal Fusion","Metal Fight Tops","Beyblade Metal Fight","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 1099,
    currency: "INR",
    stockQuantity: 4,
    availableQuantity: 4,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-metal-dark-bull-video-demo-1-20260821", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-metal-dark-bull-video-demo-1-20260821", 900, 900),
      seedPhoto("product-image-beyblade-metal-dark-bull-video-demo-2-20260821", 900, 900),
    ],
    video: {
      // audit-seed-external-url-ok: MediaUploadField's YouTube tab always stores a
      // youtube.com/watch?v= URL — this is exactly that shape, not a raw file.
      // getYouTubeVideoId() detects it and MediaVideo/ImageLightbox render a
      // youtube-nocookie.com iframe embed instead of a native <video> element.
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: seedPhoto("product-video-thumb-beyblade-metal-dark-bull-video-demo-20260821", 800, 450),
      duration: 212,
    },
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["defense-type"],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-21"),
    updatedAt: new Date("2026-08-21"),
  },
  {
    // Added 2026-08-21 — third distinct video source (Wikimedia Commons,
    // CC-BY-SA) alongside the Google-sample-bucket and YouTube fixtures above,
    // matching the raw-external-URL source already used on the live-tester-
    // sandbox live-item fixture (products-tester-seed-data.ts) so a standard
    // product exercises the same non-YouTube external-host path too.
    id: "product-beyblade-burst-spryzen-video-demo",
    slug: "product-beyblade-burst-spryzen-video-demo",
    barcodeId: "LIR-BEY-VID-004",
    title: "Beyblade Burst B-97 Spryzen S2 (Video Demo, Wikimedia)",
    description: "Spryzen S2 stamina-type top from the God Layer generation. Listed with a Wikimedia-hosted spin video to exercise a second raw-external-host video source.",
    categorySlugs: ["category-burst-cho-z","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Cho-Z","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 899,
    currency: "INR",
    stockQuantity: 7,
    availableQuantity: 7,
    isSold: false,
    mainImage: seedPhoto("product-image-beyblade-burst-spryzen-video-demo-1-20260821", 900, 900),
    images: [
      seedPhoto("product-image-beyblade-burst-spryzen-video-demo-1-20260821", 900, 900),
      seedPhoto("product-image-beyblade-burst-spryzen-video-demo-2-20260821", 900, 900),
    ],
    video: {
      url: "https://upload.wikimedia.org/wikipedia/commons/4/42/Slow_motion_of_running_greyhound.webm", // audit-seed-external-url-ok: raw <video> src, CC-BY-SA 4.0 (Wikimedia Commons)
      thumbnailUrl: seedPhoto("product-video-thumb-beyblade-burst-spryzen-video-demo-20260821", 800, 450),
      duration: 14,
    },
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["stamina-type"],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-21"),
    updatedAt: new Date("2026-08-21"),
  },
  {
    // Two sold-out standard fixtures, so a 24-row page of /products has more
    // than one row in the "Sold & Ended" scope. Both stay `published` — an
    // archived row is hidden by the status filter before the availability
    // predicate ever runs, so it would prove nothing.
    id: "product-beyblade-x-dran-buster-sold-out",
    slug: "product-beyblade-x-dran-buster-sold-out",
    title: "Beyblade X BX-34 Dran Buster (Sold Out)",
    description: "The BX-34 Dran Buster attack type — this batch is fully sold. Watch for the next restock.",
    price: 1499,
    currency: "INR",
    categorySlugs: ["category-x-boosters","category-x-tops","category-beyblade-x","category-spinning-tops"],
    categoryNames: ["Boosters","Beyblade X Tops","Beyblade X","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    stockQuantity: 0,
    availableQuantity: 0,
    isSold: true,
    mainImage: seedPhoto("product-image-dran-buster-sold-out-1-20260824", 900, 900),
    images: [
      seedPhoto("product-image-dran-buster-sold-out-1-20260824", 900, 900),
      seedPhoto("product-image-dran-buster-sold-out-2-20260824", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["attack-type", "sold-out"],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-24"),
    updatedAt: new Date("2026-08-24"),
  },
  {
    id: "product-beyblade-burst-valtryek-v3-sold-out",
    slug: "product-beyblade-burst-valtryek-v3-sold-out",
    title: "Beyblade Burst Valtryek V3 (Sold Out)",
    description: "Valtryek V3, the balance-type staple. This run sold through — no units remaining.",
    price: 899,
    currency: "INR",
    categorySlugs: ["category-burst-superking","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Superking","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    stockQuantity: 0,
    availableQuantity: 0,
    isSold: true,
    mainImage: seedPhoto("product-image-valtryek-v3-sold-out-1-20260824", 900, 900),
    images: [
      seedPhoto("product-image-valtryek-v3-sold-out-1-20260824", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["balance-type", "sold-out"],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-24"),
    updatedAt: new Date("2026-08-24"),
  },
];

export const productsStandardSeedData: Partial<ProductDocument>[] = [
  ..._rawProductsStandardSeedData.map((p) => withTokens({
    ...p,
    ...(p.id ? SPEC_OVERRIDES[p.id] : undefined),
    listingType: PRODUCT_FIELDS.LISTING_TYPE_VALUES.STANDARD,
  })),
].map(withFinalSale);
