import type { MediaField } from "../../media/types/index.js";

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
  sellerId?: string;
  sellerName?: string;
  sellerAvatar?: string;
  status: ProductStatus;
  condition?: ProductCondition;
  listingType?: ListingType;
  isAuction?: boolean;
  isPreOrder?: boolean;
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
  storeId?: string;
  sellerEmail?: string;
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

  // Analytics
  viewCount?: number;
  avgRating?: number;

  // Shipping
  shippingPaidBy?: "seller" | "buyer";
  pickupAddressId?: string;
  insurance?: boolean;
  insuranceCost?: number;
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
  status?: ProductStatus;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isAuction?: boolean;
  sellerId?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  featured?: boolean;
}
