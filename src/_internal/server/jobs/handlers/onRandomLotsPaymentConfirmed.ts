import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handleRandomLotsPaymentConfirmed,
  type RandomLotsOrderSnapshot,
} from "../core/onRandomLotsPaymentConfirmed";

export const onRandomLotsPaymentConfirmedHandler: FirestoreTriggerHandler<
  RandomLotsOrderSnapshot,
  RandomLotsOrderSnapshot
> = async (event, ctx) => {
  const before = event.before;
  const after = event.after;
  if (!after) return;
  // Only act on the paid transition — avoids re-firing on every other order write.
  if (before?.paymentStatus === "paid" || after.paymentStatus !== "paid") return;

  await handleRandomLotsPaymentConfirmed(
    { orderId: event.params.orderId, order: after },
    ctx,
  );
};
