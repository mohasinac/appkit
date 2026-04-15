/**
 * Coupons/Promotions Firestore Document Types & Constants
 */

import { generateCouponId } from "../../../utils/id-generators";
import type { CouponType } from "../types";

export interface DiscountConfig {
  value: number;
  maxDiscount?: number;
  minPurchase?: number;
}

export interface BXGYConfig {
  buyQuantity: number;
  getQuantity: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

export interface TieredDiscount {
  minAmount: number;
  discountValue: number;
}

export interface UsageConfig {
  totalLimit?: number;
  perUserLimit?: number;
  currentUsage: number;
}

export interface ValidityConfig {
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface RestrictionsConfig {
  applicableProducts?: string[];
  applicableCategories?: string[];
  applicableSellers?: string[];
  excludeProducts?: string[];
  excludeCategories?: string[];
  firstTimeUserOnly: boolean;
  combineWithSellerCoupons: boolean;
}

export interface CouponStats {
  totalUses: number;
  totalRevenue: number;
  totalDiscount: number;
}

export interface CouponDocument {
  id: string;
  code: string;
  name: string;
  description: string;
  type: CouponType;
  scope: "admin" | "seller";
  sellerId?: string;
  storeSlug?: string;
  applicableToAuctions?: boolean;
  discount: DiscountConfig;
  bxgy?: BXGYConfig;
  tiers?: TieredDiscount[];
  usage: UsageConfig;
  validity: ValidityConfig;
  restrictions: RestrictionsConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  stats: CouponStats;
}

export interface CouponUsageDocument {
  id: string;
  userId: string;
  couponCode: string;
  usageCount: number;
  lastUsedAt: Date;
  orders: string[];
}

export const COUPONS_COLLECTION = "coupons" as const;
export const COUPON_USAGE_SUBCOLLECTION = "couponUsage" as const;

export const COUPONS_INDEXED_FIELDS = [
  "code",
  "validity.isActive",
  "validity.startDate",
  "validity.endDate",
  "type",
  "createdBy",
] as const;

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  percentage: "Percentage Discount",
  fixed: "Fixed Amount Discount",
  free_shipping: "Free Shipping",
  buy_x_get_y: "Buy X Get Y",
};

export const DEFAULT_COUPON_DATA: Partial<CouponDocument> = {
  usage: { currentUsage: 0 },
  validity: { isActive: false, startDate: new Date(), endDate: undefined },
  restrictions: { firstTimeUserOnly: false, combineWithSellerCoupons: false },
  stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
};

export const COUPONS_PUBLIC_FIELDS = [
  "id",
  "code",
  "name",
  "description",
  "type",
  "discount",
  "validity.startDate",
  "validity.endDate",
  "usage.totalLimit",
  "usage.perUserLimit",
] as const;

export const COUPONS_UPDATABLE_FIELDS = [
  "name",
  "description",
  "discount",
  "bxgy",
  "tiers",
  "usage",
  "validity",
  "restrictions",
] as const;

export type CouponCreateInput = Omit<
  CouponDocument,
  "id" | "createdAt" | "updatedAt" | "stats"
> & {
  stats?: Partial<CouponStats>;
};

export type CouponUpdateInput = Partial<
  Pick<
    CouponDocument,
    | "name"
    | "description"
    | "discount"
    | "bxgy"
    | "tiers"
    | "usage"
    | "validity"
    | "restrictions"
    | "applicableToAuctions"
  >
>;

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  error?: string;
  message?: string;
}

export const couponQueryHelpers = {
  byCode: (code: string) => ["code", "==", code.toUpperCase()] as const,
  active: () => ["validity.isActive", "==", true] as const,
  inactive: () => ["validity.isActive", "==", false] as const,
  byType: (type: CouponType) => ["type", "==", type] as const,
  byCreator: (userId: string) => ["createdBy", "==", userId] as const,
  expiringSoon: (days = 7) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return ["validity.endDate", "<=", futureDate] as const;
  },
} as const;

export function createCouponId(code: string): string {
  return generateCouponId(code);
}

export function isValidCouponCode(code: string): boolean {
  const regex = /^[A-Z0-9][A-Z0-9-]{2,28}[A-Z0-9]$|^[A-Z0-9]{4,20}$/;
  return regex.test(code) && !code.startsWith("-") && !code.endsWith("-");
}

export function sellerCouponCodePrefix(storeSlug: string): string {
  return storeSlug.replace(/-/g, "").toUpperCase().slice(0, 10);
}

export function buildSellerCouponCode(
  storeSlug: string,
  sellerCode: string,
): string {
  return `${sellerCouponCodePrefix(storeSlug)}-${sellerCode.toUpperCase()}`;
}

export function isCouponValid(coupon: CouponDocument): boolean {
  const now = new Date();
  const startDate = new Date(coupon.validity.startDate);
  const endDate = coupon.validity.endDate
    ? new Date(coupon.validity.endDate)
    : null;
  return (
    coupon.validity.isActive &&
    startDate <= now &&
    (!endDate || endDate >= now) &&
    (coupon.usage.totalLimit === undefined ||
      coupon.usage.currentUsage < coupon.usage.totalLimit)
  );
}

export function canUserUseCoupon(
  coupon: CouponDocument,
  userUsageCount: number,
): boolean {
  if (!isCouponValid(coupon)) return false;
  if (coupon.usage.perUserLimit === undefined) return true;
  return userUsageCount < coupon.usage.perUserLimit;
}

export function calculateDiscount(
  coupon: CouponDocument,
  orderTotal: number,
): number {
  if (coupon.discount.minPurchase && orderTotal < coupon.discount.minPurchase)
    return 0;
  let discountAmount = 0;
  switch (coupon.type) {
    case "percentage":
      discountAmount = (orderTotal * coupon.discount.value) / 100;
      if (
        coupon.discount.maxDiscount &&
        discountAmount > coupon.discount.maxDiscount
      ) {
        discountAmount = coupon.discount.maxDiscount;
      }
      break;
    case "fixed":
      discountAmount = Math.min(coupon.discount.value, orderTotal);
      break;
    case "free_shipping":
    case "buy_x_get_y":
      discountAmount = 0;
      break;
  }
  return discountAmount;
}

export function getTieredDiscount(
  tiers: TieredDiscount[] | undefined,
  orderTotal: number,
): number {
  if (!tiers || tiers.length === 0) return 0;
  const sortedTiers = [...tiers].sort((a, b) => b.minAmount - a.minAmount);
  for (const tier of sortedTiers) {
    if (orderTotal >= tier.minAmount) return tier.discountValue;
  }
  return 0;
}
