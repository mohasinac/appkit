import { z } from "zod";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const categoryTypeSchema = z.enum([
  "category",
  "concern",
  "collection",
  "brand",
]);

export const categorySeoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  ogImage: z.string().optional(),
});

export const categoryDisplaySchema = z.object({
  icon: z.string().optional(),
  coverImage: z.string().optional(),
  showInMenu: z.boolean().optional(),
});

export const categoryMetricsSchema = z.object({
  productCount: z.number(),
  totalItemCount: z.number(),
  lastUpdated: z.string().optional(),
});

// ─── Base item schema ─────────────────────────────────────────────────────────

/**
 * Base Zod schema for a category item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { categoryItemSchema } from "@mohasinac/feat-categories";
 *
 * const mySchema = categoryItemSchema.extend({
 *   colorHex: z.string().optional(),
 * });
 */
export const categoryItemSchema = z.object({
  id: z.string(),
  type: categoryTypeSchema.optional(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  rootId: z.string().optional(),
  parentIds: z.array(z.string()).optional(),
  childrenIds: z.array(z.string()).optional(),
  tier: z.number(),
  path: z.string().optional(),
  order: z.number().optional(),
  isLeaf: z.boolean().optional(),
  metrics: categoryMetricsSchema.optional(),
  isFeatured: z.boolean().optional(),
  featuredPriority: z.number().optional(),
  seo: categorySeoSchema.optional(),
  display: categoryDisplaySchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const categoryListParamsSchema = z.object({
  type: categoryTypeSchema.optional(),
  parentId: z.string().optional(),
  tier: z.coerce.number().optional(),
  featured: z.coerce.boolean().optional(),
  q: z.string().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
});
