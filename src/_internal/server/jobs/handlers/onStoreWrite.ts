import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleStoreWrite, type StoreDoc } from "../core/onStoreWrite";

export const onStoreWriteHandler: FirestoreTriggerHandler<StoreDoc, StoreDoc> = async (
  event,
  ctx,
) => {
  await handleStoreWrite(
    {
      storeId: event.params.storeId as string,
      before: event.before,
      after: event.after,
    },
    ctx,
  );
};
