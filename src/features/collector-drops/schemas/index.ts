export * from "./firestore";
import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index";

// --- Sub-schemas --------------------------------------------------------------

export const collectorDropStatusSchema = z.enum([
  "published",
  "draft",
  "archived",
  "sold",
]);

// --- Base item schema ---------------------------------------------------------

/**
 * Base Zod schema for a collector drop item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { collectorDropItemSchema } from "@mohasinac/feat-collectorDrops";
 *
 * const mySchema = collectorDropItemSchema.extend({
 *   reservePrice: z.number().optional(),
 *   inspectionReport: z.string().optional(),
 * });
 * type MyCollectorDrop = z.infer<typeof mySchema>;
 */
export const collectorDropItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  slug: z.string(),
  mainImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  media: z.array(mediaFieldSchema).optional(),
  currency: z.string(),
  price: z.number(),
  startingBid: z.number(),
  currentBid: z.number().optional(),
  bidCount: z.number(),
  collectorDropEndDate: z.string(),
  status: collectorDropStatusSchema,
  sellerId: z.string(),
  storeId: z.string().optional(),
  storeSlug: z.string().optional(),
  featured: z.boolean(),
  listingType: z.literal("collector-drop"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const bidRecordSchema = z.object({
  id: z.string(),
  collectorDropId: z.string(),
  bidderId: z.string(),
  bidderDisplayName: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  placedAt: z.string(),
  isWinning: z.boolean(),
});

export const collectorDropListParamsSchema = z.object({
  storeSlug: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  sort: z.string().optional(),
  filters: z.string().optional(),
});
