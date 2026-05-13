import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleProductWrite, type ProductDoc } from "../core/onProductWrite";

export const onProductWriteHandler: FirestoreTriggerHandler<ProductDoc, ProductDoc> = async (
  event,
  ctx,
) => {
  await handleProductWrite(
    {
      productId: event.params.productId as string,
      before: event.before,
      after: event.after,
    },
    ctx,
  );
};
