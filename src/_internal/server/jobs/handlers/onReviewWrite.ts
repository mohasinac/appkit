import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleReviewWrite } from "../core/onReviewWrite";

export const onReviewWriteHandler: FirestoreTriggerHandler<
  Record<string, unknown>,
  Record<string, unknown>
> = async (event, ctx) => {
  await handleReviewWrite(
    { reviewId: event.params.reviewId, before: event.before, after: event.after },
    ctx,
  );
};
