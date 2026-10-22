import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handleOrderStatusChange,
  type OrderAfter,
  type OrderBefore,
} from "../core/onOrderStatusChange";

/*
 * 🛑 Bound as **`documentUpdated`**, which is what Phase 7's numbering needs
 * and is already what this function uses — verified rather than assumed.
 *
 * `paymentStatus: pending → paid` is frequently the ONLY field that moves on a
 * COD or manual order, and `documentUpdated` fires on any update, so the
 * handler sees it. `documentCreated` would miss every one of them, and
 * `documentWritten` would add nothing except a wake-up on create, where an
 * order is `pending` and there is nothing to number.
 *
 * 🛑 What makes a write-back from this handler safe is the allocation claim:
 * it updates `orders` only when IT allocated, so the re-fire caused by its own
 * write finds the claim taken and writes nothing. That is the guard Root Cause
 * #92's 12M-invocation loop lacked — there the no-op check compared Firestore
 * maps with `JSON.stringify`, which is key-order sensitive and could never
 * match, so every invocation wrote and every write re-triggered.
 */
export const onOrderStatusChangeHandler: FirestoreTriggerHandler<OrderBefore, OrderAfter> = async (
  event,
  ctx,
) => {
  await handleOrderStatusChange(
    { orderId: event.params.orderId, before: event.before, after: event.after },
    ctx,
  );
};
