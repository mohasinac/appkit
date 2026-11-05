import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handleClearancePaymentConfirmed,
  type ClearanceOrderSnapshot,
} from "../core/onClearancePaymentConfirmed";

export const onClearancePaymentConfirmedHandler: FirestoreTriggerHandler<
  ClearanceOrderSnapshot,
  ClearanceOrderSnapshot
> = async (event, ctx) => {
  const before = event.before;
  const after = event.after;
  if (!after) return;
  // Only act on the paid transition — avoids re-firing on every other order write.
  if (before?.paymentStatus === "paid" || after.paymentStatus !== "paid") return;

  await handleClearancePaymentConfirmed(
    { orderId: event.params.orderId, order: after },
    ctx,
  );
};
