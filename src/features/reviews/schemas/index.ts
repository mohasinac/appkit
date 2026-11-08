export * from "./firestore";
import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema } from "../../../schemas/firestore-helpers";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors ReviewDocument in ./firestore.ts. Registered into SCHEMAS.firestore.reviews.

export const reviewVideoFieldSchema = z.object({
  url: z.string(),
  thumbnailUrl: z.string(),
  duration: z.number().nonnegative(),
  trimStart: z.number().optional(),
  trimEnd: z.number().optional(),
});

export const reviewFirestoreSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  listingType: z.string().optional(),
  /*
   * The KIND of review — the config dimension reviews did not have.
   *
   * Owner, 2026-11-08, naming reviews alongside events, listings and coupons:
   * *"nothing in the code should be fixed … the types we have now are the
   * default templates"*. Reviews had no type at all, so every review was
   * implicitly a product review and a site wanting seller reviews, unboxing
   * reviews or a verified-buyer-only kind had nowhere to put it.
   *
   * An open validated slug, resolved against the review-type config: which
   * rules apply (media allowed, moderation required, who may write one) is a
   * rule set on that row, not a branch in this file.
   *
   * 🛑 `status` below is deliberately NOT opened. It is the moderation STATE
   * MACHINE — pending/approved/rejected is machinery, not a user choice, and an
   * unknown state would mean a review that no queue can ever clear. Types are
   * config; lifecycle states are code.
   */
  reviewType: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Use a lowercase slug, e.g. seller-review")
    .optional(),
  storeId: z.string().optional(),
  storeName: z.string().optional(),
  userId: z.string(),
  userSlug: z.string().optional(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string(),
  comment: z.string(),
  images: z.array(z.string()).optional(),
  hasImages: z.boolean().optional(),
  video: reviewVideoFieldSchema.optional(),
  status: z.enum(["pending", "approved", "rejected"]),
  moderatorId: z.string().optional(),
  moderatorNote: z.string().optional(),
  rejectionReason: z.string().optional(),
  helpfulCount: z.number().int().nonnegative(),
  reportCount: z.number().int().nonnegative(),
  verified: z.boolean(),
  featured: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
  sellerReply: z.string().optional(),
  sellerRepliedAt: firestoreDateSchema.optional(),
  approvedAt: firestoreDateSchema.optional(),
  rejectedAt: firestoreDateSchema.optional(),
  ...auditTimestampsShape,
});

export type ReviewFromSchema = z.infer<typeof reviewFirestoreSchema>;

// --- Sub-schemas --------------------------------------------------------------

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

// --- Base item schema ---------------------------------------------------------

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
  listingType: z.string().optional(),
  storeSlug: z.string().optional(),
  storeName: z.string().optional(),
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
  storeId: z.string().optional(),
  status: reviewStatusSchema.optional(),
  rating: z.coerce.number().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  sort: z.string().optional(),
});
