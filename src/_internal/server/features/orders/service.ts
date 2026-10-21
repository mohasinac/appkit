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

/**
 * What a buyer asking to cancel is actually asking for.
 *
 * 🛑 **`shippingDate != null` IS THE DISCRIMINATOR, not the status set**, and
 * the plan calls codifying this the single highest-value line in the obligation
 * design. The reason is that "cancel before dispatch" and "cancel after
 * dispatch" are different EVENTS with different money:
 *
 * | | before dispatch | after dispatch |
 * |---|---|---|
 * | what happens | cancel, restock, full refund | refuse the cancel — convert to a return/RTO |
 * | who bears shipping | nobody; it is refunded | the buyer bears the outbound leg |
 * | when money moves | immediately | on receipt of the goods |
 *
 * The status set cannot express that, because `processing` covers both "paid,
 * sitting in a queue" and "packed, courier collecting this afternoon" — while
 * `shippingDate` is the fact that the parcel physically left.
 *
 * And the old behaviour was a dead end: `ORDER_CANCELLABLE_STATUSES` is
 * `["pending", "confirmed"]`, so a buyer whose order was `processing` — or
 * shipped an hour ago — got a flat *"Only pending or confirmed orders can be
 * cancelled"* and **no alternative offered**. That is the Root Cause #56 shape
 * (a surface that refuses without routing anywhere) applied to money.
 */
export type CancellationRoute =
  | { route: "cancel"; reason: "not yet dispatched" }
  | { route: "return"; reason: "already dispatched"; dispatchedAt: Date }
  | { route: "refused"; reason: string };

export function classifyCancellation(order: OrderDocument): CancellationRoute {
  /*
   * Terminal first. A cancelled or refunded order is not a cancellation
   * request, it is a duplicate — and answering "convert this to a return"
   * would send the buyer into a flow for goods they no longer have.
   */
  if (order.status === "cancelled" || order.status === "refunded") {
    return { route: "refused", reason: `this order is already ${order.status}` };
  }

  /*
   * A return already in flight is its own conversation. Offering a cancellation
   * on top would give the buyer two parallel money paths for one order, which
   * is how a double refund starts.
   */
  if (order.status === "return_requested" || order.status === "returned") {
    return { route: "refused", reason: "a return is already in progress for this order" };
  }

  if (order.shippingDate) {
    return {
      route: "return",
      reason: "already dispatched",
      dispatchedAt: order.shippingDate,
    };
  }

  return { route: "cancel", reason: "not yet dispatched" };
}

export async function assertOrderCancellable(orderId: string, userId: string): Promise<OrderDocument> {
  const order = await assertOrderOwnership(orderId, userId);
  /*
   * 🛑 The classifier decides, and `ORDER_CANCELLABLE_STATUSES` is now only a
   * BACKSTOP below rather than the rule.
   *
   * Kept in that order deliberately: the classifier widens what is cancellable
   * (a `processing` order that has not shipped now qualifies, correctly), and
   * the status check behind it still refuses anything the classifier admitted
   * but the lifecycle does not recognise. Replacing the status check outright
   * would have been a wider behaviour change than the evidence supports.
   */
  const route = classifyCancellation(order);
  if (route.route === "return") {
    throw new OrderCancelError(
      `${order.status} (dispatched ${route.dispatchedAt.toISOString()} — request a return instead)`,
    );
  }
  if (route.route === "refused") {
    throw new OrderCancelError(`${order.status} (${route.reason})`);
  }
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
