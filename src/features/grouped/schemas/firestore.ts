/**
 * Grouped Listings Firestore Document Types & Constants
 *
 * A grouped listing bundles multiple products together, optionally at a
 * discounted bundle price. Standard products and pre-orders only — auctions
 * are excluded per GP1 spec. Displayed as a horizontal scroller of circular
 * thumbnail cards between the buy-box and the TABS row on the detail page.
 *
 * Used in Session 86 (GP1–GP2).
 */

export interface GroupedListingDocument {
  id: string;
  slug: string;
  title: string;
  description?: string;
  productIds: string[];
  coverImage?: string;
  bundlePrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  currency: "INR";
  isActive: boolean;
  isFeatured: boolean;
  storeId?: string;
  brandSlug?: string;
  categorySlug?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const GROUPED_LISTINGS_COLLECTION = "groupedListings" as const;

export const GROUPED_LISTINGS_INDEXED_FIELDS = [
  "storeId",
  "brandSlug",
  "categorySlug",
  "isActive",
  "isFeatured",
  "createdAt",
] as const;
