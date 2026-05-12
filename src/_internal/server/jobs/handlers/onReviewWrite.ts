import { reviewRepository, storeRepository } from "../../../../repositories";
import { ReviewStatusValues } from "../../../../features/reviews/schemas/firestore";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import type { FirestoreTriggerHandler } from "../runtime/types";

export const onReviewWriteHandler: FirestoreTriggerHandler<
  Record<string, unknown>,
  Record<string, unknown>
> = async (event, ctx) => {
  const reviewId = event.params.reviewId;
  const beforeData = event.before;
  const afterData = event.after;

  const beforeStatus = (beforeData?.status as string | undefined) ?? null;
  const afterStatus = (afterData?.status as string | undefined) ?? null;

  const wasApproved = beforeStatus === ReviewStatusValues.APPROVED;
  const isApproved = afterStatus === ReviewStatusValues.APPROVED;
  if (!wasApproved && !isApproved) return;

  const data = afterData ?? beforeData;
  if (!data) return;

  const productId = (data.productId as string | undefined) ?? null;
  const storeId = (data.storeId as string | undefined) ?? null;
  if (!productId) {
    ctx.logger.error("Review has no productId — skipping", null, { reviewId });
    return;
  }

  try {
    const { count, avgRating } = await reviewRepository.getApprovedRatingAggregate(productId);
    await ctx.db.collection(PRODUCT_COLLECTION).doc(productId).update({
      avgRating,
      reviewCount: count,
      updatedAt: new Date(),
    });
    ctx.logger.info("Updated product rating stats", {
      reviewId,
      productId,
      count,
      avgRating,
    });

    if (storeId) {
      const storeStats = await reviewRepository.getApprovedRatingAggregateByStore(storeId);
      await storeRepository.updateReviewStats(storeId, storeStats.count, storeStats.avgRating);
      ctx.logger.info("Updated store review stats", {
        reviewId,
        storeId,
        count: storeStats.count,
        avgRating: storeStats.avgRating,
      });
    }
  } catch (err) {
    ctx.logger.error("Failed to update rating stats", err, { reviewId, productId, storeId });
    throw err;
  }
};
