export type {
  ProductStatus,
  ProductCondition,
  ListingType,
  ProductItem,
  ProductListResponse,
  ProductListParams,
  ProductImage,
  ProductSeo,
} from "../../../../features/products/types/index";

export type {
  ProductDocument,
  CustomField,
  CustomSection,
  ProductSpecification,
} from "../../../../features/products/schemas/firestore";

export type { ProductFeatureDocument } from "../../../../features/products/schemas/product-features";

/** Serializable shape passed from server page → client view as initialData. */
export interface ProductDetailInitial {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  price: number;
  currency: string;
  mainImage: string;
  images: string[];
  status: string;
  storeId: string;
  storeName?: string;
  featured: boolean;
  tags: string[];
  condition?: string;
  /** Canonical listing-kind discriminator (SB1-G — Phase 4 dropped legacy booleans). */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw";
  auctionEndDate?: string;
  startingBid?: number;
  currentBid?: number;
  bidCount?: number;
  reservePrice?: number;
  buyNowPrice?: number;
  minBidIncrement?: number;
  autoExtendable?: boolean;
  preOrderDeliveryDate?: string;
  preOrderDepositPercent?: number;
  preOrderMaxQuantity?: number;
  preOrderCurrentCount?: number;
  preOrderProductionStatus?: string;
  allowOffers?: boolean;
  availableQuantity: number;
  stockQuantity: number;
  avgRating?: number;
  reviewCount?: number;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
}
