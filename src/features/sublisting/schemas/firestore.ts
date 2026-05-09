/**
 * Sublisting Categories Firestore Document Types & Constants
 *
 * Sublisting categories are curated sub-collections within a root/leaf category.
 * Examples: "Base Set (102/102)" within Trading Cards, "Vintage Redlines 1968–1977"
 * within Diecast Vehicles. Products are associated via SublistingCategoryDocument.productIds
 * OR via `sublistingCategoryId` on the product document.
 *
 * Used in Session 85 (SC1–SC4).
 */

export interface SublistingCategoryDocument {
  id: string;
  slug: string;
  title: string;
  parentCategorySlug: string;
  rootCategorySlug: string;
  description?: string;
  coverImage?: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  productCount: number;
  productIds?: string[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SUBLISTING_CATEGORIES_COLLECTION = "sublistingCategories" as const;

export const SUBLISTING_CATEGORIES_INDEXED_FIELDS = [
  "parentCategorySlug",
  "rootCategorySlug",
  "isActive",
  "isFeatured",
  "sortOrder",
  "createdAt",
] as const;
