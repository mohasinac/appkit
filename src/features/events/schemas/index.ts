import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index.js";

const eventCoverImageSchema = z
  .union([
    mediaFieldSchema,
    z.string().url().transform((url) => ({ url, type: "image" as const })),
  ])
  .nullable()
  .optional()
  .transform((value) => value ?? null);

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const eventTypeSchema = z.enum([
  "sale",
  "offer",
  "poll",
  "survey",
  "feedback",
]);

export const eventStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "ended",
]);

export const saleConfigSchema = z.object({
  discountPercent: z.number(),
  bannerText: z.string().optional(),
  affectedCategories: z.array(z.string()).optional(),
});

export const offerConfigSchema = z.object({
  couponId: z.string(),
  displayCode: z.string(),
  bannerText: z.string().optional(),
});

export const pollConfigSchema = z.object({
  allowMultiSelect: z.boolean(),
  allowComment: z.boolean(),
  options: z.array(z.object({ id: z.string(), label: z.string() })),
  resultsVisibility: z.enum(["always", "after_vote", "after_end"]),
});

// ─── Base item schema ─────────────────────────────────────────────────────────

/**
 * Base Zod schema for an event item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { eventItemSchema } from "@mohasinac/feat-events";
 *
 * const myEventSchema = eventItemSchema.extend({
 *   brandId: z.string().optional(),
 *   rewardPoints: z.number().optional(),
 * });
 * type MyEvent = z.infer<typeof myEventSchema>;
 */
export const eventItemSchema = z.object({
  id: z.string(),
  type: eventTypeSchema,
  title: z.string(),
  description: z.string(),
  status: eventStatusSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  coverImage: eventCoverImageSchema,
  coverImageUrl: z.string().optional(),
  eventImages: z.array(mediaFieldSchema).max(10).optional().default([]),
  winnerImages: z.array(mediaFieldSchema).max(5).optional().default([]),
  additionalImages: z.array(mediaFieldSchema).max(10).optional().default([]),
  saleConfig: saleConfigSchema.optional(),
  offerConfig: offerConfigSchema.optional(),
  pollConfig: pollConfigSchema.optional(),
  stats: z.object({
    totalEntries: z.number(),
    approvedEntries: z.number(),
    flaggedEntries: z.number(),
  }),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Base Zod schema for list-query parameters. */
export const eventListParamsSchema = z.object({
  type: eventTypeSchema.optional(),
  status: eventStatusSchema.optional(),
  q: z.string().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  sort: z.string().optional(),
});
