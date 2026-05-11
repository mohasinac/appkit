import { z } from "zod";
import { COUPON_CODE_PATTERN } from "./config";

export const applyCouponSchema = z.object({
  code: z.string().regex(COUPON_CODE_PATTERN, "Invalid coupon code format").toUpperCase(),
  cartTotal: z.number().int().min(0),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  isFirstTimeUser: z.boolean().default(false),
});

export const createCouponSchema = z.object({
  code: z.string().regex(COUPON_CODE_PATTERN, "Invalid coupon code format"),
  name: z.string().min(1).max(100),
  type: z.enum(["percentage", "fixed", "free_shipping", "buy_x_get_y"]),
  scope: z.enum(["admin", "seller"]),
  sellerId: z.string().optional(),
  discount: z.object({
    value: z.number().min(0),
    maxDiscount: z.number().int().min(0).optional(),
    minPurchase: z.number().int().min(0).default(0),
  }),
  usage: z.object({
    totalLimit: z.number().int().min(1).optional(),
    perUserLimit: z.number().int().min(1).default(1),
  }),
  validity: z.object({
    startDate: z.string().datetime({ offset: true }),
    endDate: z.string().datetime({ offset: true }),
    isActive: z.boolean().default(true),
  }),
  restrictions: z.object({
    firstTimeUserOnly: z.boolean().default(false),
    combineWithSellerCoupons: z.boolean().default(false),
    applicableProducts: z.array(z.string()).optional(),
    applicableCategories: z.array(z.string()).optional(),
  }).optional(),
});

export const updateCouponSchema = createCouponSchema.partial().omit({ code: true });

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
