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
import { seedPhoto, isSeedPlaceholderImage } from "./_helpers/media";
import { buildCategoryTree } from "./_helpers/category-tree";
import { withCategorySearchTxt } from "./_helpers/search-txt-wrappers";
import { CATEGORY_FOREST } from "./_helpers/category-forest";
import { BRAND_ROW_COUNT, buildBrandRows } from "./_helpers/brand-rows";
import { FRANCHISE_ROW_COUNT, buildFranchiseRows } from "./_helpers/franchise-rows";
import { MODEL_LEAF_COUNT } from "./_helpers/category-models";
import { PART_LEAF_COUNT } from "./_helpers/category-parts";
import { MARKET_BAND_LEAF_IDS } from "./_helpers/category-content";
import {
  GENERATED_CATEGORY_CONTENT,
  GENERATED_CATEGORY_CONTENT_COUNT,
} from "./_helpers/category-content-generated";
import {
  GENERATED_CATEGORY_IMAGES,
  GENERATED_CATEGORY_IMAGE_COUNT,
  GENERATED_CATEGORY_HASBRO_IMAGES,
} from "./_helpers/category-images-generated";
import { productsStandardSeedData } from "./products-standard-seed-data";
import { productsBeybladeXSeedData } from "./products-beyblade-x-seed-data";

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

