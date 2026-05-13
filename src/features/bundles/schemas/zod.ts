/**
 * Bundle Zod schemas — SB3-J input validation for the `/api/bundles*`
 * routes. Both schemas are intentionally narrower than `BundleDocument`:
 *
 * - `bundleCreateInputSchema` covers the POST body. `bundleItems` is the
 *   minimum required surface; everything else (slug, status, price,
 *   storeName) can be filled or normalised server-side.
 * - `bundleUpdateInputSchema` is `bundleCreateInputSchema.partial()` so PUT
 *   can do partial edits while still validating any shape the caller does
 *   send.
 *
 * `partOfBundleProductIds` is NOT user-supplied — the route derives it
 * from `bundleItems[]` to keep the reverse index in lock-step.
 */

import { z } from "zod";

export const BUNDLE_ITEM_MIN = 3;
export const BUNDLE_ITEM_MAX = 16;

const bundleItemListingTypeSchema = z.enum(["standard", "pre-order"]);

const bundleItemInputSchema = z.object({
  productId: z.string().min(1),
  productSlug: z.string().min(1),
  title: z.string().min(1).max(200),
  listingType: bundleItemListingTypeSchema,
  images: z.array(z.string()).default([]),
  video: z
    .object({
      url: z.string(),
      thumbnailUrl: z.string().optional(),
    })
    .optional(),
  price: z.number().int().min(0),
  quantity: z.number().int().min(1).max(99),
  isSold: z.boolean().default(false),
});

const bundleStatusSchema = z.enum([
  "draft",
  "published",
  "out_of_stock",
  "archived",
]);

const mediaInputSchema = z.object({
  url: z.string(),
  thumbnailUrl: z.string().optional(),
});

export const bundleCreateInputSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  storeId: z.string().min(1),
  storeName: z.string().min(1),
  status: bundleStatusSchema.optional(),
  bundleItems: z.array(bundleItemInputSchema)
    .min(BUNDLE_ITEM_MIN, `Bundle must contain at least ${BUNDLE_ITEM_MIN} items`)
    .max(BUNDLE_ITEM_MAX, `Bundle may contain at most ${BUNDLE_ITEM_MAX} items`)
    .refine(
      (items) => items.every((it) => it.listingType === items[0].listingType),
      { message: "All bundleItems must share the same listingType" },
    ),
  bundlePrice: z.number().int().min(0),
  bundleOriginalTotal: z.number().int().min(0).optional(),
  category: z.string().optional(),
  categorySlug: z.string().optional(),
  subcategory: z.string().optional(),
  sublistingCategoryId: z.string().optional(),
  brandSlug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  video: mediaInputSchema.optional(),
  maxPerUser: z.number().int().min(1).optional(),
  isFeatured: z.boolean().optional(),
  isPromoted: z.boolean().optional(),
});

export const bundleUpdateInputSchema = bundleCreateInputSchema.partial();

export type BundleCreateInput = z.infer<typeof bundleCreateInputSchema>;
export type BundleUpdateInput = z.infer<typeof bundleUpdateInputSchema>;
