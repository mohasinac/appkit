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

  metrics: CategoryDocumentMetrics;

  isFeatured: boolean;
  featuredPriority?: number;
  isBrand?: boolean;

  seo: CategoryDocumentSEO;
  display: CategoryDocumentDisplay;

  isActive: boolean;
  isSearchable: boolean;
  showOnHomepage?: boolean;

  createdBy: string;
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
  "isActive",
  "isSearchable",
  "showOnHomepage",
  "createdBy",
  "createdAt",
] as const;

export const MIN_ITEMS_FOR_FEATURED = 8 as const;
export const MAX_FEATURED_CATEGORIES = 4 as const;

export const DEFAULT_CATEGORY_DATA: Partial<CategoryDocument> = {
  childrenIds: [],
  isLeaf: true,
  order: 0,
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
  brands: () => ["isBrand", "==", true] as const,
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