// FRANCHISE rows — what a product is FROM, where a brand is who MADE it.
// Same tier-0, outside-the-forest shape as brands. Seven of the eight are
// seeded INACTIVE on purpose; see the dead-facet rule in _helpers/franchise-rows.ts.
const franchiseRows: Partial<CategoryDocument>[] = buildFranchiseRows({
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
/*
 * Both real-product arrays, not just the standard one.
 *
 * `productsBeybladeXSeedData` was added 2026-10-19 as a separate file (real,
 * wiki-verified Beyblade X listings under store-letitrip-official). A bundle
 * may legitimately hold one of those, and resolving only the standard array
 * would make `bundleCategorySlugsFor` throw "not in productsStandardSeedData"
 * for a product that genuinely exists — which is exactly what happened when
 * the two fictional X fixtures this file's bundles used to reference were
 * removed in favour of real ones.
 */
const PRODUCT_CHAINS = new Map<string, string[]>(
  [...productsStandardSeedData, ...productsBeybladeXSeedData].map((p) => [
    String(p.id),
    (p.categorySlugs ?? []) as string[],
  ]),
);

function bundleCategorySlugsFor(productIds: string[]): string[] {
  const out: string[] = [];
  for (const id of productIds) {
    const chain = PRODUCT_CHAINS.get(id);
    /*
     * A member missing from the real-product seeds is a BUG, not something to
     * shrug past: the bundle would silently lose that member's categories and
     * the Bundles tab would under-report. The map was widened (rather than
     * this check softened) on 2026-10-19 to cover
     * `productsBeybladeXSeedData` as well — if another real-product file is
     * added, widen it again.
     */
    if (!chain) {
      throw new Error(
        `bundle member ${id} is in neither productsStandardSeedData nor productsBeybladeXSeedData`,
      );
    }
    for (const c of chain) if (!out.includes(c)) out.push(c);
  }
  return out;
}

/**
 * Attach a bundle's member images so its card can render a collage.
 *
 * 🛑 A bundle IS its contents, so a single placeholder tile is the least
 * informative thing a bundle card can show. Resolved here, at seed time, from
 * the members' own `mainImage` — a card cannot do it at render time without one
 * query per bundle, and a grid of five would be five reads for decoration.
 *
 * `<ImageMosaic>` renders nothing below `MOSAIC_MIN` (3), so a bundle with one
 * or two resolvable members quietly falls back to its cover image rather than
 * showing a broken collage. A member id that resolves to no product is dropped
 * rather than defaulted — a wrong photo is worse than one fewer tile.
 */
function withBundleMosaic(row: Partial<CategoryDocument>): Partial<CategoryDocument> {
  const ids = row.bundleProductIds ?? [];
  // `row.display` must already exist — `CategoryDocumentDisplay` requires
  // `showInFooter`, so spreading onto `{}` would drop a required field. Every
  // bundle row declares one; a row without is left untouched rather than
  // half-built.
  if (ids.length === 0 || !row.display) return row;
  // Both real-product arrays, for the same reason as PRODUCT_CHAINS above —
  // otherwise a bundle holding a Beyblade X member silently loses that tile.
  const images = ids
    .map(
      (id) =>
        [...productsStandardSeedData, ...productsBeybladeXSeedData].find((p) => p.id === id)
          ?.mainImage,
    )
    .filter((src): src is string => typeof src === "string" && src.length > 0);
  if (images.length === 0) return row;
  return { ...row, display: { ...row.display, mosaicImages: images } };
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
    description: "WizardArrow and KnightShield Ver.2.0 — the re-tuned Stamina and Defense tops from the BX-53 set, paired with a Burst-era Valkyrie.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-takara-tomy",
    bundlePrice: 2499,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-x-bx-53-wizardarrow-v2", "product-beyblade-x-bx-53-knightshield-v2", "product-beyblade-burst-valkyrie"],
    },
    bundleProductIds: ["product-beyblade-x-bx-53-wizardarrow-v2", "product-beyblade-x-bx-53-knightshield-v2", "product-beyblade-burst-valkyrie"],
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-x-bx-53-wizardarrow-v2", "product-beyblade-x-bx-53-knightshield-v2", "product-beyblade-burst-valkyrie"]),
    // 1500 + 1500 + 999. Recomputed 2026-10-19 when the two fictional X
    // fixtures (899 + 949) were replaced by the real BX-53 component
    // listings — a stale total here drives a wrong discount-% badge.
    bundleOriginalTotal: 3999,
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
        "product-beyblade-x-bx-53-wizardarrow-v2",
      ],
    },
    bundleProductIds: [
      "product-beyblade-original-driger-v",
      "product-beyblade-metal-storm-pegasus",
      "product-beyblade-burst-valkyrie",
      "product-beyblade-x-bx-53-wizardarrow-v2",
    ],
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-original-driger-v", "product-beyblade-metal-storm-pegasus", "product-beyblade-burst-valkyrie", "product-beyblade-x-bx-53-wizardarrow-v2"]),
    // 1799 + 1299 + 999 + 1500. Recomputed 2026-10-19 — the X member changed
    // from the fictional "wizard-arrow" (899) to the real BX-53 WizardArrow
    // 4-80B Ver.2.0 (1500).
    bundleOriginalTotal: 5597,
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
/**
 * I7 — attach the GENERATED body to any row that has one and does not already
 * carry a hand-authored one.
 *
 * 🛑 The generator ran and its 745 bodies were imported by NOBODY. The corpus
 * sat in the repo as 128 KB of dead weight: not seeded, so not in Firestore,
 * so unreadable by the page that renders it. The generator being written is
 * not the same as its output being wired, and the second half is invisible —
 * a category page with no body renders perfectly well, it just ranks on
 * nothing.
 *
 * 🛑 A HAND-AUTHORED body always wins. The four generation roots and several
 * tier-1 nodes carry prose written against the crawl research; the generator
 * composes from facts and is deliberately the weaker writer at those tiers
 * (its own header says the part leaves are its strongest tier). Overwriting
 * authored copy with composed copy would be a silent downgrade of the exact
 * pages this is for.
 *
 * 🛑 And nothing is INVENTED here: a row absent from the map keeps no body at
 * all, because `GENERATED_CATEGORY_CONTENT` omits a node it has nothing
 * factual to say about rather than emitting an empty one.
 */
function withGeneratedContent<T extends Partial<CategoryDocument>>(row: T): T {
  if (typeof row.contentBody === "string" && row.contentBody.trim().length > 0) return row;
  const generated = row.id ? GENERATED_CATEGORY_CONTENT[row.id] : undefined;
  return generated ? { ...row, contentBody: generated } : row;
}

