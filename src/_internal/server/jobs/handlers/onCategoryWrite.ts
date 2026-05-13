import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleCategoryWrite, type CategoryDoc } from "../core/onCategoryWrite";

export const onCategoryWriteHandler: FirestoreTriggerHandler<CategoryDoc, CategoryDoc> = async (
  event,
  ctx,
) => {
  await handleCategoryWrite(
    {
      categoryId: event.params.categoryId as string,
      before: event.before,
      after: event.after,
    },
    ctx,
  );
};
