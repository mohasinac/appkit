/**
 * Categories Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants,
 * and hierarchy helpers for the categories feature.
 */

import { generateCategoryId } from "../../../utils/id-generators";
import { slugify } from "../../../utils/string.formatter";
import type {
  CategoryAncestor,
  CategoryMetrics,
  CategoryDisplay,
} from "../types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type {
  CategoryDescriptionTemplate,
  CategoryProductDefaults,
} from "./category-content";
export type {
  CategoryDescriptionTemplate,
  CategoryProductDefaults,
  CategoryPriceGuidance,
  CategorySpecification,
  CategoryTemplateVariant,
} from "./category-content";

export type { CategoryAncestor, CategoryMetrics };

// ── Bundle query rule (SB-UNI-D) ────────────────────────────────────────
/**
 * How a bundle resolves its member products.
 *
 * `static` — hand-picked product IDs. The admin editor multi-select writes
 * here; bundleProductIds mirrors for index-friendly queries.
 *
 * `dynamic` — publisher-pack style: filter against the products collection
 * (e.g. "all Pokémon TCG products in this category, ordered by price asc,
 * limit N"). Resolved by onProductStockChange + a scheduled job; the
 * resolved IDs are cached on `bundleProductIds` with a `bundleQueryResolvedAt`
 * timestamp.
 */
export type BundleQueryRule =
  | { type: "static"; productIds: string[] }
  | {
      type: "dynamic";
      filter: {
        categorySlug?: string;
        brandSlug?: string;
        tags?: string[];
        /** Eligible listing types that may appear in a dynamic bundle. */
        listingType?: "standard" | "pre-order" | "prize-draw";
      };
      orderBy?: "price-asc" | "price-desc" | "createdAt-desc";
      limit: number;
    };

/**
 * Per-member metadata stored alongside `bundleProductIds`.
 * `drawCount` — only meaningful when the member product has
 * sieveFilter("listingType", SIEVE_OP.EQ, "= "prize-draw""). Represents how many draw entries
 * the buyer receives for that product when they purchase the bundle
 * (e.g. drawCount=5 means 5 raffle entries, not 5 copies of the draw).
 */
export interface BundleItemDetail {
  productId: string;
  /** Number of draw entries included when product is a prize-draw. */
  drawCount?: number;
  /**
   * Denormalised member product image URL — snapshotted at bundle-edit time
   * by the admin/store bundle editor (or the `onProductWrite` fan-out) so the
   * BundleCard can render a 2x2 collage without N+1 product fetches.
   * When absent the card falls back to `display.coverImage`.
   */
  imageURL?: string;
  /** Denormalised member product title — used as alt text for the collage tile. */
  title?: string;
}

// -- Category Document --------------------------------------------------------

/** Full Firestore category document (includes server-only fields) */
export interface CategoryDocumentSEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
}

/** Full Firestore display shape (superset of the public CategoryDisplay type) */
export interface CategoryDocumentDisplay extends CategoryDisplay {
  showInFooter: boolean;
}

/** Full Firestore category metrics (superset of the public CategoryMetrics type) */
export interface CategoryDocumentMetrics {
  productCount: number;
  productIds: string[];
  auctionCount: number;
  auctionIds: string[];
  totalProductCount: number;
  totalAuctionCount: number;
  totalItemCount: number;
  lastUpdated: Date;
}

export interface CategoryDocument extends BaseDocument {
  name: string;
  slug: string;
  description?: string;

  /** Test-data flag — set on shared admin-seeded test categories/brands/bundles; swept by testDataCleanup. */
  isTestData?: boolean;
  /** When isTestData, the cutoff after which testDataCleanup deletes this doc. */
  testDataExpiresAt?: Date;

  rootId: string;
  parentIds: string[];
  childrenIds: string[];
  tier: number;
  path: string;
  order: number;
  isLeaf: boolean;

  /**
   * Global DFS pre-order position across the entire category tree (1-indexed).
   * Set and maintained by the onCategoryWrite Cloud Function.
   * Enables ordered range queries without loading the whole tree.
   */
  position: number;