/**
 * Attach a fetched cover image to a bey-model leaf that has no hand-authored one.
 *
 * Same three rules as `withGeneratedContent`, for the same reasons: a
 * hand-authored `display.coverImage` wins, a row absent from the map keeps
 * nothing rather than being given a placeholder, and the map is keyed on
 * category id so it needs no transformation here.
 *
 * 🛑 These are LOCAL paths under `public/images/beys/`, never `seedExtMedia()`.
 * Wrapping a third-party image URL in `/api/media/ext` makes every render a
 * lambda plus an upstream fetch plus a sharp watermark pass — that is Root Cause
 * #104, and it is part of why this project was suspended on Fast Origin
 * Transfer. 195 proxied covers would have been a direct repeat.
 *
 * 🛑 Measured before this existed: **1,131 of 1,177** categories had no cover at
 * all, and the 46 that did shared six generic SVG colour tiles. So the
 * alternative to this map is not "a different image" — it is a grid of blank
 * cards.
 */
function withGeneratedCoverImage<T extends Partial<CategoryDocument>>(row: T): T {
  const existing = row.display?.coverImage;
  /*
   * 🛑 A seed PLACEHOLDER tile does not count as hand-authored.
   *
   * The rule is still "a hand-authored cover wins", but a `seedPhoto(...)`
   * tile was never authored — it is what the seed emits when it has nothing
   * better. Treating it as a decision is what made the placeholder BLOCK every
   * fetched wordmark: a logo could be downloaded, uploaded to Storage, mapped,
   * and the card would still show a grey tile, with nothing anywhere
   * reporting why.
   *
   * So the precedence is: real authored path > generated image > placeholder
   * tile. That lets every branch row keep an honest tile in source — which is
   * what it falls back to when no image exists, and is much better than the
   * empty grey box a brand row would otherwise render, since brand rows carry
   * no `color` and no `icon` either.
   */
  if (typeof existing === "string" && existing.trim().length > 0 && !isSeedPlaceholderImage(existing)) {
    return row;
  }
  const generated = row.id ? GENERATED_CATEGORY_IMAGES[row.id] : undefined;
  if (!generated) return row;
  return { ...row, display: { ...(row.display ?? {}), coverImage: generated } };
}

/**
 * Attach the REGIONAL-VARIANT logo to a row that names a Hasbro equivalent.
 *
 * 🛑 Gated on `hasbroName`, not merely on the map having an entry. The image is
 * rendered beside the "Also known as" line, so without the name there is
 * nothing to label it and a bare second logo reads as a duplicate of the
 * cover. The name is the fact; the image only illustrates it.
 *
 * Same hand-authored-wins rule as the cover, for the same reason: the admin
 * editor can set `hasbroCoverImage` on a row the generator knows nothing
 * about, and a reseed must not take that away.
 */
function withGeneratedHasbroCover<T extends Partial<CategoryDocument>>(row: T): T {
  if (!row.hasbroName) return row;
  const existing = row.hasbroCoverImage;
  if (typeof existing === "string" && existing.trim().length > 0) return row;
  const generated = row.id ? GENERATED_CATEGORY_HASBRO_IMAGES[row.id] : undefined;
  return generated ? { ...row, hasbroCoverImage: generated } : row;
}

const allCategoryRows: Partial<CategoryDocument>[] = [
  ...rawCategories.map((c) => ({ ancestors: [] as any[], ...c, createdByType: "admin" as const })),
  ...sublistingRows.map((s) => ({ ancestors: [] as any[], ...s, createdByType: "admin" as const })),
  ...brandRows.map((b) => ({ ancestors: [] as any[], ...b, createdByType: "admin" as const })),
  ...franchiseRows.map((f) => ({ ancestors: [] as any[], ...f, createdByType: "admin" as const })),
  ...bundleRows.map((b) => ({ ancestors: [] as any[], ...withBundleMosaic(b) })),
]
  .map(withGeneratedContent)
  .map(withGeneratedCoverImage)
  .map(withGeneratedHasbroCover)
  .map(withCategorySearchTxt);

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
/*
 * 🛑 TIER 4 IS NOW TWO GENERATED FAMILIES, not one.
 *
 * This assertion compared the tier-4 count against `MODEL_LEAF_COUNT` alone,
 * and it CAUGHT the part leaves the moment they landed — 968 against an
 * expected 216 — which is precisely the job it was written for. Widening it to
 * the sum is the fix; deleting it or loosening it to `>=` would retire the one
 * check that can see a generated map silently empty.
 *
 * Kept as an exact equality for the same reason: a `>=` would pass with
 * `PART_LEAVES` entirely gone.
 */
