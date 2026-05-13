import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleProductStockChange } from "../core/onProductStockChange";

type ProductDoc = Record<string, unknown>;

export const onProductStockChangeHandler: FirestoreTriggerHandler<
  ProductDoc,
  ProductDoc
> = async (event, ctx) => {
  await handleProductStockChange(
    {
      productId: event.params.productId as string,
      beforeStatus: (event.before?.status as string | undefined) ?? null,
      afterStatus: (event.after?.status as string | undefined) ?? null,
      isDelete: !event.after,
    },
    ctx,
  );
};
