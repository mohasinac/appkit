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
import { MODEL_LEAF_COUNT, MODEL_LEAVES } from "./_helpers/category-models";
import { PART_LEAF_COUNT, PART_LEAVES } from "./_helpers/category-parts";
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
  /*
   * 🛑 The COVER is a single composited image, not a client-side collage.
   *
   * `mosaicImages` stays — it is still true and still cheap — but it is no
   * longer what a card renders. Measured on production 2026-10-21: all four
   * bundles carried three resolvable member images and every bundle card
   * STILL showed the grey placeholder `coverImage`, so either
   * `MarketplaceBundleCard` never reaches the collage or the cover wins, and
   * the card gives no way to tell which.
   *
   * `scripts/make-bundle-mosaics.mjs` composites the members into one webp
   * per bundle and uploads it as `bundle-cover-<id>`, so a bundle looks like
   * its contents on EVERY surface — including ones that never knew about
   * `mosaicImages` (OG images, the admin list, a share preview) — in one
   * request instead of three.
   *
   * Only when there are ≥2 members: a single tile is not a collage, and that
   * member's own photo would be the better cover. The script applies the same
   * floor, so the id written here always has an object behind it.
   */
  const display = { ...row.display, mosaicImages: images };
  if (images.length >= 2 && row.id) {
    display.coverImage = `/media/bundle-cover-${row.id}`;
  }
  return { ...row, display };
}

/*
 * ── 🛑 EVERY MEMBER MUST BE A PRODUCT THAT EXISTS ─────────────────────────
 *
 * `loadableBundlesOnly` in seed-cli drops any bundle whose members are not all
 * in the loaded catalogue, so a bundle pointing at a deleted product does not
 * fail loudly — it silently stops being seeded, and the Bundles tab goes
 * empty with nothing to indicate why. That is exactly what happened when the
 * demo data was purged: all five bundles referenced demo listings and all five
 * vanished.
 *
 * The three generation-named bundles were NOT repointed, they were replaced.
 * A "Metal Fusion Duo" with zero Metal Fusion products in stock is not a
 * broken bundle, it is a claim the catalogue cannot support.
 *
 * 🛑 `bundleOriginalTotal` is the sum of the members' own prices and is
 * GENERATED, never typed — it drives the discount-% badge through
 * `computeBundleDiscount()`, so a total that disagrees with its members shows
 * the buyer a saving that is not real.
 */
