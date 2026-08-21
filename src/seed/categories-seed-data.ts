/*
 * WHY: Provides a minimal, Beyblade-focused category hierarchy plus brand entries for the
 *      demo seed. The site itself stays generically branded as a collectibles marketplace —
 *      only the seeded catalog data is narrowed to Beyblade so the demo has a coherent,
 *      small dataset instead of a sprawling multi-franchise catalog.
 * WHAT: Exports categoriesSeedData — 1 root category (Spinning Tops) + 4 generation leaves
 *       (Original, Metal Fight, Burst, X) + 2 brands (categoryType:"brand").
 *       Products tag BOTH a leaf category AND its root so array-contains queries work at
 *       both levels simultaneously.
 *
 * EXPORTS:
 *   categoriesSeedData — array of Partial<CategoryDocument> for the seed runner
 *
 * @tag domain:categories,brands
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/runner.ts
 * @tag sideEffects:none
 */

import type { CategoryDocument } from "../features/categories/schemas";
import { CATEGORY_FIELDS } from "../constants/field-names";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const emptyMetrics = {
  productCount: 0,
  productIds: [],
  auctionCount: 0,
  auctionIds: [],
  totalProductCount: 0,
  totalAuctionCount: 0,
  totalItemCount: 0,
  lastUpdated: daysAgo(1),
};

