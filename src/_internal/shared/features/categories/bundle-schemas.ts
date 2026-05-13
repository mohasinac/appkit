/**
 * Bundle admin Zod schemas — single source for the two `/api/admin/bundles`
 * routes. Bundle pricing + query rule + member list validation shared between
 * POST (create) and PUT (update); the latter just makes each field optional.
 *
 * Kept under `_internal/shared/features/categories/` (not `_internal/server/`)
 * because Zod is isomorphic — same schema runs at form-submit time on the
 * client too if the admin form ever pre-validates.
 */

import { z } from "zod";
import { BUNDLE_MAX_ITEMS } from "./bundle-config";

const productIdsSchema = z.array(z.string().min(1)).min(0).max(BUNDLE_MAX_ITEMS);

export const bundleQueryRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("static"),
    productIds: productIdsSchema,
  }),
  z.object({
    type: z.literal("dynamic"),
    filter: z.object({
      categorySlug: z.string().optional(),
      brandSlug: z.string().optional(),
      tags: z.array(z.string()).optional(),
      listingType: z.enum(["standard", "pre-order"]).optional(),
    }),
    orderBy: z
      .enum(["price-asc", "price-desc", "createdAt-desc"])
      .optional(),
    limit: z.number().int().min(1).max(BUNDLE_MAX_ITEMS),
  }),
]);

export const bundleDisplaySchema = z.object({
  coverImage: z.string().url().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const bundleCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  bundlePriceInPaise: z.number().int().min(100),
  bundleQueryRule: bundleQueryRuleSchema,
  bundleProductIds: productIdsSchema,
  display: bundleDisplaySchema.optional(),
  isActive: z.boolean().optional(),
});

export const bundleUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  bundlePriceInPaise: z.number().int().min(100).optional(),
  bundleQueryRule: bundleQueryRuleSchema.optional(),
  bundleProductIds: productIdsSchema.optional(),
  display: bundleDisplaySchema.optional(),
  isActive: z.boolean().optional(),
});

export type BundleCreateBody = z.infer<typeof bundleCreateSchema>;
export type BundleUpdateBody = z.infer<typeof bundleUpdateSchema>;