  /**
   * Count of this node plus all its descendants.
   * The range [position, position + subtreeSize - 1] covers the full subtree.
   * Used to efficiently locate insertion points and shift sibling positions.
   */
  subtreeSize: number;

  metrics: CategoryDocumentMetrics;
  viewCount?: number;

  isFeatured: boolean;
  featuredPriority?: number;
  /** @deprecated Use categoryType === "brand". Will be removed once seed + admin form fully migrate. */
  isBrand?: boolean;
  /**
   * Discriminator — distinguishes plain categories from sublistings (tier-4
   * leaf groups under a parent category) and brands (storefront-facing
   * brand pages). SB-UNI-D will add `"bundle"` to this union.
   */
  categoryType?: import("../types").CategoryType;
  /** Sublisting/grading code (e.g. "108/120", "PSA 10") — categoryType==="sublisting". */
  itemCode?: string;
  /** Brand homepage URL — categoryType==="brand". */
  brandWebsite?: string;
  /** Brand country of origin — categoryType==="brand". */
  brandCountry?: string;
  /** Brand founding year — categoryType==="brand". */
  brandFounded?: number;

  /**
   * Short bullet points — "why shop this category/brand." Category and
   * brand detail pages only; renders nothing when absent/empty.
   */
  highlights?: string[];
  /** A handful of Q&A pairs shown on the category/brand detail page. */
  faqs?: { question: string; answer: string }[];

  // ── Category-owned content (B3) — see schemas/category-content.ts ─────
  /**
   * 400–900 chars of keyword-rich HTML with sibling/parent cross-links,
   * rendered via `<RichTextRenderer>`.
   *
   * 🛑 DISTINCT from `description`, which is a <=230-char blurb that also
   * feeds `seo.description` and every card. Conflating them would put a
   * 900-char body in a card and a 230-char stub on the page.
   *
   * 36 of worldhobbyshop's 46 categories carry one and it is their actual
   * ranking mechanism; no Shopify competitor in the crawl has any.
   */
  contentBody?: string;
  /** Condition-keyed description bodies. A SET, because WHS reuses two per category. */
  descriptionTemplates?: CategoryDescriptionTemplate[];
  /** What this category hands down to a product filed under it. */
  productDefaults?: CategoryProductDefaults;

  // ── Bundle fields — categoryType==="bundle" (SB-UNI-D) ────────────────
  /**
   * "special" — admin-curated bundle; writes reverse `partOfBundleIds`
   * pointers on member products and shows the "Bundled" badge on cards.
   *
   * "brand" — auto-generated brand collection (dynamic brandSlug query).
   * Does NOT update `partOfBundleIds`; used as a discovery surface only.
   */
  bundleKind?: "special" | "brand";
  /**
   * Which brand this bundle belongs to, for the brand detail page's bundle
   * tab — works for both `bundleKind:"special"` (static) and `"brand"`
   * (dynamic) bundles. Distinct from `bundleQueryRule.filter.brandSlug`,
   * which is a dynamic-rule query *filter* (only meaningful when
   * `bundleQueryRule.type==="dynamic"`) — this field is the bundle's own
   * brand tag regardless of how its members are resolved.
   */
  brandSlug?: string;
  /** Discounted bundle price in decimal rupees. */
  bundlePrice?: number;
  /** Rule resolving the bundle's member products — static list or live query. */
  bundleQueryRule?: BundleQueryRule;
  /** Snapshot stock state — recomputed by onProductStockChange. */
  bundleStockStatus?: "in_stock" | "out_of_stock";
  /** Timestamp of the last dynamic-rule resolution. */
  bundleQueryResolvedAt?: Date;
  /** Hand-picked products list (mirror of bundleQueryRule for static rules); kept for index-friendly queries. */
  bundleProductIds?: string[];
  /**
   * Categories this bundle belongs to — the union of its member products'
   * `categorySlugs`. A bundle row has no category of its own, so without this
   * the category page could not scope its Bundles tab at all and counted every
   * active bundle site-wide.
   *
   * Denormalised at bundle create/update time and refreshed by the daily bundle
   * stock sync. Per Root Cause #42 a mirror is never trusted alone: readers
   * treat an ABSENT mirror as "unscoped" (show it) rather than "belongs to no
   * category" (hide it), so a write path that forgets to set it degrades to
   * over-inclusion instead of silently losing the bundle.
   */
  bundleCategorySlugs?: string[];
  /**
   * Sum of member products' individual prices (decimal rupees) — the "buy
   * separately" total the discount badge is measured against. Denormalised
   * at bundle create/update time and refreshed by the daily bundle stock
   * sync job; undefined when a member price couldn't be resolved.
   */
  bundleOriginalTotal?: number;
  /**
   * Per-member metadata parallel to `bundleProductIds`.
   * Carries `drawCount` for prize-draw members (how many raffle entries
   * the buyer receives). Flat `bundleProductIds` is kept for Firestore
   * array-contains queries; this array holds the richer shape.
   */
  bundleItemDetails?: BundleItemDetail[];

