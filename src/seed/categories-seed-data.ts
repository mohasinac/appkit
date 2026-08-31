/*
 * WHY: Provides the Beyblade-focused category hierarchy plus brand entries for the
 *      demo seed. The site itself stays generically branded as a collectibles marketplace —
 *      only the seeded catalog data is narrowed to Beyblade so the demo has a coherent
 *      dataset instead of a sprawling multi-franchise catalog.
 * WHAT: Exports categoriesSeedData — a 4-level, TWO-root category forest
 *       (`Spinning Tops` + `Living Collectibles`, see _helpers/category-forest.ts),
 *       brand rows (categoryType:"brand") and pricing bundles (categoryType:"bundle").
 *
 *       The tree was 2 levels under a single root until 2026-08-24. That made
 *       `categoryType:"sublisting"` — documented as "tier-4 leaf groups under a
 *       parent category" — structurally unreachable, and left the live-item
 *       products with no category at all.
 *
 *       Products tag their FULL ancestor chain (leaf -> … -> root) so a single
 *       array-contains at any level returns the whole subtree. That is what lets
 *       a category page match on its own id alone; expanding descendants into an
 *       `array-contains-any` would break past Firestore's 30-value cap.
 *
 *       Structural fields (parentIds/ancestors/tier/path/position/subtreeSize/
 *       childrenIds/isLeaf) are DERIVED by buildCategoryTree — never hand-written.
 *       The old hand-written values were already internally inconsistent: the root
 *       claimed subtreeSize 4 at position 0 while its four children also occupied
 *       positions 0-3, which is not a valid DFS pre-order numbering.
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
import { seedPhoto } from "./_helpers/media";
import { buildCategoryTree } from "./_helpers/category-tree";
import { CATEGORY_FOREST } from "./_helpers/category-forest";

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
// Categories — 47 rows across 4 tiers and 2 roots, all structural fields derived.
// The shape lives in _helpers/category-forest.ts; the derivation in
// _helpers/category-tree.ts.
// ──────────────────────────────────────────────────────────────────────────────
const rawCategories: Partial<CategoryDocument>[] = buildCategoryTree(
  CATEGORY_FOREST,
  {
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
    defaults: {
      metrics: emptyMetrics,
      isFeatured: false,
      isActive: true,
      isSearchable: true,
      showOnHomepage: false,
    },
  },
);

/**
 * Sublistings — `categoryType:"sublisting"`, documented on `CategoryDocument`
 * as "tier-4 leaf groups under a parent category". This array was EMPTY for the
 * life of the seed, because the tree only went two levels deep and there was no
 * tier-3 leaf to hang a tier-4 group off. Now that there is, these give
 * `itemCode` and `ProductDocument.sublistingCategoryId` / `sublistingIcon`
 * their first real data.
 *
 * `itemCode` is the grading/variant code a collector actually searches by.
 */
