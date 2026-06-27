export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
  productCurrency?: string;
  productSlug?: string;
  productStatus?: string;
  addedAt?: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}

/** Shape of the product data the GET /api/user/wishlist endpoint attaches via Promise.allSettled enrichment. */
export interface WishlistProductData {
  slug?: string;
  title?: string;
  price?: number;
  currency?: string;
  images?: string[];
  status?: "draft" | "published" | "in_review" | "archived";
  isFeatured?: boolean;
  /** Canonical listing-kind discriminator (SB1-G Phase 4). */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "classified" | "digital-code" | "live"; // audit-listing-type-inline-ok: pre-existing inline union; pending import of ListingType from products/types
}

/** WishlistItem enriched with inline product details returned by the wishlist GET endpoint. */
export interface EnrichedWishlistItem extends WishlistItem {
  product?: WishlistProductData;
}
