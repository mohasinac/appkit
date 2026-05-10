/**
 * Sub-listing Categories — Firestore schema
 *
 * A sub-listing category is a named bucket that groups independent listings of the
 * same real-world collectible across conditions, grades, prices, and sellers.
 * Each listing stays a full product/auction/pre-order — the category is just the
 * thread linking them (e.g. "Base Set Charizard 108/120").
 */

export const SUBLISTING_CATEGORIES_COLLECTION = "sublistingCategories" as const;

export const SUBLISTING_CATEGORY_PREFIX = "sublisting-" as const;

export interface SublistingCategoryDocument {
  id: string;
  slug: string;
  name: string;
  /** Card set code or grade label, e.g. "108/120", "PSA 10" */
  itemCode?: string;
  description?: string;
  /** /media/<slug> proxy URL */
  coverImage?: string;
  /** Denormalised count — updated on member add/remove */
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type SublistingCategoryCreateInput = Omit<
  SublistingCategoryDocument,
  "id" | "productCount" | "createdAt" | "updatedAt"
>;

export type SublistingCategoryUpdateInput = Partial<
  Pick<
    SublistingCategoryDocument,
    "name" | "itemCode" | "description" | "coverImage"
  >
>;

export const SUBLISTING_CATEGORY_SIEVE_FIELDS = {
  name: { canFilter: true, canSort: true },
  slug: { canFilter: true, canSort: false },
  productCount: { canFilter: false, canSort: true },
  createdAt: { canFilter: false, canSort: true },
} as const;
