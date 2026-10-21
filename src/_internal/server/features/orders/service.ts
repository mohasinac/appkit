import { orderRepository } from "../../../../repositories";
import {
  OrderNotFoundError,
  OrderCancelError,
  OrderOwnershipError,
  OrderReturnWindowError,
} from "../../../shared/features/orders/errors";
import {
  ORDER_CANCELLABLE_STATUSES,
  ORDER_RETURN_WINDOW_MS,
} from "../../../shared/features/orders/config";
import type { OrderDocument } from "../../../../features/orders/schemas";

export async function assertOrderOwnership(orderId: string, userId: string): Promise<OrderDocument> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderNotFoundError(orderId);
  if (order.userId !== userId) throw new OrderOwnershipError(orderId);
  return order;
}

export async function assertOrderCancellable(orderId: string, userId: string): Promise<OrderDocument> {
  const order = await assertOrderOwnership(orderId, userId);
  const cancellable = ORDER_CANCELLABLE_STATUSES as readonly string[];
  if (!cancellable.includes(order.status)) {
    throw new OrderCancelError(order.status);
  }
  return order;
}

/**
 * Is the buyer's return window still open?
 *
 * 🛑 The window is measured from DELIVERY, and until 2026-10-21 nothing in the
 * application wrote `deliveryDate` at all — only seed data and display
 * components referenced it — so this function always took its fallback branch
 * and measured from **`updatedAt`**, i.e. from the last time anyone touched
 * the order. A seller adding a note, an admin assigning a worker, or any
 * `statusHistory` append silently restarted the buyer's 7 days. The anchor is
 * now stamped by `OrderRepository.updateWithHistory` on the transition into
 * `delivered`, so the primary branch is reachable for the first time.
 *
 * Two deliberate choices in the fallback:
 *
 *   · **It still exists**, because every order delivered before that date has
 *     no anchor, and the alternative — refusing the return outright — would
 *     punish buyers for our omission.
 *   · **It fails OPEN** (`?? Date.now()` keeps the window open rather than
 *     closing it). For a *buyer's* right the safe direction is to allow; this
 *     is the mirror of the payout hold, where the same uncertainty must
 *     WITHHOLD, because there the unsafe direction is releasing money we
 *     cannot get back. Same missing anchor, opposite correct defaults — which
 *     is why the two are not sharing one helper.
 */
export async function assertReturnWindowOpen(orderId: string, userId: string): Promise<OrderDocument> {
  const order = await assertOrderOwnership(orderId, userId);
  if (order.status !== "delivered") throw new OrderCancelError(order.status);

  /*
   * `BaseRepository.mapDoc` runs `deserializeTimestamps`, so a Firestore
   * Timestamp has already become a real `Date` by the time it reaches here —
   * which is what makes `instanceof Date` a valid test on THIS path. It would
   * not be on a raw `d.data()` read (see `toDateOrNull` in the repository,
   * which handles all four shapes for exactly that reason).
   */
  const deliveredAt = order.deliveryDate instanceof Date
    ? order.deliveryDate
    : new Date((order as { updatedAt?: unknown }).updatedAt as never ?? Date.now());
  if (Date.now() - deliveredAt.getTime() > ORDER_RETURN_WINDOW_MS) throw new OrderReturnWindowError();
  return order;
}
