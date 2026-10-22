// --- Coupon types -------------------------------------------------------------

export type CouponType =
  | "percentage"
  | "fixed"
  | "free_shipping"
  | "buy_x_get_y"
  /**
   * D51 — a coupon that awards POINTS rather than discounting the order.
   *
   * 🛑 It carries `pointsPercent`, not a discount value, and it must never
   * reach the discount arithmetic: a `points_earn` coupon with a `discount`
   * field read by `computeGroupCouponDiscount` would silently discount the
   * order as well as award points.
   *
   * It exists because `RIPLI05` is a PERMANENT, site-wide coupon, and
   * `detectCouponConflict` permits exactly one admin coupon site-wide — so
   * putting it in the admin slot would make every other platform coupon
   * unusable for as long as it exists. It gets its own stacking bucket.
   *
   * Adding it here is a compile error at `COUPON_TYPE_LABELS`, which is a
   * `Record<CouponType, string>` — that is the point of declaring the union
   * first.
   */
  | "points_earn";
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
  storeId?: string;
  page?: number;
  pageSize?: number;
  filters?: string;
  sort?: string;
}
