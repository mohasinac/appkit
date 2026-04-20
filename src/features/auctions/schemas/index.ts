export * from "./firestore";
import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index";

// --- Sub-schemas --------------------------------------------------------------

export const auctionStatusSchema = z.enum([
  "published",
  "draft",
  "archived",
  "sold",
]);

// --- Base item schema ---------------------------------------------------------

/**
 * Base Zod schema for an auction item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { auctionItemSchema } from "@mohasinac/feat-auctions";
 *
 * const mySchema = auctionItemSchema.extend({
 *   reservePrice: z.number().optional(),
 *   inspectionReport: z.string().optional(),
 * });
 * type MyAuction = z.infer<typeof mySchema>;
 */
export const auctionItemSchema = z.object({
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
  auctionEndDate: z.string(),
  status: auctionStatusSchema,
  sellerId: z.string(),
  storeId: z.string().optional(),
  storeSlug: z.string().optional(),
  featured: z.boolean(),
  isAuction: z.literal(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const bidRecordSchema = z.object({
  id: z.string(),
  auctionId: z.string(),
  bidderId: z.string(),
  bidderDisplayName: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  placedAt: z.string(),
  isWinning: z.boolean(),
});

export const auctionListParamsSchema = z.object({
  storeSlug: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  sort: z.string().optional(),
  filters: z.string().optional(),
});
