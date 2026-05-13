import { z } from "zod";

/**
 * Schema for a search result product item.
 *
 * @example
 * import { searchProductItemSchema } from "@mohasinac/feat-search";
 *
 * const mySchema = searchProductItemSchema.extend({
 *   brandTag: z.string().optional(),
 * });
 */
export const searchProductItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().optional(),
  currency: z.string().optional(),
  mainImage: z.string().optional(),
  status: z.string().optional(),
  featured: z.boolean().optional(),
  listingType: z
    .enum(["standard", "auction", "pre-order", "prize-draw", "bundle"])
    .optional(),
  isPromoted: z.boolean().optional(),
  slug: z.string(),
});

/**
 * Form/query schema for a search request.
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  sort: z.string().optional(),
  page: z.number().int().positive().default(1),
});
