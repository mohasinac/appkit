import { z } from "zod";

/**
 * Base Zod schema for a wishlist item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { wishlistItemSchema } from "@mohasinac/feat-wishlist";
 *
 * const mySchema = wishlistItemSchema.extend({
 *   priceAlertThreshold: z.number().optional(),
 * });
 */
export const wishlistItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string(),
  productTitle: z.string().optional(),
  productImage: z.string().optional(),
  productPrice: z.number().optional(),
  productCurrency: z.string().optional(),
  productSlug: z.string().optional(),
  productStatus: z.string().optional(),
  addedAt: z.string().optional(),
});
