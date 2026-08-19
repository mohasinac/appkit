import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handlePrizeDrawSoldOut,
  type PrizeDrawStockSnapshot,
} from "../core/prizeDrawSoldOutReveal";

export const prizeDrawSoldOutRevealHandler: FirestoreTriggerHandler<
  PrizeDrawStockSnapshot,
  PrizeDrawStockSnapshot
> = async (event, ctx) => {
  await handlePrizeDrawSoldOut(
    { productId: event.params.productId, before: event.before, after: event.after },
    ctx,
  );
};