// ──────────────────────────────────────────────────────────────────────────────
// Categories: 1 root (Spinning Tops) + 4 Beyblade generations
// ──────────────────────────────────────────────────────────────────────────────
const rawCategories: Partial<CategoryDocument>[] = [

  // ── ROOT: Spinning Tops ─────────────────────────────────────────────────────
  {
    id: "category-spinning-tops",
    slug: "category-spinning-tops",
    name: "Spinning Tops",
    description: "Collectible spinning tops and battle systems — Beyblade Original, Metal Fight, Burst, X, and accessories.",
    rootId: "category-spinning-tops",
    parentIds: [],
    childrenIds: ["category-beyblade-original", "category-beyblade-metal", "category-beyblade-burst", "category-beyblade-x"],
    tier: 0,
    path: "spinning-tops",
    order: 1,
    isLeaf: false,
    position: 0,
    subtreeSize: 4,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 1,
    isBrand: false,
    highlights: [
      "Every era of Beyblade in one place — Original, Metal Fight, Burst, and X",
      "Verified sellers with condition-graded listings",
      "Auctions, pre-orders, and prize draws alongside straightforward buy-now listings",
    ],
    faqs: [
      { question: "What's the difference between the four Beyblade generations?", answer: "Original (1999-2003) started the franchise with ripcord launchers; Metal Fight (2008-2013) added metal-weighted tops; Burst (2015-present) introduced tops that burst apart on hard hits; X (2023-present) uses the new Xtreme Gear system with clip-on parts." },
      { question: "Are used tops sold here safe to battle with?", answer: "Every listing shows a condition rating (New/Like New/Good/Used) and sellers are expected to disclose any chips or cracks — check the condition badge and item photos before buying." },
    ],
    seo: { title: "Spinning Tops | LetItRip", description: "Buy Beyblade and spinning tops — Original, Metal Fight, Burst, X, and accessories.", keywords: ["beyblade", "spinning tops", "beyblade x", "beyblade burst"] },
    display: { icon: "🌀", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-spinning-tops-20260101/1200/600"), color: "#0891b2", showInMenu: true, showInFooter: true },
    isActive: true,
    isSearchable: true,
    showOnHomepage: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
  {
    id: "category-beyblade-original",
    slug: "category-beyblade-original",
    name: "Beyblade Original",
    description: "The original Beyblade series (1999–2003) by Takara — Plastic Generation tops, Ultimate Beyblade, and the launchers that started the franchise.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-original",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    highlights: [
      "The tops that started it all in 1999",
      "Ripcord launcher compatible with the full original-series lineup",
      "A favorite among vintage collectors — sealed pieces command a premium",
    ],
    faqs: [
      { question: "Will an original-series top work with a Burst or X launcher?", answer: "No — each generation uses its own launcher and ripcord system. Original-series tops need an original-series launcher." },
      { question: "How do I tell if an original top is a genuine Takara release vs. a reprint?", answer: "Check the sticker finish and base stamp under good lighting — sellers with vintage-collectible tagged listings usually note authentication details in the description." },
    ],
    seo: { title: "Beyblade Original | LetItRip", description: "Buy original-series Beyblade tops and launchers — Plastic Generation, 1999-2003.", keywords: ["beyblade original", "plastic generation", "vintage beyblade", "beyblade 1999"] },
    display: { icon: "🪀", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-beyblade-original-20260101/1200/600"), color: "#b45309", showInMenu: true, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
  {
    id: "category-beyblade-metal",
    slug: "category-beyblade-metal",
    name: "Beyblade Metal Fight",
    description: "Classic Beyblade Metal Fight series — Metal Fusion, Metal Masters, Metal Fury, and Zero-G. Highly collectible vintage tops.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-metal",
    order: 2,
    isLeaf: true,
    position: 1,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    highlights: [
      "Metal-weighted tops for serious attack and defense power",
      "Covers all four Metal Fight sub-generations: Fusion, Masters, Fury, Zero-G",
      "Popular with tournament players for their heavier base weight",
    ],
    faqs: [
      { question: "What does the number/letter code after a top's name mean (e.g. \"105RF\")?", answer: "It's the track height and bottom type — e.g. 105RF means a 105-height track with a Rubber Flat bottom. Swapping tracks and bottoms lets you tune stamina vs. attack." },
      { question: "Can Metal Fight tops battle Burst tops in the same stadium?", answer: "Physically yes if the stadium size matches, but they don't burst apart on impact the way Burst tops do — most local groups keep the generations separate for fair play." },
    ],
    seo: { title: "Beyblade Metal Fight | LetItRip", description: "Buy vintage Beyblade Metal Fight tops — Fusion, Masters, Fury.", keywords: ["beyblade metal fight", "metal fusion", "metal masters", "vintage beyblade"] },
    display: { icon: "⚙️", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-beyblade-metal-20260101/1200/600"), color: "#64748b", showInMenu: true, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
  {
    id: "category-beyblade-burst",
    slug: "category-beyblade-burst",
    name: "Beyblade Burst",
    description: "Beyblade Burst by Takara-Tomy/Hasbro — Burst system tops, launchers, and stadiums from all Burst sub-generations.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-burst",
    order: 3,
    isLeaf: true,
    position: 2,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    highlights: [
      "Tops that burst apart on a hard enough hit — a whole new battle mechanic",
      "Swappable Layer / Disc / Driver parts for build customization",
      "The most actively traded generation on the platform",
    ],
    faqs: [
      { question: "What's the difference between a Layer, Disc, and Driver?", answer: "Layer is the top piece (attack profile), Disc sits underneath it (weight/stamina), Driver is the tip that touches the stadium floor (spin behavior). Mixing and matching lets you build custom combos." },
      { question: "Is a burst during battle bad for the top?", answer: "No — Burst tops are designed to separate on hard impacts as the game's core mechanic, then click back together for the next battle." },
    ],
    seo: { title: "Beyblade Burst | LetItRip", description: "Buy Beyblade Burst tops, launchers, and stadiums.", keywords: ["beyblade burst", "burst system", "beyblade burst pro"] },
    display: { icon: "💥", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-beyblade-burst-20260101/1200/600"), color: "#059669", showInMenu: true, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
  {
    id: "category-beyblade-x",
    slug: "category-beyblade-x",
    name: "Beyblade X",
    description: "Beyblade X by Takara-Tomy — the latest generation with Xtreme Gear system, X Dash, and tournament-grade stadiums.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-x",
    order: 4,
    isLeaf: true,
    position: 3,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: true,
    isBrand: false,
    highlights: [
      "The newest generation — Xtreme Gear system launched in 2023",
      "Faster clip-on part swaps than any previous generation",
      "Actively growing tournament scene with new waves releasing regularly",
    ],
    faqs: [
      { question: "Do I need new stadiums for Beyblade X?", answer: "X-format tops battle best in the wider X-format stadiums, though many X tops still spin in older round stadiums — check a listing's description for stadium compatibility notes." },
      { question: "What does the Blade / Ratchet / Bit naming mean?", answer: "Beyblade X renamed the part system — Blade (top piece), Ratchet (middle, sets height), Bit (bottom tip) — functionally similar to Burst's Layer/Disc/Driver but not physically interchangeable with them." },
    ],
    seo: { title: "Beyblade X | LetItRip", description: "Buy Beyblade X tops and stadiums by Takara-Tomy.", keywords: ["beyblade x", "xtreme gear", "beyblade x starter", "takara tomy beyblade"] },
    display: { icon: "💫", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-beyblade-x-20260101/1200/600"), color: "#0d9488", showInMenu: true, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
];

const sublistingRows: Partial<CategoryDocument>[] = [];

// ──────────────────────────────────────────────────────────────────────────────
// Brands (categoryType:"brand") — narrowed to the two brands relevant to the
// Beyblade catalog. Takara-Tomy is a real manufacturer (also makes Tomica,
// Transformers Japan) so it stays generic; Beyblade is the franchise brand.
// ──────────────────────────────────────────────────────────────────────────────
const brandRows: Partial<CategoryDocument>[] = [
  {
    id: "brand-takara-tomy",
    slug: "brand-takara-tomy",
    name: "Takara-Tomy",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BRAND,
    description: "Japanese toy company behind Beyblade, Tomica, Transformers (Japan), and Duel Masters. Known for premium quality and Japan-exclusive releases.",
    brandWebsite: "https://www.takaratomy.co.jp",
    brandCountry: "Japan",
    brandFounded: 2006,
    highlights: [
      "The Japanese toy company that manufactures every Beyblade generation",
      "Also behind Tomica, Transformers (Japan region), and Duel Masters",
      "Known for Japan-exclusive releases and premium tooling quality",
    ],
    faqs: [
      { question: "Is Takara-Tomy the same company as Hasbro's Beyblade line?", answer: "No — Takara-Tomy manufactures and sells Beyblade in Japan and most of Asia; Hasbro licenses and distributes a separate (sometimes different) product line internationally, primarily in North America." },
      { question: "Are Takara-Tomy imports compatible with Hasbro Beyblade parts?", answer: "Within the same generation (e.g. Burst-to-Burst), yes, in most cases — cross-generation compatibility is not guaranteed." },
    ],
    rootId: "brand-takara-tomy",
    parentIds: [],
    tier: 0,
    path: "brand-takara-tomy",
    isLeaf: true,
    order: 1,
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/brand-logo-takara-tomy-20260101/800/800"), showInMenu: false, showInFooter: true },
    isFeatured: true,
    isBrand: true,
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
    seo: { title: "Takara-Tomy | LetItRip", description: "Shop Takara-Tomy collectibles — Beyblade, Tomica, Transformers.", keywords: ["takara tomy", "takara tomy beyblade", "tomica takara"] },
  },
  {
    id: "brand-beyblade",
    slug: "brand-beyblade",
    name: "Beyblade",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BRAND,
    description: "Spinning top battle franchise by Takara-Tomy (Japan) and Hasbro (international). Covers the Original series, Metal Fight, Burst, and the latest Beyblade X generation.",
    brandWebsite: "https://beyblade.takaratomy.co.jp",
    brandCountry: "Japan",
    brandFounded: 1999,
    highlights: [
      "The franchise itself — spanning four generations since 1999",
      "One of the best-selling spinning-top toy lines in the world",
      "A competitive tournament scene alongside casual collecting",
    ],
    faqs: [
      { question: "What age range is Beyblade designed for?", answer: "Most sets are labeled for ages 8+ due to small parts and launcher spring mechanisms — always check the age rating on the listing before buying for a young child." },
      { question: "Where can I find official tournament rules?", answer: "Takara-Tomy and Hasbro both publish official battle rules for their respective regions — check the manufacturer's site linked from this page's \"Website\" field for the current rulebook." },
    ],
    rootId: "brand-beyblade",
    parentIds: [],
    tier: 0,
    path: "brand-beyblade",
    isLeaf: true,
    order: 2,
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/brand-logo-beyblade-20260101/800/800"), showInMenu: false, showInFooter: true },
    isFeatured: true,
    isBrand: true,
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
    seo: { title: "Beyblade | LetItRip", description: "Shop Beyblade — Original, X, Burst, Metal Fight tops and stadiums.", keywords: ["beyblade", "beyblade x", "beyblade burst", "spinning top battle"] },
  },
];

// P-17 — 5 bundle rows (categoryType:"bundle") grouping the Beyblade-minimal
// standard products by generation, plus one cross-generation starter pack.
// Every bundle references real seeded product ids (products-standard-seed-data.ts),
// all currently under store-beyblade-arena.
const bundleRows: Partial<CategoryDocument>[] = [
  {
    id: "bundle-original-collectors-set",
    name: "Original Collector's Set",
    slug: "bundle-original-collectors-set",
    description: "Both original-generation Beyblades — Dranzer S and Driger V — bundled at a discount.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-beyblade",
    bundlePrice: 2999,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-original-dranzer-s", "product-beyblade-original-driger-v", "product-beyblade-metal-storm-pegasus"],
    },
    bundleProductIds: ["product-beyblade-original-dranzer-s", "product-beyblade-original-driger-v", "product-beyblade-metal-storm-pegasus"],
    bundleOriginalTotal: 4597, // 1499 + 1799 + 1299
    bundleStockStatus: "in_stock",
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/bundle-original-collectors-set-20260101/1200/900"), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: true,
    order: 0,
    rootId: "bundle-original-collectors-set",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-original-collectors-set",
    position: 0,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
  },
  {
    id: "bundle-metal-fusion-duo",
    name: "Metal Fusion Duo",
    slug: "bundle-metal-fusion-duo",
    description: "Storm Pegasus and Flame Sagittario — the classic Metal Fight rivalry, together.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-takara-tomy",
    bundlePrice: 3499,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-metal-storm-pegasus", "product-beyblade-metal-flame-sagittario", "product-beyblade-original-dranzer-s"],
    },
    bundleProductIds: ["product-beyblade-metal-storm-pegasus", "product-beyblade-metal-flame-sagittario", "product-beyblade-original-dranzer-s"],
    bundleOriginalTotal: 3997, // 1299 + 1199 + 1499
    bundleStockStatus: "in_stock",
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/bundle-metal-fusion-duo-20260101/1200/900"), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: false,
    order: 1,
    rootId: "bundle-metal-fusion-duo",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-metal-fusion-duo",
    position: 0,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(18),
    updatedAt: daysAgo(4),
  },
  {
    id: "bundle-burst-battlers-pack",
    name: "Burst Battlers Pack",
    slug: "bundle-burst-battlers-pack",
    description: "Valkyrie and Regalia Genesis — top-tier Burst-era attackers in one set.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-beyblade",
    // Was 3799 — priced ABOVE the 999+1399+1199=3597 member total (no real
    // discount, contradicted the bundle's whole purpose). Corrected 2026-08-19.
    bundlePrice: 2899,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-burst-valkyrie", "product-beyblade-burst-regalia-genesis", "product-beyblade-metal-flame-sagittario"],
    },
    bundleProductIds: ["product-beyblade-burst-valkyrie", "product-beyblade-burst-regalia-genesis", "product-beyblade-metal-flame-sagittario"],
    bundleOriginalTotal: 3597, // 999 + 1399 + 1199
    bundleStockStatus: "in_stock",
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/bundle-burst-battlers-pack-20260101/1200/900"), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: true,
    order: 2,
    rootId: "bundle-burst-battlers-pack",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-burst-battlers-pack",
    position: 0,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(3),
  },
  {
    id: "bundle-x-series-starter",
    name: "X-Series Starter Set",
    slug: "bundle-x-series-starter",
    description: "Wizard Arrow and Knife Shinobi — the newest X-series tops for new battlers.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-takara-tomy",
    bundlePrice: 2499,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-x-wizard-arrow", "product-beyblade-x-knife-shinobi", "product-beyblade-burst-valkyrie"],
    },
    bundleProductIds: ["product-beyblade-x-wizard-arrow", "product-beyblade-x-knife-shinobi", "product-beyblade-burst-valkyrie"],
    bundleOriginalTotal: 2847, // 899 + 949 + 999
    bundleStockStatus: "in_stock",
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/bundle-x-series-starter-20260101/1200/900"), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: false,
    order: 3,
    rootId: "bundle-x-series-starter",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-x-series-starter",
    position: 0,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(2),
  },
  {
    id: "bundle-every-generation-starter-pack",
    name: "Every Generation Starter Pack",
    slug: "bundle-every-generation-starter-pack",
    description: "One top from every Beyblade generation — Original, Metal Fight, Burst, and X — the ultimate collector's starter pack.",
    categoryType: "bundle",
    bundleKind: "special",
    // Deliberately no brandSlug — genuinely cross-brand (2 Beyblade + 2
    // Takara-Tomy member products), a real "no specific brand" test case.
    // Was 5999 — priced ABOVE the 1799+1299+999+899=4996 member total (no
    // real discount, contradicted the bundle's whole purpose). Corrected 2026-08-19.
    bundlePrice: 3999,
    bundleQueryRule: {
      type: "static",
      productIds: [
        "product-beyblade-original-driger-v",
        "product-beyblade-metal-storm-pegasus",
        "product-beyblade-burst-valkyrie",
        "product-beyblade-x-wizard-arrow",
      ],
    },
    bundleProductIds: [
      "product-beyblade-original-driger-v",
      "product-beyblade-metal-storm-pegasus",
      "product-beyblade-burst-valkyrie",
      "product-beyblade-x-wizard-arrow",
    ],
    bundleOriginalTotal: 4996, // 1799 + 1299 + 999 + 899
    bundleStockStatus: "in_stock",
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/bundle-every-generation-starter-pack-20260101/1200/900"), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: true,
    order: 4,
    rootId: "bundle-every-generation-starter-pack",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-every-generation-starter-pack",
    position: 0,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },
];

export const categoriesSeedData: Partial<CategoryDocument>[] = [
  ...rawCategories.map((c) => ({ ancestors: [] as any[], ...c, createdByType: "admin" as const })),
  ...sublistingRows.map((s) => ({ ancestors: [] as any[], ...s, createdByType: "admin" as const })),
  ...brandRows.map((b) => ({ ancestors: [] as any[], ...b, createdByType: "admin" as const })),
  ...bundleRows.map((b) => ({ ancestors: [] as any[], ...b })),
];

// P-1 default seed: identical to categoriesSeedData (bundle rows included — P-17
// re-added them 2026-08-15 after the earlier removal referenced below).
export const categoriesP1SeedData: Partial<CategoryDocument>[] = [
  ...rawCategories.map((c) => ({ ancestors: [] as any[], ...c, createdByType: "admin" as const })),
  ...sublistingRows.map((s) => ({ ancestors: [] as any[], ...s, createdByType: "admin" as const })),
  ...brandRows.map((b) => ({ ancestors: [] as any[], ...b, createdByType: "admin" as const })),
  ...bundleRows.map((b) => ({ ancestors: [] as any[], ...b })),
];
