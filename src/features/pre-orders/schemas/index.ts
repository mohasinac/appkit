import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index";

/**
 * Base Zod schema for a preorder product item (storefront listing).
 *
 * @example
 * import { preorderItemSchema } from "@mohasinac/feat-preorders";
 *
 * const mySchema = preorderItemSchema.extend({
 *   exclusiveTag: z.string().optional(),
 * });
 */
export const preorderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  images: z.array(z.string()).optional(),
  media: z.array(mediaFieldSchema).optional(),
  salePrice: z.number(),
  regularPrice: z.number(),
  franchise: z.string().optional(),
  brand: z.string().optional(),
  preorderShipDate: z.string().optional(),
  isFeatured: z.boolean().default(false),
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
});
