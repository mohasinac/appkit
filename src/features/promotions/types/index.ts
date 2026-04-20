// --- Coupon types -------------------------------------------------------------

export type CouponType =
  | "percentage"
  | "fixed"
  | "free_shipping"
  | "buy_x_get_y";
export type CouponScope = "admin" | "seller";

export interface CouponItem {
  id: string;
  code: string;
  name: string;
  description: string;
  type: CouponType;
  scope: CouponScope;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxUsageCount?: number;
  usageCount: number;
  perUserLimit?: number;
  buyQuantity?: number;
  getQuantity?: number;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  sellerId?: string;
  storeId?: string;
  isPublic: boolean;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Apply coupon result ------------------------------------------------------

export interface ApplyCouponResult {
  valid: boolean;
  coupon?: CouponItem;
  discountAmount: number;
  message?: string;
}

// --- List response ------------------------------------------------------------

export interface PromotionsListResponse {
  items: CouponItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PromotionsListParams {
  scope?: CouponScope;
  isActive?: boolean;
  sellerId?: string;
  page?: number;
  pageSize?: number;
  filters?: string;
  sort?: string;
}
