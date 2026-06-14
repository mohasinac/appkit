export * from "./firestore";
import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema, paiseSchema } from "../../../schemas/firestore-helpers";

// ─── Firestore document schemas (W2) ──────────────────────────────────────────
// Mirrors CouponDocument + CouponUsageDocument + ClaimedCouponDocument in
// ./firestore.ts. Registered into:
//   SCHEMAS.firestore.coupons
//   SCHEMAS.firestore.couponUsage
//   SCHEMAS.firestore.claimedCoupons

export const couponTypeEnumSchema = z.enum([
  "percentage",
  "fixed",
  "free_shipping",
  "buy_x_get_y",
]);

export const discountConfigSchema = z.object({
  value: z.number(),
  maxDiscount: paiseSchema.optional(),
  minPurchase: paiseSchema.optional(),
});

export const bxgyConfigSchema = z.object({
  buyQuantity: z.number().int().positive(),
  getQuantity: z.number().int().positive(),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
});

export const tieredDiscountSchema = z.object({
  minAmount: paiseSchema,
  discountValue: z.number(),
});

export const usageConfigSchema = z.object({
  totalLimit: z.number().int().nonnegative().optional(),
  perUserLimit: z.number().int().nonnegative().optional(),
  currentUsage: z.number().int().nonnegative(),
});

export const validityConfigSchema = z.object({
  startDate: firestoreDateSchema,
  endDate: firestoreDateSchema.optional(),
  isActive: z.boolean(),
});

export const restrictionsConfigSchema = z.object({
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  applicableSellers: z.array(z.string()).optional(),
  excludeProducts: z.array(z.string()).optional(),
  excludeCategories: z.array(z.string()).optional(),
  firstTimeUserOnly: z.boolean(),
  combineWithSellerCoupons: z.boolean(),
});

export const couponStatsSchema = z.object({
  totalUses: z.number().int().nonnegative(),
  totalRevenue: paiseSchema,
  totalDiscount: paiseSchema,
});

export const couponFirestoreSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  type: couponTypeEnumSchema,
  scope: z.enum(["admin", "seller"]),
  storeId: z.string().optional(),
  applicableToAuctions: z.boolean().optional(),
  discount: discountConfigSchema,
  bxgy: bxgyConfigSchema.optional(),
  tiers: z.array(tieredDiscountSchema).optional(),
  usage: usageConfigSchema,
  validity: validityConfigSchema,
  restrictions: restrictionsConfigSchema,
  createdBy: z.string(),
  stats: couponStatsSchema,
  ...auditTimestampsShape,
});

export const couponUsageFirestoreSchema = z.object({
  id: z.string(),
  userId: z.string(),
  couponCode: z.string(),
  usageCount: z.number().int().nonnegative(),
  lastUsedAt: firestoreDateSchema,
  orders: z.array(z.string()),
});

export const claimedCouponStatusSchema = z.enum(["active", "expired", "used"]);
export const claimedCouponSourceSchema = z.enum([
  "manual",
  "promo",
  "spin",
  "raffle",
  "prize-draw",
]);

export const claimedCouponSnapshotSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: couponTypeEnumSchema,
  scope: z.enum(["admin", "seller"]),
  storeId: z.string().optional(),
  discount: discountConfigSchema,
  restrictions: restrictionsConfigSchema,
});

export const claimedCouponFirestoreSchema = z.object({
  id: z.string(),
  userId: z.string(),
  couponId: z.string(),
  couponCode: z.string(),
  source: claimedCouponSourceSchema,
  couponSnapshot: claimedCouponSnapshotSchema,
  status: claimedCouponStatusSchema,
  expiresAt: firestoreDateSchema.nullable().optional(),
  usedAt: firestoreDateSchema.optional(),
  usedOrderId: z.string().optional(),
  claimedAt: firestoreDateSchema,
  updatedAt: firestoreDateSchema,
});

export type CouponFromSchema = z.infer<typeof couponFirestoreSchema>;
export type CouponUsageFromSchema = z.infer<typeof couponUsageFirestoreSchema>;
export type ClaimedCouponFromSchema = z.infer<typeof claimedCouponFirestoreSchema>;

// --- Sub-schemas --------------------------------------------------------------

export const couponTypeSchema = z.enum([
  "percentage",
  "fixed",
  "free_shipping",
  "buy_x_get_y",
]);

export const couponScopeSchema = z.enum(["admin", "seller"]);

// --- Base item schema ---------------------------------------------------------

/**
 * Base Zod schema for a coupon/promotion.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { couponItemSchema } from "@mohasinac/feat-promotions";
 *
 * const mySchema = couponItemSchema.extend({
 *   campaignId: z.string().optional(),
 *   affiliateCode: z.string().optional(),
 * });
 */
export const couponItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  type: couponTypeSchema,
  scope: z.enum(["admin", "seller"]),
  discountValue: z.number(),
  minOrderAmount: z.number().optional(),
  maxDiscountAmount: z.number().optional(),
  maxUsageCount: z.number().optional(),
  usageCount: z.number(),
  perUserLimit: z.number().optional(),
  buyQuantity: z.number().optional(),
  getQuantity: z.number().optional(),
  applicableProductIds: z.array(z.string()).optional(),
  applicableCategoryIds: z.array(z.string()).optional(),
  storeId: z.string().optional(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const promotionsListParamsSchema = z.object({
  scope: couponScopeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  storeId: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  filters: z.string().optional(),
  sort: z.string().optional(),
});
