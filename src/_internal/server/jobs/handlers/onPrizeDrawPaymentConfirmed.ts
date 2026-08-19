import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handlePrizeDrawPaymentConfirmed,
  type PrizeDrawOrderSnapshot,
} from "../core/onPrizeDrawPaymentConfirmed";

export const onPrizeDrawPaymentConfirmedHandler: FirestoreTriggerHandler<
  PrizeDrawOrderSnapshot,
  PrizeDrawOrderSnapshot
> = async (event, ctx) => {
  const before = event.before;
  const after = event.after;
  if (!after) return;
  // Only act on the paid transition — avoids re-firing on every other order write.
  if (before?.paymentStatus === "paid" || after.paymentStatus !== "paid") return;

  await handlePrizeDrawPaymentConfirmed(
    { orderId: event.params.orderId, order: after },
    ctx,
  );
};
