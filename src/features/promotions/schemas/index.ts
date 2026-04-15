export * from "./firestore";
import { z } from "zod";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const couponTypeSchema = z.enum([
  "percentage",
  "fixed",
  "free_shipping",
  "buy_x_get_y",
]);

export const couponScopeSchema = z.enum(["admin", "seller"]);

// ─── Base item schema ─────────────────────────────────────────────────────────

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
  scope: couponScopeSchema,
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
  sellerId: z.string().optional(),
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
  sellerId: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  filters: z.string().optional(),
  sort: z.string().optional(),
});
