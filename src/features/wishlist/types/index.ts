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
  status?: "draft" | "published" | "archived" | "sold" | "out_of_stock" | "discontinued";
  isFeatured?: boolean;
  /**
   * Canonical listing-kind discriminator (SB1-G). Consumers should branch on
   * this; the boolean fallbacks below remain optional during the additive
   * migration so older payloads still deserialise.
   */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "bundle";
  /** @deprecated SB1-G — read via `isAuctionListing(p)`. */
  isAuction?: boolean;
  /** @deprecated SB1-G — read via `isPreOrderListing(p)`. */
  isPreOrder?: boolean;
}

/** WishlistItem enriched with inline product details returned by the wishlist GET endpoint. */
export interface EnrichedWishlistItem extends WishlistItem {
  product?: WishlistProductData;
}
