import { z } from "zod";

/**
 * Base Zod schema for a collection item (full detail).
 *
 * @example
 * import { collectionItemSchema } from "@mohasinac/feat-collections";
 *
 * const mySchema = collectionItemSchema.extend({
 *   seasonTag: z.string().optional(),
 * });
 */
export const collectionItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  bannerImage: z.string().optional(),
  brandSlug: z.string().optional(),
  franchiseSlug: z.string().optional(),
  manualProductIds: z.array(z.string()).optional(),
  productCount: z.number().optional(),
  sortOrder: z.number().default(0),
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
});

export const collectionListItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  productCount: z.number().optional(),
  active: z.boolean().default(true),
});