/*
 * 🛑 DISTINCT IDS. This assertion did not exist, and its absence is what let 20
 * part leaves overwrite 20 model leaves in production.
 *
 * The whole failure was silent at every layer: the forest walked 1,138 nodes
 * with only 1,118 distinct ids, `appkit-seed load` is a `set(…, {merge:true})`
 * so the second row with an id quietly replaced the first, and the CLI reported
 * `created 1173, errors 0` while Firestore held 1,153 documents. A buyer opening
 * `/categories/category-galeon` got the attack ring instead of the bey.
 *
 * Counting rows is not counting documents, and this is the one check that can
 * tell the difference BEFORE anything is written.
 */
/*
 * 🛑 THE GENERATED BODIES ACTUALLY LANDED ON ROWS.
 *
 * I7's corpus is a `Record<id, html>` keyed on category ids, and a key that no
 * longer matches a row is invisible everywhere: the map still exports 745
 * entries, the seed still loads 1,173 rows, `appkit-seed status` still reports
 * in sync, and every one of those category pages renders without a body. That
 * is the same failure shape as the 20 ids that overwrote each other below —
 * counting the SOURCE is not counting what reached a row.
 *
 * Tolerance rather than exact equality, for one real reason: a hand-authored
 * body legitimately wins over a generated one, so the number of rows carrying
 * a GENERATED body is `COUNT` minus however many nodes have been written by
 * hand since. A floor of 90% catches a key-space break (which drops it to ~0)
 * without failing on authored prose being added.
 */
const generatedApplied = allCategoryRows.filter(
  (c) => typeof c.id === "string" && GENERATED_CATEGORY_CONTENT[c.id] === c.contentBody,
).length;
if (generatedApplied < Math.floor(GENERATED_CATEGORY_CONTENT_COUNT * 0.9)) {
  throw new Error(
    `category seed: only ${generatedApplied} of ${GENERATED_CATEGORY_CONTENT_COUNT} generated ` +
      `content bodies matched a row id. The corpus is keyed on category ids, so this means ` +
      `the key space has drifted — re-run scripts/gen-category-content.mjs against the ` +
      `current forest. Nothing would error at load time: the pages would simply have no body.`,
  );
}

/*
 * The same assertion for the cover images, and the same reasoning: the map is
 * keyed on category ids, so a key that stops matching a row is invisible —
 * the map still exports its count, the seed still loads every row, and the
 * pages simply go back to having no image.
 *
 * The floor is 90% for the one legitimate reason a row can be missing: a
 * hand-authored `display.coverImage` wins, so the number of rows carrying a
 * GENERATED path is `COUNT` minus however many have been art-directed by hand.
 */
const generatedImagesApplied = allCategoryRows.filter(
  (c) => typeof c.id === "string" && GENERATED_CATEGORY_IMAGES[c.id] === c.display?.coverImage,
).length;
if (generatedImagesApplied < Math.floor(GENERATED_CATEGORY_IMAGE_COUNT * 0.9)) {
  throw new Error(
    `category seed: only ${generatedImagesApplied} of ${GENERATED_CATEGORY_IMAGE_COUNT} generated ` +
      `cover images matched a row id — the key space has drifted. Re-run ` +
      `scripts/fetch-taxonomy-images.mjs against the current forest. Nothing would error ` +
      `at load time: the category grids would just go back to blank cards.`,
  );
}

