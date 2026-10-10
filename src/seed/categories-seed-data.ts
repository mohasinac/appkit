/*
 * WHY: The real catalogue taxonomy. 🛑 This file is NO LONGER Beyblade-only —
 *      its header said "narrowed to Beyblade so the demo has a coherent
 *      dataset instead of a sprawling multi-franchise catalog" and B5 reversed
 *      that deliberately, on evidence: a 15-site crawl of ~25,900 live Indian
 *      listings showed trading cards, collectible figures and Hot Wheels are
 *      each a real vertical with its own measured price bands, and three of
 *      the five largest competitors sell more than one of them.
 *
 *      The old framing is not contradicted here, it is superseded — coherence
 *      now comes from the TREE being one axis deep per vertical rather than
 *      from the catalogue being one franchise wide.
 *
 * WHAT: Exports categoriesSeedData — a 5-level, SIX-root forest (Spinning Tops,
 *       Trading Cards, Collectible Figures, Hot Wheels, Model Kits, Living
 *       Collectibles — see _helpers/category-forest.ts), 28 brand rows
 *       (categoryType:"brand", _helpers/brand-rows.ts), two sublisting rows and
 *       five pricing bundles (categoryType:"bundle").
 *
 *       The tree was 2 levels under a single root until 2026-08-24 and 47 nodes
 *       across 2 roots until B5. The first state made
 *       `categoryType:"sublisting"` — documented as "tier-4 leaf groups under a
 *       parent category" — structurally unreachable, and left the live-item
 *       products with no category at all.
 *
 *       The tier-4 layer is 216 NAMED MODEL leaves (Lost Longinus, Storm
 *       Pegasus, Dran Sword …), GENERATED from the canonical corpus in
 *       _helpers/category-models.ts rather than typed by hand — a slug is the
 *       document id, the public URL and a searchTxt source, so it is the one
 *       field that cannot be quietly corrected later.
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
import { withCategorySearchTxt } from "./_helpers/search-txt-wrappers";
import { CATEGORY_FOREST } from "./_helpers/category-forest";
import { BRAND_ROW_COUNT, buildBrandRows } from "./_helpers/brand-rows";
import { MODEL_LEAF_COUNT } from "./_helpers/category-models";
import { MARKET_BAND_LEAF_IDS } from "./_helpers/category-content";
import { productsStandardSeedData } from "./products-standard-seed-data";

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
// Categories — 381 rows across 5 tiers and 6 roots, every structural field
// derived. The shape lives in _helpers/category-forest.ts, the named-model
// tier-4 leaves in the GENERATED _helpers/category-models.ts, and the
// derivation in _helpers/category-tree.ts.
//
// 🛑 Never quote this count without running `buildCategoryTree` against the
// forest — it was 47 before B5 and the comment here said so for months after
// the tree changed underneath it.
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
// Brands (categoryType:"brand") — 4 rows -> 28, built by a factory.
//
// The shape, the three live traps (display-name matching, icon-beats-cover,
// and why a brand with no products is worse than no brand) and the logo
// decision all live in _helpers/brand-rows.ts. Four inline rows at ~35 lines
// each was already the wrong shape for 28.
// ──────────────────────────────────────────────────────────────────────────────
const brandRows: Partial<CategoryDocument>[] = buildBrandRows({
  createdBy: "user-admin-letitrip",
  createdAt: daysAgo(300),
  updatedAt: daysAgo(30),
});

// P-17 — 5 bundle rows (categoryType:"bundle") grouping the Beyblade-minimal
// standard products by generation, plus one cross-generation starter pack.
// Every bundle references real seeded product ids (products-standard-seed-data.ts),
// all currently under store-beyblade-arena.
/*
 * 🛑 `bundleCategorySlugs` is DERIVED, because it is a MIRROR and mirrors
 * drift (Root Cause #42).
 *
 * The field is the union of the members' `categorySlugs`, and it is what lets
 * a category page scope its Bundles tab at all. It was hand-written across
 * all five bundles — and it drifted in B5 the moment the Beyblade X tree
 * changed: two bundles still named `category-x-starters` and
 * `category-x-boosters`, leaves that no longer exist, so those bundles had
 * silently stopped appearing under any Beyblade X category.
 *
 * Worse, the stale strings were still being READ as valid seed ids by
 * `audit-tester-plugin-wiring` R7 once its id scan was widened, which briefly
 * made two genuinely-broken authored tester cases stop being reported. A
 * hand-maintained mirror does not only go wrong — it can keep the check that
 * would have caught it quiet.
 *
 * Deriving from the members' own chains means the union cannot disagree with
 * them, and a member whose chain moves updates every bundle holding it.
 */
const PRODUCT_CHAINS = new Map<string, string[]>(
  productsStandardSeedData.map((p) => [String(p.id), (p.categorySlugs ?? []) as string[]]),
);

