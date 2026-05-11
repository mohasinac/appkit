import { reviewRepository, orderRepository } from "../../../../repositories";
import {
  ReviewNotFoundError,
  DuplicateReviewError,
  ReviewOwnershipError,
  ReviewNotVerifiedError,
} from "../../../shared/features/reviews/errors";
import type { ReviewDocument } from "../../../../features/reviews/schemas";

export async function assertReviewOwnership(
  reviewId: string,
  userId: string,
): Promise<ReviewDocument> {
  const review = await reviewRepository.findById(reviewId);
  if (!review) throw new ReviewNotFoundError(reviewId);
  if (review.userId !== userId) throw new ReviewOwnershipError();
  return review;
}

export async function assertNotDuplicateReview(
  productId: string,
  userId: string,
): Promise<void> {
  const existing = await reviewRepository.findByUser(userId);
  const duplicate = existing.find((r) => r.productId === productId);
  if (duplicate) throw new DuplicateReviewError(productId);
}

export async function assertPurchaseVerified(
  productId: string,
  userId: string,
): Promise<void> {
  const purchased = await orderRepository.hasUserPurchased(userId, productId);
  if (!purchased) throw new ReviewNotVerifiedError();
}

export async function getReviewOrThrow(reviewId: string): Promise<ReviewDocument> {
  const review = await reviewRepository.findById(reviewId);
  if (!review) throw new ReviewNotFoundError(reviewId);
  return review;
}
