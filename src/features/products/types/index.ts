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
export type ListingType = "fixed" | "standard" | "auction" | "pre-order";

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
  listingType?: ListingType;
  isAuction?: boolean;
  isPreOrder?: boolean;
  sublistingCategoryId?: string;
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
  isAuction?: boolean;
  isPreOrder?: boolean;
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
