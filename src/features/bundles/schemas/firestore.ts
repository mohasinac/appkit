/**
 * Bundle Firestore schemas (SB1-E — S19 2026-05-12).
 *
 * A bundle groups 3–16 existing products into a single sellable unit with a
 * bundle price (typically lower than the sum of item prices). Bundle items
 * keep their original product docs; the bundle doc references them via
 * `bundleItems[].productId` and the products gain a reverse pointer via
 * `partOfBundleIds[]` on `ProductDocument` (added in SB1-B same session).
 *
 * Stored at top-level `bundles/{bundle-slug}` collection (matches `BUNDLES_COLLECTION`).
 * id === slug convention, `bundle-` prefix enforced.
 *
 * This is additive: no existing code consumes BundleDocument yet. Repository
 * methods, API routes, and views land in subsequent SB sessions (S20+).
 */

export const BUNDLES_COLLECTION = "bundles" as const;

export type BundleStatus =
  | "draft"
  | "published"
  | "out_of_stock"
  | "archived";

/**
 * Bundles are restricted to homogeneous listing types — either all-standard
 * or all-preorder. Mixing auctions/prize-draws into bundles is intentionally
 * disallowed (the price + quantity semantics don't compose cleanly).
 */
export type BundleItemListingType = "standard" | "pre-order";

export interface BundleItem {
  productId: string;
  productSlug: string;
  title: string;
  listingType: BundleItemListingType;
  images: string[];
  video?: { url: string; thumbnailUrl?: string };
  /** Per-unit price at the time the bundle was assembled (paise). */
  price: number;
  quantity: number;
  /**
   * True when this specific line item in the bundle has been fulfilled or
   * its underlying product moved to a non-sellable state. Bundle-level
   * `status` flips to `out_of_stock` once any item flips.
   */
  isSold: boolean;
}

export interface BundleDocument {
  id: string;
  slug: string;
  title: string;
  description?: string;
  storeId: string;
  storeName: string;
  status: BundleStatus;
  /** Must equal every `bundleItems[].listingType` — enforced by SB1-C Zod. */
  bundleItemType: BundleItemListingType;
  bundleItems: BundleItem[];
  /** Discounted bundle price (paise) — the actual sale price. */
  bundlePrice: number;
  /** Sum of `bundleItems[].price * quantity` at assembly time (paise). */
  bundleOriginalTotal: number;
  currency: "INR";

  // Discovery + filtering
  category?: string;
  categorySlug?: string;
  subcategory?: string;
  sublistingCategoryId?: string;
  brandSlug?: string;
  tags?: string[];
  images?: string[];
  video?: { url: string; thumbnailUrl?: string };

  // Limits + promotion
  maxPerUser?: number;
  isFeatured?: boolean;
  isPromoted?: boolean;

  /**
   * Reverse-derived list of `productId`s that are members of this bundle.
   * Duplicates `bundleItems[].productId` for index-friendly queries; kept in
   * sync by the bundles repository on write.
   */
  partOfBundleProductIds: string[];

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Indexed fields for Firestore composite indexes. Wired into
 * `appkit/firebase/base/firestore.indexes.json` in a later SB session.
 */
export const BUNDLE_INDEXED_FIELDS = [
  "storeId",
  "status",
  "categorySlug",
  "brandSlug",
  "isFeatured",
  "isPromoted",
  "createdAt",
] as const;
