/**
 * Admin-specific product types for product management UI.
 *
 * These types extend/complement the core ProductItem with admin-only fields
 * for managing auctions, pre-orders, stock, pricing, and lifecycle.
 */

export type AdminProductStatus =
  | "draft"
  | "published"
  | "out_of_stock"
  | "discontinued"
  | "sold";

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
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  featured: boolean;
  tags: string[];
  shippingInfo?: string;
  returnPolicy?: string;
  condition?: "new" | "used" | "refurbished" | "broken";
  insurance?: boolean;
  insuranceCost?: number;
  shippingPaidBy?: "seller" | "buyer";
  // Auction fields
  isAuction?: boolean;
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
  isPreOrder?: boolean;
  preOrderDeliveryDate?: string; // ISO date string — ETA for delivery
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
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "discontinued", label: "Discontinued" },
  { value: "sold", label: "Sold" },
];
