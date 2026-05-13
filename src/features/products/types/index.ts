import type { MediaField } from "../../media/types/index";
import type { CustomField, CustomSection } from "../schemas/firestore";
export type { CustomField, CustomSection } from "../schemas/firestore";

export type ProductStatus =
  | "draft"
  | "published"
  | "archived"
  | "sold"
  | "out_of_stock"
  | "discontinued";
export type ProductCondition =
  | "new"
  | "like_new"
  | "good"
  | "fair"
  | "poor"
  | "used"
  | "refurbished"
  | "broken";
/**
 * Canonical listing-kind discriminator (SB1-G Phase 4).
 *
 * Set on every `ProductDocument` / `ProductItem` at creation. The Sieve adapter
 * accepts legacy alias tokens (`preorder` → `pre-order`, `product` → `standard`)
 * but stored values are always one of these five.
 */
// SB-UNI-D — "bundle" dropped from the ListingType union; bundles are now
// a categoryType discriminator on CategoryDocument. Cart/order/product
// records no longer carry a "bundle" listingType value.
// SB-UNI-F 2026-05-13 — additive extension: classified | digital-code | live.
// Capability registry decides whether cart accepts each type. Classified is
// chat-only (canAddToCart=false). Digital-code skips shipping address +
// instant-fulfills. Live requires vendor verification + jurisdiction check.
export type ListingType =
  | "standard"
  | "auction"
  | "pre-order"
  | "prize-draw"
  | "classified"
  | "digital-code"
  | "live";

export interface ProductImage {
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  order?: number;
}

export interface ProductSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ProductItem {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  mainImage?: string;
  images?: string[];
  media?: MediaField[];
  video?: { url: string; thumbnailUrl?: string };
  featured?: boolean;
  isPromoted?: boolean;
  currentBid?: number;
  availableQuantity?: number;
  category?: string;
  categoryName?: string;
  categorySlug?: string;
  sellerAvatar?: string;
  status: ProductStatus;
  condition?: ProductCondition;
  /** Canonical listing-kind discriminator (SB1-G Phase 4 — booleans removed). */
  listingType?: ListingType;
  /** Reverse refs maintained by the bundles repository (SB3) — IDs of every
   * bundle whose `bundleItems[]` includes this product. Powers the "In bundle"
   * badge on cards (SB7-A) + detail pages (SB7-B). */
  partOfBundleIds?: string[];
  /** Parallel array of titles — same length + index as `partOfBundleIds`. */
  partOfBundleTitles?: string[];
  sublistingCategoryId?: string;
  groupId?: string;
  isGroupParent?: boolean;
  groupParentSlug?: string;
  groupChildSlugs?: string[];
  groupTitle?: string;
  isOnSale?: boolean;
  isSold?: boolean;
  inStock?: boolean;
  stockCount?: number;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  attributes?: Record<string, string>;
  seo?: ProductSeo;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;

  // Detail fields
  stockQuantity?: number;
  subcategory?: string;
  brand?: string;
  brandSlug?: string;
  /** "single" = one brand, "unbranded" = no brand (filter won't match), "mixed" = multiple brands */
  brandMode?: "single" | "unbranded" | "mixed";
  /** Brand names for mixed-brand items */
  brands?: string[];
  storeId?: string;
  storeName?: string;
  specifications?: { name: string; value: string; unit?: string }[];
  features?: string[];
  shippingInfo?: string;
  returnPolicy?: string;
  ingredients?: string[];
  howToUse?: string[];
  allowOffers?: boolean;
  minOfferPercent?: number;
  bulkDiscounts?: { quantity: number; discountPercent: number }[];

  // Auction detail fields
  startingBid?: number;
  bidCount?: number;
  auctionEndDate?: string | Date;
  reservePrice?: number;
  buyNowPrice?: number;
  minBidIncrement?: number;
  autoExtendable?: boolean;
  auctionExtensionMinutes?: number;
  auctionShippingPaidBy?: "seller" | "winner";

  // Pre-order detail fields
  preOrderDeliveryDate?: string | Date;
  preOrderDepositPercent?: number;
  preOrderDepositAmount?: number;
  preOrderMaxQuantity?: number;
  preOrderCurrentCount?: number;
  preOrderProductionStatus?: "upcoming" | "in_production" | "ready_to_ship";
  preOrderCancellable?: boolean;

  // Prize-draw detail fields (SB4)
  prizeDrawItems?: import("../schemas/firestore").PrizeDrawItem[];
  pricePerEntry?: number;
  prizeMaxEntries?: number;
  prizeCurrentEntries?: number;
  prizeRevealWindowStart?: string | Date;
  prizeRevealWindowEnd?: string | Date;
  prizeRevealStatus?: "pending" | "open" | "closed";
  prizeRevealDeadlineDays?: number;
  prizeGithubFileUrl?: string;

  // SB1-B — hard cap on units a single user may purchase (bundle / prize-draw / pre-order)
  maxPerUser?: number;

  /** Winner's display name for ended auctions — shown masked in public UI */
  winnerDisplayName?: string;

  // Analytics
  viewCount?: number;
  avgRating?: number;

  // Shipping
  shippingPaidBy?: "seller" | "buyer";
  pickupAddressId?: string;
  insurance?: boolean;
  insuranceCost?: number;

  // Custom fields & sections (L1–L3)
  customFields?: CustomField[];
  customSections?: CustomSection[];
}

export interface ProductListResponse {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  /** Set when the query fell back to an empty result due to a DB error (index missing, permission denied). */
  warning?: string;
}

export interface ProductListParams {
  q?: string;
  category?: string;
  categorySlug?: string;
  status?: ProductStatus;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  /** Canonical listing-kind discriminator (SB1-G Phase 4). */
  listingType?: ListingType;
  storeId?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  featured?: boolean;
  /** Auction-specific: current bid range */
  minBid?: number;
  maxBid?: number;
  /** Auction: end date range / Pre-order: delivery date range */
  dateFrom?: string;
  dateTo?: string;
  /** Pre-order production status */
  preOrderProductionStatus?: "upcoming" | "in_production" | "ready_to_ship";
  /** Filter by brand name */
  brand?: string;
  /** Shipping / free shipping */
  freeShipping?: boolean;
}
