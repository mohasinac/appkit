export * from "./firestore";

import { z } from "zod";
import { StoreStatusValues } from "./firestore";

/** Zod schema for store status — use instead of inline `z.enum(["pending",...])`. */
export const storeStatusSchema = z.enum([
  StoreStatusValues.PENDING,
  StoreStatusValues.ACTIVE,
  StoreStatusValues.SUSPENDED,
  StoreStatusValues.REJECTED,
]);

// --- Base item schema ---------------------------------------------------------

/**
 * Base Zod schema for a store list item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { storeListItemSchema } from "@mohasinac/feat-stores";
 *
 * const myStoreSchema = storeListItemSchema.extend({
 *   tier: z.enum(["basic", "pro", "enterprise"]).optional(),
 *   verifiedBadge: z.boolean().optional(),
 * });
 * type MyStore = z.infer<typeof myStoreSchema>;
 */
export const storeListItemSchema = z.object({
  id: z.string(),
  storeSlug: z.string(),
  ownerId: z.string(),
  storeName: z.string(),
  storeDescription: z.string().optional(),
  storeCategory: z.string().optional(),
  storeLogoURL: z.string().optional(),
  storeBannerURL: z.string().optional(),
  status: z.string(),
  isPublic: z.boolean(),
  totalProducts: z.number().optional(),
  itemsSold: z.number().optional(),
  totalReviews: z.number().optional(),
  averageRating: z.number().optional(),
  createdAt: z.string().optional(),
});

export const storeListParamsSchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  sort: z.string().optional(),
  filters: z.string().optional(),
});