function bundleCategorySlugsFor(productIds: string[]): string[] {
  const out: string[] = [];
  for (const id of productIds) {
    const chain = PRODUCT_CHAINS.get(id);
    /*
     * A member missing from the standard seed is a BUG, not something to shrug
     * past: the bundle would silently lose that member's categories and the
     * Bundles tab would under-report. All eight current members are standard
     * products; if that changes, widen the map rather than softening this.
     */
    if (!chain) throw new Error(`bundle member ${id} is not in productsStandardSeedData`);
    for (const c of chain) if (!out.includes(c)) out.push(c);
  }
  return out;
}

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
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-original-dranzer-s", "product-beyblade-original-driger-v", "product-beyblade-metal-storm-pegasus"]),
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
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-metal-storm-pegasus", "product-beyblade-metal-flame-sagittario", "product-beyblade-original-dranzer-s"]),
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
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-burst-valkyrie", "product-beyblade-burst-regalia-genesis", "product-beyblade-metal-flame-sagittario"]),
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
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-x-wizard-arrow", "product-beyblade-x-knife-shinobi", "product-beyblade-burst-valkyrie"]),
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
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-original-driger-v", "product-beyblade-metal-storm-pegasus", "product-beyblade-burst-valkyrie", "product-beyblade-x-wizard-arrow"]),
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

/*
 * One array, wrapped once.
 *
 * `categoriesSeedData` and `categoriesP1SeedData` were two byte-identical
 * literals, so every change had to be made twice — and `searchTxt` would have
 * been two derivations to keep in step, which is the exact drift
 * `search-txt-wrappers.ts` exists to prevent.
 *
 * 🛑 `withCategorySearchTxt` is applied AFTER the spread, deliberately:
 * `buildCategorySearchTxt` indexes `path` and `ancestors[].name`, both DERIVED
 * by `buildCategoryTree`. Wrapping a row before derivation would index
 * name/slug/description only and silently drop the lineage search — typing
 * "burst" would stop reaching a tier-4 model under Beyblade Burst.
 */
const allCategoryRows: Partial<CategoryDocument>[] = [
  ...rawCategories.map((c) => ({ ancestors: [] as any[], ...c, createdByType: "admin" as const })),
  ...sublistingRows.map((s) => ({ ancestors: [] as any[], ...s, createdByType: "admin" as const })),
  ...brandRows.map((b) => ({ ancestors: [] as any[], ...b, createdByType: "admin" as const })),
  ...bundleRows.map((b) => ({ ancestors: [] as any[], ...b })),
].map(withCategorySearchTxt);

/*
 * ── Assertions, at MODULE LOAD, so a silent drop is loud ─────────────────────
 *
 * 🛑 These exist because of a specific failure shape this file is exposed to:
 * `appkit-seed status` counts documents BY ID, so it cannot see content drift
 * at all, and `load` is a `set(…, {merge:true})` that never removes a field.
 * A generated map that silently emptied — `MODEL_LEAVES` keyed on a line id
 * the forest renamed, say — would produce a tree that builds, typechecks,
 * seeds without error, reports perfectly in sync, and is missing 216 pages.
 *
 * Throwing at import is the right severity: every consumer of this module
 * (the seed CLI, the tester fixtures, the audits) wants to fail before writing
 * rather than after.
 */
const modelLeafRows = rawCategories.filter((c) => c.tier === 4).length;
if (modelLeafRows !== MODEL_LEAF_COUNT) {
  throw new Error(
    `category seed: ${modelLeafRows} tier-4 model leaves reached the tree but ` +
      `category-models.ts generated ${MODEL_LEAF_COUNT}. A line id in the ` +
      `forest no longer matches a key in MODEL_LEAVES — re-run ` +
      `node scripts/gen-category-models.mjs and check the line ids.`,
  );
}
if (brandRows.length !== BRAND_ROW_COUNT) {
  throw new Error(`category seed: ${brandRows.length} brand rows built, expected ${BRAND_ROW_COUNT}`);
}
{
  /*
   * A price band keyed on a leaf that does not exist is dead weight that READS
   * AS COVERAGE — the hint renders nowhere and nothing says so. Cheap to
   * check, and it is the most likely thing to rot as the tree is edited.
   */
  const ids = new Set(rawCategories.map((c) => c.id));
  const orphans = MARKET_BAND_LEAF_IDS.filter((id) => !ids.has(id));
  if (orphans.length) {
    throw new Error(
      `category seed: ${orphans.length} market band(s) key a non-existent ` +
        `leaf: ${orphans.join(", ")}`,
    );
  }
}

export const categoriesSeedData: Partial<CategoryDocument>[] = allCategoryRows;

// P-1 default seed: identical to categoriesSeedData (bundle rows included — P-17
// re-added them 2026-08-15 after the earlier removal referenced below).
export const categoriesP1SeedData: Partial<CategoryDocument>[] = allCategoryRows;
