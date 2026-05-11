import { z } from "zod";
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_TITLE_MAX_LENGTH,
  REVIEW_MIN_RATING,
  REVIEW_MAX_RATING,
  REVIEW_IMAGES_MAX,
  REVIEW_REPLY_MAX_LENGTH,
} from "./config";

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
  rating: z.number().int().min(REVIEW_MIN_RATING).max(REVIEW_MAX_RATING),
  title: z.string().min(1).max(REVIEW_TITLE_MAX_LENGTH),
  body: z.string().min(REVIEW_BODY_MIN_LENGTH).max(REVIEW_BODY_MAX_LENGTH),
  images: z.array(z.string().url()).max(REVIEW_IMAGES_MAX).default([]),
  orderId: z.string().optional(),
});

export const replyToReviewSchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().min(1).max(REVIEW_REPLY_MAX_LENGTH),
});

export const deleteReviewSchema = z.object({
  reviewId: z.string().min(1),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