  seo: CategoryDocumentSEO;
  display: CategoryDocumentDisplay;

  isActive: boolean;
  isSearchable: boolean;
  showOnHomepage?: boolean;

  /**
   * Prefix-expanded search tokens, derived on every write by
   * `CategoriesRepository.buildSearchTxtFor` → `buildCategorySearchTxt`.
   *
   * 🛑 Distinct from `isSearchable`, which is an admin visibility flag. This is
   * the index that makes a category findable AT ALL: before it existed,
   * `CATEGORY_SEARCH_SCAN_LIMIT` was capped at 100 by `SIEVE_DEFAULTS.maxPageSize`
   * — so raising that number did nothing — and a tier-4 model like
   * "Lost Longinus" was unfindable in every picker.
   *
   * Never fed any PII: no `createdBy` (a raw uid) and no `createdByStoreName`.
   */
  searchTxt?: string[];

  createdBy: string;
  /** Whether this category was created by admin or a store owner. */
  createdByType?: "admin" | "store";
  /** The storeId of the store that requested this category (only set when createdByType === "store"). */
  createdByStoreId?: string;
  /** Display name of the store that requested this category. */
  createdByStoreName?: string;

  ancestors: CategoryAncestor[];
}

export const CATEGORIES_COLLECTION = "categories" as const;

export const CATEGORIES_INDEXED_FIELDS = [
  "slug",
  "rootId",
  "tier",
  "parentIds",
  "isLeaf",
  "isFeatured",
  "featuredPriority",
  "isBrand",
  "categoryType",
  "isActive",
  "isSearchable",
  "showOnHomepage",
  "searchTxt",
  "createdBy",
  "createdByType",
  "createdByStoreId",
  "createdAt",
] as const;

export const MIN_ITEMS_FOR_FEATURED = 8 as const;
export const MAX_FEATURED_CATEGORIES = 4 as const;

export const DEFAULT_CATEGORY_DATA: Partial<CategoryDocument> = {
  childrenIds: [],
  isLeaf: true,
  order: 0,
  position: 0,
  subtreeSize: 1,
  isFeatured: false,
  isBrand: false,
  isActive: true,
  isSearchable: true,
  metrics: {
    productCount: 0,
    productIds: [],
    auctionCount: 0,
    auctionIds: [],
    totalProductCount: 0,
    totalAuctionCount: 0,
    totalItemCount: 0,
    lastUpdated: new Date(),
  },
  display: {
    showInMenu: true,
    showInFooter: false,
  },
};

export const CATEGORIES_PUBLIC_FIELDS = [
  "id",
  "name",
  "slug",
  "description",
  "rootId",
  "parentIds",
  "childrenIds",
  "tier",
  "path",
  "order",
  "position",
  "subtreeSize",
  "isLeaf",
  "metrics.totalProductCount",
  "metrics.totalAuctionCount",
  "metrics.totalItemCount",
  "isFeatured",
  "featuredPriority",
  "isBrand",
  "seo",
  "display",
  "isActive",
  "ancestors",
  /*
   * B3. `highlights` and `faqs` were MISSING from both this list and the
   * updatable one, which is the more interesting half: `CategoryUpdateInput`
   * derives from UPDATABLE_FIELDS, so a field absent from it is not even
   * TYPE-LEGAL to update — and both had shipped with no editor at all.
   * Precedent-by-omission gets closed, not copied.
   *
   * `productDefaults` is public because its advisory half (priceGuidance,
   * specifications, inTheBox) is rendered to buyers and sellers. Its
   * `taxCodeId` is a reference to an admin-only row, not a secret.
   */
  "highlights",
  "faqs",
  "contentBody",
  "descriptionTemplates",
  "productDefaults",
] as const;

