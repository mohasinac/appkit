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
 * `listingType === "prize-draw"`. Represents how many draw entries
 * the buyer receives for that product when they purchase the bundle
 * (e.g. drawCount=5 means 5 raffle entries, not 5 copies of the draw).
 */
export interface BundleItemDetail {
  productId: string;
  /** Number of draw entries included when product is a prize-draw. */
  drawCount?: number;
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

export interface CategoryDocument {
  id: string;
  name: string;
  slug: string;
  description?: string;

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
  /** Banner image for the brand storefront page — categoryType==="brand". */
  brandBannerImage?: string;

  // ── Bundle fields — categoryType==="bundle" (SB-UNI-D) ────────────────
  /**
   * "special" — admin-curated bundle; writes reverse `partOfBundleIds`
   * pointers on member products and shows the "Bundled" badge on cards.
   *
   * "brand" — auto-generated brand collection (dynamic brandSlug query).
   * Does NOT update `partOfBundleIds`; used as a discovery surface only.
   */
  bundleKind?: "special" | "brand";
  /** Discounted bundle price in paise. */
  bundlePriceInPaise?: number;
  /** Rule resolving the bundle's member products — static list or live query. */
  bundleQueryRule?: BundleQueryRule;
  /** Snapshot stock state — recomputed by onProductStockChange. */
  bundleStockStatus?: "in_stock" | "out_of_stock";
  /** Timestamp of the last dynamic-rule resolution. */
  bundleQueryResolvedAt?: Date;
  /** Hand-picked products list (mirror of bundleQueryRule for static rules); kept for index-friendly queries. */
  bundleProductIds?: string[];
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

  createdBy: string;
  /** Whether this category was created by admin or a store owner. */
  createdByType?: "admin" | "store";
  /** The storeId of the store that requested this category (only set when createdByType === "store"). */
  createdByStoreId?: string;
  /** Display name of the store that requested this category. */
  createdByStoreName?: string;
  createdAt: Date;
  updatedAt: Date;

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
  IS_ACTIVE: "isActive",
  IS_SEARCHABLE: "isSearchable",
  CREATED_BY: "createdBy",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  ANCESTORS: "ancestors",
} as const;

/**
 * Build a category tree from a flat list of CategoryDocument objects.
 */
export function buildCategoryTree(
  categories: CategoryDocument[],
  rootId?: string,
): CategoryTreeNode[] {
  function buildTree(
    category: CategoryDocument,
    depth: number,
  ): CategoryTreeNode {
    const children = categories
      .filter((cat) => cat.parentIds[cat.parentIds.length - 1] === category.id)
      .sort((a, b) => a.order - b.order)
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
