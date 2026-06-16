import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";
import { handleProductStockChange } from "../core/onProductStockChange";
import type { ProductStockSnapshot } from "../core/onProductStockChange";

type ProductDoc = Record<string, JsonValue>;

function toSnapshot(doc: ProductDoc | null | undefined): ProductStockSnapshot | null {
  if (!doc) return null;
  return {
    isSold: doc.isSold as boolean | undefined,
    availableQuantity: doc.availableQuantity as number | undefined,
    status: doc.status as string | undefined,
  };
}

export const onProductStockChangeHandler: FirestoreTriggerHandler<
  ProductDoc,
  ProductDoc
> = async (event, ctx) => {
  await handleProductStockChange(
    {
      productId: event.params.productId as string,
      before: toSnapshot(event.before),
      after: toSnapshot(event.after),
      isDelete: !event.after,
    },
    ctx,
  );
};