/*
 * The regional-variant logos. This catches ORPHANED logos, and deliberately
 * only those.
 *
 * 🛑 The two directions are NOT symmetric, which a first draft of this comment
 * got wrong until a negative control was actually run against it:
 *
 *   - **A map entry whose row does not name a Hasbro wave is an ERROR.**
 *     `withGeneratedHasbroCover` gates on `hasbroName`, so that image can
 *     never render — it was fetched, uploaded to Storage and mapped, and is
 *     now a stored object nothing will ever serve. Silent waste. Throw.
 *
 *   - **A named wave with no logo is FINE.** The "Also known as" block renders
 *     the name and omits the image (`CategoryDetailPageView` makes the picture
 *     conditional), which is a correct, intentional-looking page. Setting a
 *     name we can evidence while having no logo we can source is exactly the
 *     honest-gap rule the rest of this work follows, so failing the seed for
 *     it would punish the right behaviour.
 *
 * Hence `covered !== keys` and NOT `covered !== named`. Exact equality rather
 * than a 90% floor because there are five, hand-set against five confirmed
 * pairings: "most of them" is not a meaningful tolerance at that size.
 */
const hasbroNamed = allCategoryRows.filter((c) => typeof c.hasbroName === "string" && c.hasbroName);
const hasbroCovered = hasbroNamed.filter(
  (c) => typeof c.id === "string" && GENERATED_CATEGORY_HASBRO_IMAGES[c.id] === c.hasbroCoverImage,
);
const hasbroMapKeys = Object.keys(GENERATED_CATEGORY_HASBRO_IMAGES);
if (hasbroCovered.length !== hasbroMapKeys.length) {
  const namedIds = new Set(hasbroNamed.map((c) => c.id));
  const orphanLogos = hasbroMapKeys.filter((k) => !namedIds.has(k));
  throw new Error(
    `category seed: ${hasbroCovered.length} of ${hasbroMapKeys.length} regional-variant logos ` +
      `reached a row that names one. ` +
      (orphanLogos.length > 0
        ? `These have a logo but no hasbroName: ${orphanLogos.join(", ")}. `
        : "") +
      `Either set hasbroName in category-forest.ts, or drop the entry from the manifest and ` +
      `re-run scripts/fetch-category-images.mjs. Nothing would error at load time — the ` +
      `"Also known as" block would just render without its logo.`,
  );
}

const allIds = allCategoryRows.map((c) => c.id).filter((x): x is string => typeof x === "string");
const duplicateIds = [...new Set(allIds.filter((id, i) => allIds.indexOf(id) !== i))];
if (duplicateIds.length > 0) {
  throw new Error(
    `category seed: ${duplicateIds.length} duplicate id(s) — a merge write would ` +
      `silently overwrite, so the load would report success and lose rows. ` +
      `First few: ${duplicateIds.slice(0, 8).join(", ")}`,
  );
}
if (allIds.length !== allCategoryRows.length) {
  throw new Error(
    `category seed: ${allCategoryRows.length - allIds.length} row(s) have no string id`,
  );
}

const tier4Rows = rawCategories.filter((c) => c.tier === 4).length;
const expectedTier4 = MODEL_LEAF_COUNT + PART_LEAF_COUNT;
if (tier4Rows !== expectedTier4) {
  throw new Error(
    `category seed: ${tier4Rows} tier-4 leaves reached the tree but the generated ` +
      `maps declare ${expectedTier4} (${MODEL_LEAF_COUNT} models + ${PART_LEAF_COUNT} parts). ` +
      `A parent id in the forest no longer matches a key in MODEL_LEAVES or PART_LEAVES — ` +
      `re-run node scripts/gen-category-models.mjs and node scripts/gen-category-parts.mjs ` +
      `and check the parent ids.`,
  );
}
if (brandRows.length !== BRAND_ROW_COUNT) {
  throw new Error(`category seed: ${brandRows.length} brand rows built, expected ${BRAND_ROW_COUNT}`);
}
if (franchiseRows.length !== FRANCHISE_ROW_COUNT) {
  throw new Error(
    `category seed: ${franchiseRows.length} franchise rows built, expected ${FRANCHISE_ROW_COUNT}`,
  );
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
