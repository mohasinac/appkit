import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handleClearanceSoldOut,
  type ClearanceStockSnapshot,
} from "../core/clearanceSoldOutReveal";

export const clearanceSoldOutRevealHandler: FirestoreTriggerHandler<
  ClearanceStockSnapshot,
  ClearanceStockSnapshot
> = async (event, ctx) => {
  await handleClearanceSoldOut(
    { productId: event.params.productId, before: event.before, after: event.after },
    ctx,
  );
};
