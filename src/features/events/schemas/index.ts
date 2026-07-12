export * from "./firestore";
import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index";

const eventCoverImageSchema = z
  .union([
    mediaFieldSchema,
    z
      .string()
      .url()
      .transform((url) => ({ url, type: "image" as const })),
  ])
  .nullable()
  .optional()
  .transform((value) => value ?? null);

// --- Sub-schemas --------------------------------------------------------------

export const eventTypeSchema = z.enum([
  "sale",
  "offer",
  "poll",
  "survey",
  "feedback",
  "raffle",
  "spin_wheel",
  "lottery",
]);

export const eventStatusSchema = z.enum(["draft", "active", "paused", "ended", "cancelled"]);

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
  requireLogin: z.boolean().optional(),
});

export const surveyFormFieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "textarea", "email", "phone", "number", "select", "multiselect", "checkbox", "radio", "date", "rating", "file"]),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
  order: z.number(),
});

export const surveyConfigSchema = z.object({
  requireLogin: z.boolean(),
  maxEntriesPerUser: z.number(),
  hasLeaderboard: z.boolean(),
  hasPointSystem: z.boolean(),
  pointsLabel: z.string().optional(),
  entryReviewRequired: z.boolean(),
  formFields: z.array(surveyFormFieldSchema),
});

export const feedbackConfigSchema = z.object({
  formFields: z.array(surveyFormFieldSchema),
  anonymous: z.boolean(),
});

export const spinPrizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  couponId: z.string().optional(),
  weight: z.number(),
  isActive: z.boolean(),
});

/** Lottery slot schema — client-safe shape (no priceInPaise/weight sent to clients). */
export const lotterySlotClientSchema = z.object({
  slotNumber: z.number().int().min(1),
  name: z.string(),
  isBooked: z.boolean(),
  bookedByUserLotteryNumber: z.number().optional(),
  bookedByDisplayName: z.string().optional(),
});

/** Client-safe lottery config schema — price/weight fields stripped server-side. */
export const lotteryConfigClientSchema = z.object({
  slots: z.array(lotterySlotClientSchema),
  totalSlots: z.number().int().min(1).max(200),
  pricingMode: z.enum(["uniform", "variable"]),
  drawWindowDurationMinutes: z.number(),
  maxPullsPerTransaction: z.number().int().min(1),
  maxPullsPerUser: z.number().int().min(1),
});

// --- Base item schema ---------------------------------------------------------

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
  slug: z.string().optional(),
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
  surveyConfig: surveyConfigSchema.optional(),
  feedbackConfig: feedbackConfigSchema.optional(),
  // Raffle fields
  hasRaffle: z.boolean().optional(),
  raffleType: z.enum(["top_n_scorers", "top_n_participants", "open_raffle", "spin_wheel"]).optional(),
  raffleTopN: z.number().optional(),
  rafflePrize: z.string().optional(),
  rafflePrizeCouponId: z.string().optional(),
  rafflePrizeProductIds: z.array(z.string()).optional(),
  raffleGithubFunctionUrl: z.string().optional(),
  raffleWinnerUserId: z.string().optional(),
  raffleWinnerDisplayName: z.string().optional(),
  raffleTriggeredAt: z.string().optional(),
  raffleEntryCount: z.number().optional(),
  // Spin wheel fields
  spinPrizes: z.array(spinPrizeSchema).optional(),
  spinMaxPerUser: z.number().optional(),
  spinWindowStart: z.string().optional(),
  spinWindowEnd: z.string().optional(),
  // Lottery config (new) — client-safe shape (price/weight stripped by adapter)
  lotteryConfig: lotteryConfigClientSchema.optional(),
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
