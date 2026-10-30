import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handleRandomLotsSoldOut,
  type RandomLotsStockSnapshot,
} from "../core/randomLotsSoldOutReveal";

export const randomLotsSoldOutRevealHandler: FirestoreTriggerHandler<
  RandomLotsStockSnapshot,
  RandomLotsStockSnapshot
> = async (event, ctx) => {
  await handleRandomLotsSoldOut(
    { productId: event.params.productId, before: event.before, after: event.after },
    ctx,
  );
};