const bundleRows: Partial<CategoryDocument>[] = [
  {
    id: "bundle-x-starter-duo",
    name: "X Starter Duo",
    slug: "bundle-x-starter-duo",
    description: "The two BX-53 Ver.2.0 tops — WizardArrow 4-80B and KnightShield 3-80N — with a Winder Launcher to spin them. Everything needed for a first X battle.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-takara-tomy",
    bundlePrice: 2899,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-x-bx-53-wizardarrow-v2", "product-beyblade-x-bx-53-knightshield-v2", "product-beyblade-x-bx-53-winder-launcher"],
    },
    bundleProductIds: ["product-beyblade-x-bx-53-wizardarrow-v2", "product-beyblade-x-bx-53-knightshield-v2", "product-beyblade-x-bx-53-winder-launcher"],
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-x-bx-53-wizardarrow-v2", "product-beyblade-x-bx-53-knightshield-v2", "product-beyblade-x-bx-53-winder-launcher"]),
    bundleOriginalTotal: 3250, // 1500 + 1500 + 250
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-x-starter-duo-20260101", 1200, 900), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: true,
    order: 0,
    rootId: "bundle-x-starter-duo",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-x-starter-duo",
    position: 0,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
  },
  {
    id: "bundle-x-battle-ready",
    name: "X Battle-Ready Set",
    slug: "bundle-x-battle-ready",
    description: "A BX-10 Xtreme Stadium, PhoenixWing 9-60GF and a String Launcher — a complete arena setup rather than a top on its own.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-takara-tomy",
    bundlePrice: 6499,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-x-xtreme-stadium-bx-10", "product-beyblade-x-phoenixwing-9-60gf", "product-beyblade-x-bx-53-string-launcher"],
    },
    bundleProductIds: ["product-beyblade-x-xtreme-stadium-bx-10", "product-beyblade-x-phoenixwing-9-60gf", "product-beyblade-x-bx-53-string-launcher"],
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-x-xtreme-stadium-bx-10", "product-beyblade-x-phoenixwing-9-60gf", "product-beyblade-x-bx-53-string-launcher"]),
    bundleOriginalTotal: 7250, // 4500 + 2500 + 250
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-x-battle-ready-20260101", 1200, 900), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: false,
    order: 1,
    rootId: "bundle-x-battle-ready",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-x-battle-ready",
    position: 1,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
  },
  {
    id: "bundle-x-premium-tops",
    name: "Prize Beys Trio — 10% Off",
    slug: "bundle-x-premium-tops",
    description: "The three prize Beyblade X tops together — CobaltDrake 4-60F, AeroPegasus 3-70A and ValkyrieVolt S4-70V — at 10% off buying them separately.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-takara-tomy",
    /*
     * 🛑 EXACTLY 10% off `bundleOriginalTotal`, and the two must stay in step.
     *
     * `computeBundleDiscount()` derives the badge percentage from this pair,
     * so a price that drifts from the members' real total advertises a saving
     * that is not real. It was 42199 against 48000 — 12.08% — which read as a
     * deliberate 10% deal to nobody and matched no copy anywhere.
     *
     * 48000 = 20000 (AeroPegasus) + 17500 (CobaltDrake) + 10500 (ValkyrieVolt);
     * 43200 = 48000 × 0.9.
     */
    bundlePrice: 43200,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-x-aeropegasus-3-70a", "product-beyblade-x-cobaltdrake-4-60f", "product-beyblade-x-valkyrievolt-s4-70v"],
    },
    bundleProductIds: ["product-beyblade-x-aeropegasus-3-70a", "product-beyblade-x-cobaltdrake-4-60f", "product-beyblade-x-valkyrievolt-s4-70v"],
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-x-aeropegasus-3-70a", "product-beyblade-x-cobaltdrake-4-60f", "product-beyblade-x-valkyrievolt-s4-70v"]),
    bundleOriginalTotal: 48000, // 20000 + 17500 + 10500
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-x-premium-tops-20260101", 1200, 900), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: true,
    order: 2,
    rootId: "bundle-x-premium-tops",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-x-premium-tops",
    position: 2,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
  },
  {
    id: "bundle-x-bx53-complete",
    name: "BX-53 Complete Set",
    slug: "bundle-x-bx53-complete",
    description: "The full BX-53 line-up — the All-in-One Set, the Clear Black×Green Xtreme Stadium and the Double Metal Coat AeroPegasus.",
    categoryType: "bundle",
    bundleKind: "special",
    brandSlug: "brand-takara-tomy",
    bundlePrice: 21099,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-beyblade-x-bx-53-all-in-one-set", "product-beyblade-x-bx-53-xtreme-stadium-variant", "product-beyblade-x-bx-53-aeropegasus-dmc"],
    },
    bundleProductIds: ["product-beyblade-x-bx-53-all-in-one-set", "product-beyblade-x-bx-53-xtreme-stadium-variant", "product-beyblade-x-bx-53-aeropegasus-dmc"],
    bundleCategorySlugs: bundleCategorySlugsFor(["product-beyblade-x-bx-53-all-in-one-set", "product-beyblade-x-bx-53-xtreme-stadium-variant", "product-beyblade-x-bx-53-aeropegasus-dmc"]),
    bundleOriginalTotal: 23500, // 12500 + 3500 + 7500
    bundleStockStatus: "in_stock",
    display: { coverImage: seedPhoto("bundle-x-bx53-complete-20260101", 1200, 900), showInFooter: false },
    isActive: true,
    isSearchable: true,
    isFeatured: false,
    order: 3,
    rootId: "bundle-x-bx53-complete",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-x-bx53-complete",
    position: 3,
    subtreeSize: 1,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 0, totalAuctionCount: 0, totalItemCount: 0, lastUpdated: NOW },
    createdBy: "user-admin-letitrip",
    createdByType: "admin",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
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
  /*
   * 🛑 NAME THE DROPPED LEAVES. A count told us 2,626 of 2,711 arrived and
   * nothing more, which is unactionable: the ids are all distinct and every
   * parent key exists in the forest, so the difference is in WHICH parent each
   * leaf hangs off and at what depth — and that is only visible per leaf.
   *
   * The expensive version of this was a session spent inferring the cause from
   * indentation in the forest literal. The cheap version is the set
   * difference, grouped by the parent that owns each missing leaf, which also
   * says the tier it actually landed at. One run names the fix.
   */
  const reached = new Set(
    rawCategories.filter((c) => c.tier === 4).map((c) => String(c.id)),
  );
  const tierOf = new Map(rawCategories.map((c) => [String(c.id), c.tier]));
  const declared: { id: string; parent: string }[] = [];
  for (const [parent, leaves] of Object.entries(MODEL_LEAVES)) {
    for (const leaf of leaves) declared.push({ id: leaf.id, parent });
  }
  for (const [parent, leaves] of Object.entries(PART_LEAVES)) {
    for (const leaf of leaves) declared.push({ id: leaf.id, parent });
  }
  const missing = declared.filter((d) => !reached.has(d.id));
  const byParent = new Map<string, { n: number; landedAt: Set<string>; sample: string[] }>();
  for (const m of missing) {
    if (!byParent.has(m.parent)) {
      byParent.set(m.parent, { n: 0, landedAt: new Set(), sample: [] });
    }
    const g = byParent.get(m.parent)!;
    g.n += 1;
    g.landedAt.add(tierOf.has(m.id) ? `tier ${tierOf.get(m.id)}` : "absent");
    if (g.sample.length < 3) g.sample.push(m.id);
  }
  const detail = [...byParent.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .map(
      ([parent, g]) =>
        `    ${parent}: ${g.n} leaf/leaves landed at ${[...g.landedAt].join("+")} ` +
        `(e.g. ${g.sample.join(", ")})`,
    )
    .join("\n");
  throw new Error(
    `category seed: ${tier4Rows} tier-4 leaves reached the tree but the generated ` +
      `maps declare ${expectedTier4} (${MODEL_LEAF_COUNT} models + ${PART_LEAF_COUNT} parts).\n` +
      `  ${missing.length} declared leaf/leaves did not arrive as tier 4, by parent:\n` +
      `${detail}\n` +
      `  A parent at the wrong DEPTH puts its leaves at the wrong tier (a leaf is ` +
      `always parentDepth+1); a parent id the forest renamed makes them absent ` +
      `entirely. Fix the forest, then re-run node scripts/gen-category-models.mjs ` +
      `and node scripts/gen-category-parts.mjs.`,
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
