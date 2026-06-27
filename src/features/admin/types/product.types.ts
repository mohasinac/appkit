/**
 * Admin-specific product types for product management UI.
 *
 * These types extend/complement the core ProductItem with admin-only fields
 * for managing auctions, pre-orders, stock, pricing, and lifecycle.
 */

export type AdminProductStatus =
  | "draft"
  | "published"
  | "in_review"
  | "archived";

export type AdminProductDrawerMode = "create" | "edit" | "delete" | null;

/**
 * Admin product form/management type.
 *
 * Combines core product data with admin-specific fields for:
 * - Auction management (starting bid, reserve, auto-extend)
 * - Pre-order management (delivery date, deposit %)
 * - Promotion and pricing
 * - Stock and shipping
 */
export interface AdminProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId?: string;
  subcategory?: string;
  brand?: string;
  price: number;
  currency: string;
  stockQuantity: number;
  availableQuantity: number;
  mainImage: string;
  images: string[];
  video?: {
    url: string;
    thumbnailUrl: string;
    duration?: number;
    trimStart?: number;
    trimEnd?: number;
  };
  status: AdminProductStatus;
  storeId?: string;
  storeName?: string;
  featured: boolean;
  tags: string[];
  shippingInfo?: string;
  returnPolicy?: string;
  condition?: "new" | "used" | "refurbished" | "broken";
  insurance?: boolean;
  insuranceCost?: number;
  shippingPaidBy?: "seller" | "buyer";
  /** Canonical listing-kind discriminator (SB1-G Phase 4 â€” booleans removed). */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "classified" | "digital-code" | "live"; // audit-listing-type-inline-ok: pre-existing inline union; pending import of ListingType from products/types
  // Auction fields
  auctionEndDate?: string;
  startingBid?: number;
  currentBid?: number;
  bidCount?: number;
  reservePrice?: number;
  buyNowPrice?: number;
  minBidIncrement?: number;
  autoExtendable?: boolean;
  auctionExtensionMinutes?: number;
  auctionOriginalEndDate?: string;
  auctionShippingPaidBy?: "seller" | "winner";
  // Promotion fields
  isPromoted?: boolean;
  promotionEndDate?: string;
  pickupAddressId?: string;
  // Pre-order fields
  preOrderDeliveryDate?: string; // ISO date string â€” ETA for delivery
  preOrderDepositPercent?: number;
  preOrderMaxQuantity?: number;
  preOrderProductionStatus?: "upcoming" | "in_production" | "ready_to_ship";
  preOrderCancellable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ADMIN_PRODUCT_STATUS_OPTIONS: {
  value: AdminProductStatus;
  label: string;
}[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "in_review", label: "In Review" },
  { value: "archived", label: "Archived" },
];
