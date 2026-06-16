import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";
import { handleReviewWrite } from "../core/onReviewWrite";

export const onReviewWriteHandler: FirestoreTriggerHandler<
  Record<string, JsonValue>,
  Record<string, JsonValue>
> = async (event, ctx) => {
  await handleReviewWrite(
    { reviewId: event.params.reviewId, before: event.before, after: event.after },
    ctx,
  );
};
