/**
 * Grouped Listings Firestore Document Types & Constants
 *
 * SB-UNI-V re-scoped this from a "bundle-like" pricing construct (with
 * `bundlePrice` / `originalPrice` / `discountPercent`) to a **theme group**
 * — a horizontal scroller that links related listings on the detail page
 * without any pricing semantics. Pricing-aware bundles now live on the
 * categories collection with `categoryType:"bundle"` (SB-UNI-D).
 *
 * A grouped listing survives partial sellout: when the count of currently-
 * active members drops below `minActiveMembers`, `visibilityStatus` flips
 * to "hidden" (recomputed by `onProductStockChange`).
 */

export type GroupTheme =
  /** "Other anime figures you might like" */
  | "related"
  /** "Same character across multiple lines" */
  | "character"
  /** "All HG kits in this lineage" */
  | "lineage"
  /** "From the same set / wave / drop" */
  | "set"
  /** Default / unspecified theme */
  | "generic";

export type GroupVisibility = "visible" | "hidden";

export interface GroupedListingDocument {
  id: string;
  slug: string;
  title: string;
  description?: string;
  productIds: string[];
  coverImage?: string;
  /** SB-UNI-V — semantic label for the group (drives section heading copy). */
  groupTheme: GroupTheme;
  /** Hide the group if fewer than this many members are active. Default 2. */
  minActiveMembers: number;
  /** Count of currently-active members. Maintained by onProductStockChange. */
  activeMemberCount: number;
  /** Computed from activeMemberCount < minActiveMembers. */
  visibilityStatus: GroupVisibility;
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
  "groupTheme",
  "visibilityStatus",
  "createdAt",
] as const;
