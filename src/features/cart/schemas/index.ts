import { z } from "zod";

export const cartItemMetaSchema = z.object({
  title: z.string(),
  price: z.number(),
  currency: z.string().default("INR"),
  slug: z.string().optional(),
  attributes: z.record(z.string()).optional(),
});

/**
 * Base Zod schema for a cart item.
 *
 * @example
 * import { cartItemSchema } from "@mohasinac/feat-cart";
 *
 * const mySchema = cartItemSchema.extend({
 *   giftMessage: z.string().optional(),
 * });
 */
export const cartItemSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
  meta: cartItemMetaSchema.optional(),
  addedAt: z.string().optional(),
});

export const cartSummarySchema = z.object({
  items: z.array(cartItemSchema),
  subtotal: z.number(),
  currency: z.string().default("INR"),
  itemCount: z.number(),
});
