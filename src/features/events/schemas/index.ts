export * from "./firestore";
export * from "./entry-votes";
export * from "./entry-ranking";
export * from "./event-mechanisms";
import { z } from "zod";
import { mediaUrlSchema } from "../../../validation/schemas";
import { mediaFieldSchema } from "../../media/types/index";
import { attachedCouponIdsSchema } from "../../promotions/schemas/attached-coupons";

const eventCoverImageSchema = z
  .union([
    mediaFieldSchema,
    mediaUrlSchema.transform((url) => ({ url, type: "image" as const })),
  ])
  .nullable()
  .optional()
  .transform((value) => value ?? null);

// --- Sub-schemas --------------------------------------------------------------

/**
 * 🛑 WRITE enum — the current spellings only. The three chance-based types
 * were renamed 2026-10-31 (`raffle` -> `giveaway`, `spin_wheel` ->
 * `bonus-spin`, `giveaway` -> `random-draw`).
 *
 * Deliberately does NOT accept the legacy spellings: a form or API caller
 * sending `raffle` today is using a stale client, and a 400 says so. Stored
 * documents that still hold them are handled on the READ side by
 * `normalizeEventType`, and rewritten by
 * `appkit/scripts/migrate-collector-drop-rename.mjs`.
 */
/**
 * 🛑 OPEN, not a closed enum. Owner, 2026-11-08: *"all event types are also
 * configs … they should not be fixed, nothing in the code should be fixed"*
 * and *"the types we have now are the DEFAULT TEMPLATES"*.
 *
 * The eight below are the shipped templates, kept as a named list so the
 * common ones are discoverable and so a typo in one of THEM is still caught.
 * Anything else is accepted as a slug and resolved against the event-type
 * config (`../config/event-types.ts`).
 *
 * The rejected shape was the previous one: a closed `z.enum` that 400s an
 * unknown value. It made a new kind of event — a photo contest judged by votes,
 * say — an enum edit, a schema change and a deploy, which is precisely the
 * coupling the rework removes. The same change is owed to coupons, listings
 * and reviews, which are all still closed today.
 *
 * The slug shape is still enforced, because an unvalidated string here becomes
 * a URL segment and a Firestore query value: lowercase, digits and hyphens,
 * 2-40 characters.
 */
export const DEFAULT_EVENT_TYPE_TEMPLATES = [
  "sale",
  "offer",
  "poll",
  "survey",
  "feedback",
  "giveaway",
  "bonus-spin",
  "random-draw",
] as const;

export const eventTypeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug, e.g. photo-contest");

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

/** Giveaway slot schema — client-safe shape (no price/weight sent to clients). */
export const giveawaySlotClientSchema = z.object({
  slotNumber: z.number().int().min(1),
  name: z.string(),
  isBooked: z.boolean(),
  bookedByUserGiveawayNumber: z.number().optional(),
  bookedByDisplayName: z.string().optional(),
});

/** Client-safe giveaway config schema — price/weight fields stripped server-side. */
export const giveawayConfigClientSchema = z.object({
  slots: z.array(giveawaySlotClientSchema),
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
  // Promotional coupons shown on the event page — NOT prizes (see below).
  couponIds: attachedCouponIdsSchema,
  // Raffle fields
  hasRaffle: z.boolean().optional(),
  // 🛑 `RaffleType`, NOT `EventType`. Its `spin_wheel` is the draw MECHANISM
  // and was deliberately left alone when the EventType became `bonus-spin`.
  raffleType: z.enum(["top_n_scorers", "top_n_participants", "open_raffle", "spin_wheel"]).optional(),
  raffleTopN: z.number().optional(),
  rafflePrize: z.string().optional(),
  /** @deprecated read-only legacy scalar — see `rafflePrizeCouponIdsOf`. */
  rafflePrizeCouponId: z.string().optional(),
  rafflePrizeCouponIds: attachedCouponIdsSchema,
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
  // Giveaway config (new) — client-safe shape (price/weight stripped by adapter)
  giveawayConfig: giveawayConfigClientSchema.optional(),
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