const sublistingRows: Partial<CategoryDocument>[] = [
  {
    id: "sublisting-dranzer-s-a-5",
    slug: "sublisting-dranzer-s-a-5",
    name: "Dranzer S (A-5)",
    description: "The A-5 Dranzer S release — the original Plastic Generation Dranzer.",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.SUBLISTING,
    itemCode: "A-5",
    rootId: "category-spinning-tops",
    parentIds: [
      "category-spinning-tops",
      "category-beyblade-original",
      "category-original-tops",
      "category-original-plastic-gen",
    ],
    childrenIds: [],
    ancestors: [
      { id: "category-spinning-tops", name: "Spinning Tops", tier: 0 },
      { id: "category-beyblade-original", name: "Beyblade Original", tier: 1 },
      { id: "category-original-tops", name: "Original Tops", tier: 2 },
      { id: "category-original-plastic-gen", name: "Plastic Generation", tier: 3 },
    ],
    tier: 4,
    path: "spinning-tops/beyblade-original/original-tops/original-plastic-gen/dranzer-s-a-5",
    isLeaf: true,
    order: 1,
    position: 900,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isActive: true,
    isSearchable: true,
    display: { icon: "🔥", showInMenu: false, showInFooter: false },
    seo: { title: "Dranzer S (A-5) | LetItRip", description: "The A-5 Dranzer S release.", keywords: ["dranzer s", "a-5", "plastic generation"] },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
  },
  {
    id: "sublisting-storm-pegasus-105rf",
    slug: "sublisting-storm-pegasus-105rf",
    name: "Storm Pegasus 105RF",
    description: "Storm Pegasus on a 105 track with a Rubber Flat bottom — the canonical attack build.",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.SUBLISTING,
    itemCode: "105RF",
    rootId: "category-spinning-tops",
    parentIds: [
      "category-spinning-tops",
      "category-beyblade-metal",
      "category-metal-tops",
      "category-metal-fusion",
    ],
    childrenIds: [],
    ancestors: [
      { id: "category-spinning-tops", name: "Spinning Tops", tier: 0 },
      { id: "category-beyblade-metal", name: "Beyblade Metal Fight", tier: 1 },
      { id: "category-metal-tops", name: "Metal Fight Tops", tier: 2 },
      { id: "category-metal-fusion", name: "Metal Fusion", tier: 3 },
    ],
    tier: 4,
    path: "spinning-tops/beyblade-metal/metal-tops/metal-fusion/storm-pegasus-105rf",
    isLeaf: true,
    order: 2,
    position: 901,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isActive: true,
    isSearchable: true,
    display: { icon: "🐴", showInMenu: false, showInFooter: false },
    seo: { title: "Storm Pegasus 105RF | LetItRip", description: "Storm Pegasus 105RF builds.", keywords: ["storm pegasus", "105rf", "metal fusion"] },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Brands (categoryType:"brand").
//
// ⚠️ `BrandDetailPageView` matches products on the free-text `brand` DISPLAY
// NAME (`sieveFilter("brand", EQ, brandName)`), not on `brandSlug`. So a brand
// row's `name` here and the `brand:` string on every product that belongs to it
// must match EXACTLY — renaming a brand silently orphans its whole catalogue.
// Keep `brand` and `brandSlug` in lockstep on the product side.
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
    display: { coverImage: seedPhoto("brand-logo-takara-tomy-20260101", 800, 800), showInMenu: false, showInFooter: true },
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
    display: { coverImage: seedPhoto("brand-logo-beyblade-20260101", 800, 800), showInMenu: false, showInFooter: true },
    isFeatured: true,
    isBrand: true,
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
    seo: { title: "Beyblade | LetItRip", description: "Shop Beyblade — Original, X, Burst, Metal Fight tops and stadiums.", keywords: ["beyblade", "beyblade x", "beyblade burst", "spinning top battle"] },
  },
  {
    id: "brand-hasbro",
    slug: "brand-hasbro",
    name: "Hasbro",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BRAND,
    description:
      "The international Beyblade licensee — Hasbro distributes its own Beyblade product line outside Japan, with different packaging, part names and sometimes different mould tolerances from the Takara-Tomy originals.",
    brandWebsite: "https://shop.hasbro.com",
    brandCountry: "United States",
    brandFounded: 1923,
    highlights: [
      "The Beyblade line most collectors outside Japan grew up with",
      "Widely available and generally cheaper than Japanese imports",
      "Same-generation parts are usually cross-compatible with Takara-Tomy",
    ],
    faqs: [
      { question: "Is a Hasbro Beyblade worse than the Takara-Tomy version?", answer: "Not worse, but often different — Hasbro releases can use different plastics and slightly looser tolerances, which competitive players notice. For casual play they perform comparably." },
      { question: "Can I mix Hasbro and Takara-Tomy parts?", answer: "Within the same generation, almost always yes. Across generations, no — the launcher and locking systems differ." },
    ],
    rootId: "brand-hasbro",
    parentIds: [],
    tier: 0,
    path: "brand-hasbro",
    isLeaf: true,
    order: 3,
    display: { coverImage: seedPhoto("brand-logo-hasbro-20260101", 800, 800), showInMenu: false, showInFooter: true },
    isFeatured: false,
    isBrand: true,
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
    seo: { title: "Hasbro | LetItRip", description: "Shop Hasbro Beyblade — the international product line.", keywords: ["hasbro", "hasbro beyblade", "beyblade burst hasbro"] },
  },
  {
    // The Living Collectibles root needs a brand of its own: live listings are
    // sold by individual keepers and breeders, not by a manufacturer. Without
    // one, the three live-item products carried a `brand: "Beyblade Arena"`
    // string (a STORE name in a brand field) that matched no brand row, so they
    // were invisible on every brand page.
    id: "brand-independent-keepers",
    slug: "brand-independent-keepers",
    name: "Independent Keepers",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BRAND,
    description:
      "Live animals and plants come from individual keepers, breeders and growers rather than a manufacturer. This entry groups those listings so they are reachable from brand browsing like everything else.",
    brandCountry: "India",
    highlights: [
      "Every seller is verified before a live listing can go public",
      "Provenance, age and health information disclosed per listing",
    ],
    faqs: [
      { question: "Why is there a \"brand\" for living things at all?", answer: "Purely so live listings behave like every other listing in browse and search. It identifies the class of seller, not a manufacturer." },
    ],
    rootId: "brand-independent-keepers",
    parentIds: [],
    tier: 0,
    path: "brand-independent-keepers",
    isLeaf: true,
    order: 4,
    display: { coverImage: seedPhoto("brand-logo-independent-keepers-20260101", 800, 800), showInMenu: false, showInFooter: false },
    isFeatured: false,
    isBrand: true,
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
    seo: { title: "Independent Keepers | LetItRip", description: "Live animals and plants from verified independent keepers and growers.", keywords: ["independent keepers", "breeders", "live plants"] },
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
    bundleCategorySlugs: ["category-original-hms","category-original-tops","category-beyblade-original","category-spinning-tops","category-original-plastic-gen","category-metal-masters","category-metal-tops","category-beyblade-metal"],
    bundleOriginalTotal: 4597, // 1499 + 1799 + 1299
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-original-collectors-set-20260101", 1200, 900), showInFooter: false },
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
    bundleCategorySlugs: ["category-metal-masters","category-metal-tops","category-beyblade-metal","category-spinning-tops","category-metal-fury","category-original-hms","category-original-tops","category-beyblade-original"],
    bundleOriginalTotal: 3997, // 1299 + 1199 + 1499
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-metal-fusion-duo-20260101", 1200, 900), showInFooter: false },
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
    bundleCategorySlugs: ["category-burst-superking","category-burst-tops","category-beyblade-burst","category-spinning-tops","category-burst-classic","category-metal-fury","category-metal-tops","category-beyblade-metal"],
    bundleOriginalTotal: 3597, // 999 + 1399 + 1199
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-burst-battlers-pack-20260101", 1200, 900), showInFooter: false },
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
    bundleCategorySlugs: ["category-x-starters","category-x-tops","category-beyblade-x","category-spinning-tops","category-x-boosters","category-burst-superking","category-burst-tops","category-beyblade-burst"],
    bundleOriginalTotal: 2847, // 899 + 949 + 999
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-x-series-starter-20260101", 1200, 900), showInFooter: false },
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
    bundleCategorySlugs: ["category-original-plastic-gen","category-original-tops","category-beyblade-original","category-spinning-tops","category-metal-masters","category-metal-tops","category-beyblade-metal","category-burst-superking","category-burst-tops","category-beyblade-burst","category-x-starters","category-x-tops","category-beyblade-x"],
    bundleOriginalTotal: 4996, // 1799 + 1299 + 999 + 899
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-every-generation-starter-pack-20260101", 1200, 900), showInFooter: false },
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
