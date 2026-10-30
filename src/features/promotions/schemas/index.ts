export * from "./firestore";
import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema, rupeesSchema } from "../../../schemas/firestore-helpers";

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
  maxDiscount: rupeesSchema.optional(),
  minPurchase: rupeesSchema.optional(),
});

/*
 * 🛑 THIS IS THE ONLY bxgy VALIDATOR. The four admin write paths — the POST
 * and PATCH routes, both server actions, and `createCouponSchema` below — all
 * import it rather than restating the shape.
 *
 * That is not tidiness. Until 2026-10-22 none of those four declared `bxgy` at
 * all, and every one of them is a `z.object()`, which STRIPS unknown keys. So
 * `AdminCouponEditorView` built a correct `bxgy` payload, the route answered
 * 200, and the field was never written — an admin could create a BOGO coupon
 * that discounted nothing, which is the exact silent-strip trap the `tiers`
 * comment in the POST route already describes, recurring one field over.
 *
 * `maxItemPrice` is deliberately `.optional()` with no default: absent means
 * "no ceiling", which is what every BOGO coupon written before it existed
 * means. A default would retroactively shrink them.
 */
export const bxgyConfigSchema = z.object({
  buyQuantity: z.number().int().positive(),
  getQuantity: z.number().int().positive(),
  // `.refine` rather than `.positive()` — `rupeesSchema` is a ZodEffects (it
  // carries the 2-decimal check), and ZodNumber's numeric helpers are not on
  // it. A zero ceiling would disqualify every unit, so it is rejected here as
  // well as being treated as absent by `calculateBxgyDiscount`.
  maxItemPrice: rupeesSchema
    .refine((n) => n > 0, { message: "Price ceiling must be greater than zero" })
    .optional(),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
});

export const tieredDiscountSchema = z.object({
  minAmount: rupeesSchema,
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
});

export const couponStatsSchema = z.object({
  totalUses: z.number().int().nonnegative(),
  totalRevenue: rupeesSchema,
  totalDiscount: rupeesSchema,
});

export const couponFirestoreSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  type: couponTypeEnumSchema,
  scope: z.enum(["admin", "seller"]),
  storeId: z.string().optional(),
  applicableToCollectorDrops: z.boolean().optional(),
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

/**
 * The admin create-coupon REQUEST BODY.
 *
 * 🛑 It lives here, in appkit, because `bxgyConfigSchema` does — and a zod
 * schema CANNOT cross the version boundary. The consumer root is on zod 4 and
 * appkit depends on zod 3, so `/api/admin/coupons` composing
 * `bxgy: bxgyConfigSchema.optional()` into a consumer `z.object({...})` did
 * not merely infer `unknown`: zod 4 **throws** on it —
 *
 *     Invalid element at key "bx": expected a Zod schema
 *
 * — so every POST to that route failed. The type error was the only signal,
 * and it reads as a cosmetic inference problem.
 *
 * Composed from the pieces above rather than restated, which is the concern
 * the route's own comment raised about `bxgy`: "four write paths validate this
 * shape and a fifth copy is how they drift". Re-declaring the shape in
 * consumer zod would have been that fifth copy; moving the whole body schema
 * to where the pieces live is the version of that fix which also works.
 */
export const couponCreateBodySchema = z
  .object({
    code: z.string().min(2).max(50),
    name: z.string().min(1),
    description: z.string().default(""),
    type: couponTypeEnumSchema,
    tiers: z.array(tieredDiscountSchema).max(6).optional(),
    bxgy: bxgyConfigSchema.optional(),
    discount: z.object({
      value: z.number().min(0),
      maxDiscount: z.number().optional(),
      minPurchase: z.number().optional(),
    }),
    usage: z.object({
      totalLimit: z.number().optional(),
      perUserLimit: z.number().optional(),
      currentUsage: z.number().default(0),
    }),
    validity: z.object({
      startDate: z.string().transform((v) => new Date(v)),
      endDate: z
        .string()
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
      isActive: z.boolean().default(false),
    }),
    restrictions: z
      .object({
        applicableProducts: z.array(z.string()).optional(),
        applicableCategories: z.array(z.string()).optional(),
        applicableSellers: z.array(z.string()).optional(),
        excludeProducts: z.array(z.string()).optional(),
        excludeCategories: z.array(z.string()).optional(),
        firstTimeUserOnly: z.boolean().default(false),
      })
      .default({ firstTimeUserOnly: false }),
    createdBy: z.string().optional().default("admin"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percentage" && data.discount.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage discount cannot exceed 100%",
        path: ["discount", "value"],
      });
    }
  });

export type CouponCreateBody = z.infer<typeof couponCreateBodySchema>;

/**
 * The admin update-coupon REQUEST BODY (`PATCH /api/admin/coupons/[id]`).
 *
 * 🛑 HERE FOR THE SAME REASON AS `couponCreateBodySchema` — read its note
 * first. It embeds `bxgyConfigSchema`, and a zod-3 schema composed into a
 * consumer zod-4 `z.object({...})` THROWS at parse time rather than merely
 * mistyping. The POST route was migrated when that was discovered; this is
 * the sibling PATCH, which has the same embed and would fail the same way.
 *
 * 🛑 NOT `couponCreateBodySchema.partial()`. That schema carries a
 * `.superRefine`, so it is a ZodEffects and has no `.partial()` — and the
 * update body is genuinely a different shape anyway: no `code` (a coupon's
 * code is immutable after creation), plus the `action` discriminator the
 * route uses for activate/deactivate.
 *
 * Every nested object stays OPTIONAL as a whole, which is what lets the route
 * merge `validity` and `restrictions` against the stored document instead of
 * replacing them — a caller sending only `{isActive: false}` must not wipe
 * the coupon's real dates.
 */
export const couponUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tiers: z.array(tieredDiscountSchema).max(6).optional(),
  bxgy: bxgyConfigSchema.optional(),
  discount: z
    .object({
      value: z.number().min(0),
      maxDiscount: z.number().optional(),
      minPurchase: z.number().optional(),
    })
    .optional(),
  usage: z
    .object({
      totalLimit: z.number().optional(),
      perUserLimit: z.number().optional(),
    })
    .optional(),
  validity: z
    .object({
      startDate: z
        .string()
        .transform((v) => new Date(v))
        .optional(),
      endDate: z
        .string()
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
      isActive: z.boolean().optional(),
    })
    .optional(),
  restrictions: z
    .object({
      applicableProducts: z.array(z.string()).optional(),
      applicableCategories: z.array(z.string()).optional(),
      applicableSellers: z.array(z.string()).optional(),
      excludeProducts: z.array(z.string()).optional(),
      excludeCategories: z.array(z.string()).optional(),
      firstTimeUserOnly: z.boolean().optional(),
    })
    .optional(),
  action: z.enum(["activate", "deactivate"]).optional(),
});

export type CouponUpdateBody = z.infer<typeof couponUpdateBodySchema>;

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
  "giveaway",
  "random-lots",
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
