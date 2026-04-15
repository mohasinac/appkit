export * from "./firestore";
import { z } from "zod";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const reviewImageSchema = z.object({
  url: z.string(),
  thumbnailUrl: z.string().optional(),
});

export const reviewVideoSchema = z.object({
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  duration: z.number().optional(),
  trimStart: z.number().optional(),
  trimEnd: z.number().optional(),
});

// ─── Base item schema ─────────────────────────────────────────────────────────

/**
 * Base Zod schema for a review.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { reviewSchema } from "@mohasinac/feat-reviews";
 *
 * const myReviewSchema = reviewSchema.extend({
 *   purchaseVerifiedAt: z.string().optional(),
 *   loyaltyPointsAwarded: z.number().optional(),
 * });
 * type MyReview = z.infer<typeof myReviewSchema>;
 */
export const reviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productTitle: z.string().optional(),
  sellerId: z.string().optional(),
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  rating: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  title: z.string().optional(),
  comment: z.string().optional(),
  images: z.array(reviewImageSchema).optional(),
  video: reviewVideoSchema.optional(),
  status: reviewStatusSchema,
  helpfulCount: z.number().optional(),
  reportCount: z.number().optional(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/** Base schema for list-query parameters. */
export const reviewListParamsSchema = z.object({
  productId: z.string().optional(),
  userId: z.string().optional(),
  sellerId: z.string().optional(),
  status: reviewStatusSchema.optional(),
  rating: z.coerce.number().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  sort: z.string().optional(),
});