export const CATEGORIES_UPDATABLE_FIELDS = [
  "name",
  "slug",
  "description",
  "order",
  "isFeatured",
  "featuredPriority",
  "isBrand",
  "seo",
  "display",
  "isActive",
  "isSearchable",
  // B3 — see the note in CATEGORIES_PUBLIC_FIELDS. Without these five,
  // CategoryUpdateInput cannot express them and no editor can save them.
  "highlights",
  "faqs",
  "contentBody",
  "descriptionTemplates",
  "productDefaults",
] as const;

export type CategoryCreateInput = Omit<
  CategoryDocument,
  "id" | "createdAt" | "updatedAt" | "metrics" | "isLeaf" | "ancestors"
> & {
  parentIds?: string[];
  parentId?: string | null;
};

export type CategoryUpdateInput = Partial<
  Pick<CategoryDocument, (typeof CATEGORIES_UPDATABLE_FIELDS)[number]>
>;

export interface CategoryMoveInput {
  categoryId: string;
  newParentId: string | null;
}

export interface CategoryTreeNode {
  category: CategoryDocument;
  children: CategoryTreeNode[];
  depth: number;
}

export const categoryQueryHelpers = {
  bySlug: (slug: string) => ["slug", "==", slug] as const,
  roots: () => ["tier", "==", 0] as const,
  leafCategories: () => ["isLeaf", "==", true] as const,
  byTier: (tier: number) => ["tier", "==", tier] as const,
  byRootId: (rootId: string) => ["rootId", "==", rootId] as const,
  children: (parentId: string) =>
    ["parentIds", "array-contains", parentId] as const,
  featured: () => ["isFeatured", "==", true] as const,
  /** @deprecated Use byCategoryType("brand"). */
  brands: () => ["isBrand", "==", true] as const,
  /** SB-UNI B + C + D — discriminator-based listing. */
  byCategoryType: (type: import("../types").CategoryType) =>
    ["categoryType", "==", type] as const,
  sublistings: () => ["categoryType", "==", "sublisting" as const] as const,
  brandPages: () => ["categoryType", "==", "brand" as const] as const,
  active: () => ["isActive", "==", true] as const,
  searchable: () => ["isSearchable", "==", true] as const,
  byCreator: (userId: string) => ["createdBy", "==", userId] as const,
} as const;

export function calculateCategoryFields(
  parentCategory: CategoryDocument | null,
  name: string,
  newCategoryId: string,
): {
  tier: number;
  parentIds: string[];
  rootId: string;
  path: string;
  ancestors: CategoryAncestor[];
} {
  if (!parentCategory) {
    return {
      tier: 0,
      parentIds: [],
      rootId: newCategoryId,
      path: slugify(name),
      ancestors: [],
    };
  }

  return {
    tier: parentCategory.tier + 1,
    parentIds: [...parentCategory.parentIds, parentCategory.id],
    rootId: parentCategory.rootId,
    path: `${parentCategory.path}/${slugify(name)}`,
    ancestors: [
      ...parentCategory.ancestors,
      {
        id: parentCategory.id,
        name: parentCategory.name,
        tier: parentCategory.tier,
      },
    ],
  };
}

export function createCategoryId(
  name: string,
  parentName?: string,
  rootName?: string,
): string {
  return generateCategoryId({ name, parentName, rootName });
}

export function canBeFeatured(category: CategoryDocument): boolean {
  return category.metrics.totalItemCount >= MIN_ITEMS_FOR_FEATURED;
}

export function isValidCategoryMove(
  categoryId: string,
  newParentId: string | null,
  currentCategory: CategoryDocument,
): boolean {
  if (categoryId === newParentId) return false;
  if (newParentId && currentCategory.childrenIds.includes(newParentId))
    return false;
  return true;
}

