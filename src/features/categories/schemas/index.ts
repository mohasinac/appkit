export * from "./firestore";

import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema, paiseSchema } from "../../../schemas/firestore-helpers";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors CategoryDocument + nested types in ./firestore.ts.
// Registered into SCHEMAS.firestore.categories.

export const categoryAncestorSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.number().int().nonnegative(),
});

export const categoryDocumentSeoSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
});

export const categoryDocumentDisplaySchema = z.object({
  showInMenu: z.boolean(),
  showInFooter: z.boolean(),
  icon: z.string().optional(),
  coverImage: z.string().optional(),
  color: z.string().optional(),
});

export const categoryDocumentMetricsSchema = z.object({
  productCount: z.number().int().nonnegative(),
  productIds: z.array(z.string()),
  auctionCount: z.number().int().nonnegative(),
  auctionIds: z.array(z.string()),
  totalProductCount: z.number().int().nonnegative(),
  totalAuctionCount: z.number().int().nonnegative(),
  totalItemCount: z.number().int().nonnegative(),
  lastUpdated: firestoreDateSchema,
});

export const bundleQueryRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("static"), productIds: z.array(z.string()) }),
  z.object({
    type: z.literal("dynamic"),
    filter: z.object({
      categorySlug: z.string().optional(),
      brandSlug: z.string().optional(),
      tags: z.array(z.string()).optional(),
      listingType: z.enum(["standard", "pre-order", "prize-draw"]).optional(),
    }),
    orderBy: z.enum(["price-asc", "price-desc", "createdAt-desc"]).optional(),
    limit: z.number().int().positive(),
  }),
]);

export const bundleItemDetailSchema = z.object({
  productId: z.string(),
  drawCount: z.number().int().nonnegative().optional(),
  imageURL: z.string().optional(),
  title: z.string().optional(),
});

export const categoryFirestoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  rootId: z.string(),
  parentIds: z.array(z.string()),
  childrenIds: z.array(z.string()),
  tier: z.number().int().nonnegative(),
  path: z.string(),
  order: z.number().int(),
  isLeaf: z.boolean(),
  position: z.number().int(),
  subtreeSize: z.number().int().nonnegative(),
  metrics: categoryDocumentMetricsSchema,
  isFeatured: z.boolean(),
  featuredPriority: z.number().int().optional(),
  isBrand: z.boolean().optional(),
  categoryType: z.enum(["category", "sublisting", "brand", "bundle"]).optional(),
  itemCode: z.string().optional(),
  brandWebsite: z.string().optional(),
  brandCountry: z.string().optional(),
  brandFounded: z.number().int().optional(),
  brandBannerImage: z.string().optional(),
  bundleKind: z.enum(["special", "brand"]).optional(),
  bundlePriceInPaise: paiseSchema.optional(),
  bundleQueryRule: bundleQueryRuleSchema.optional(),
  bundleStockStatus: z.enum(["in_stock", "out_of_stock"]).optional(),
  bundleQueryResolvedAt: firestoreDateSchema.optional(),
  bundleProductIds: z.array(z.string()).optional(),
  bundleItemDetails: z.array(bundleItemDetailSchema).optional(),
  seo: categoryDocumentSeoSchema,
  display: categoryDocumentDisplaySchema,
  isActive: z.boolean(),
  isSearchable: z.boolean(),
  showOnHomepage: z.boolean().optional(),
  createdBy: z.string(),
  createdByType: z.enum(["admin", "store"]).optional(),
  createdByStoreId: z.string().optional(),
  createdByStoreName: z.string().optional(),
  ancestors: z.array(categoryAncestorSchema),
  ...auditTimestampsShape,
});

export type CategoryFromSchema = z.infer<typeof categoryFirestoreSchema>;

// --- Sub-schemas --------------------------------------------------------------

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

// --- Base item schema ---------------------------------------------------------

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