export const CATEGORY_FIELDS = {
  ID: "id",
  NAME: "name",
  SLUG: "slug",
  DESCRIPTION: "description",
  ROOT_ID: "rootId",
  PARENT_IDS: "parentIds",
  CHILDREN_IDS: "childrenIds",
  TIER: "tier",
  PATH: "path",
  ORDER: "order",
  POSITION: "position",
  SUBTREE_SIZE: "subtreeSize",
  IS_LEAF: "isLeaf",
  METRICS: "metrics",
  METRIC: {
    PRODUCT_COUNT: "metrics.productCount",
    PRODUCT_IDS: "metrics.productIds",
    AUCTION_COUNT: "metrics.auctionCount",
    AUCTION_IDS: "metrics.auctionIds",
    TOTAL_PRODUCT_COUNT: "metrics.totalProductCount",
    TOTAL_AUCTION_COUNT: "metrics.totalAuctionCount",
    TOTAL_ITEM_COUNT: "metrics.totalItemCount",
    LAST_UPDATED: "metrics.lastUpdated",
  },
  IS_FEATURED: "isFeatured",
  IS_BRAND: "isBrand",
  FEATURED_PRIORITY: "featuredPriority",
  SEO: "seo",
  DISPLAY: "display",
  VIEW_COUNT: "viewCount",
  IS_ACTIVE: "isActive",
  IS_SEARCHABLE: "isSearchable",
  SEARCH_TXT: "searchTxt",
  CONTENT_BODY: "contentBody",
  DESCRIPTION_TEMPLATES: "descriptionTemplates",
  PRODUCT_DEFAULTS: "productDefaults",
  /* Dot-path, so a referrer query is one equality and needs no index. */
  PRODUCT_DEFAULTS_TAX_CODE_ID: "productDefaults.taxCodeId",
  CATEGORY_TYPE: "categoryType",
  CREATED_BY: "createdBy",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  ANCESTORS: "ancestors",
} as const;

/**
 * Build a category tree from a flat list of CategoryDocument objects.
 *
 * 🛑 ONE INDEXING PASS, then recursion — not a `.filter()` per node.
 * This used to scan the whole array once per category to find its children,
 * which is O(n²): 2,209 comparisons at today's 47 nodes, ~109,000 at the ~330
 * this plan seeds, and **2.25 million** at 1,500. It runs inside
 * `categoriesRepository.buildTree()`, i.e. on a request path. Grouping by
 * parent id first makes it O(n log n) (the sorts) and the output is
 * byte-identical: same roots, same child order, same depths.
 *
 * 🛑 The `seen` set is not defensive padding. A root is picked by
 * `tier === 0`, and nothing stops a corrupt row from being tier 0 *and* a
 * descendant of its own child (`parentIds` is a denormalised chain that four
 * different write paths maintain). The old code would recurse forever on that,
 * and a hung SSR render is worse than a failed one — it holds a function open
 * for its whole timeout and reports nothing. A revisited node is dropped from
 * the second position it appears in rather than throwing: a malformed edge
 * should cost one tile, not the category page.
 */
export function buildCategoryTree(
  categories: CategoryDocument[],
  rootId?: string,
): CategoryTreeNode[] {
  const byParent = new Map<string, CategoryDocument[]>();
  for (const cat of categories) {
    const parentId = cat.parentIds[cat.parentIds.length - 1];
    if (!parentId) continue;
    const bucket = byParent.get(parentId);
    if (bucket) bucket.push(cat);
    else byParent.set(parentId, [cat]);
  }
  for (const bucket of byParent.values()) bucket.sort((a, b) => a.order - b.order);

  const seen = new Set<string>();

  function buildTree(
    category: CategoryDocument,
    depth: number,
  ): CategoryTreeNode {
    seen.add(category.id);
    const children = (byParent.get(category.id) ?? [])
      .filter((child) => !seen.has(child.id))
      .map((child) => buildTree(child, depth + 1));

    return { category, children, depth };
  }

  const roots = rootId
    ? categories.filter((cat) => cat.rootId === rootId && cat.tier === 0)
    : categories.filter((cat) => cat.tier === 0);

  return roots
    .sort((a, b) => a.order - b.order)
    .map((root) => buildTree(root, 0));
}
