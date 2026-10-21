/**
 * Orders Domain Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../../../errors";

import { serverLogger } from "../../../monitoring";
import { getProviders } from "../../../contracts";
import { orderRepository } from "../repository/orders.repository";
import type { OrderDocument, OrderDocumentItem, OrderPlain } from "../schemas";
import type { TrackingInfo } from "../../../contracts/shipping";
import { ORDER_CANCELLABLE_STATUSES } from "../../../_internal/shared/features/orders/config";

const ERR_ORDER_NOT_FOUND = "Order not found";

function assertCancellable(order: OrderDocument): void {
  if (
    !ORDER_CANCELLABLE_STATUSES.includes(
      order.status as (typeof ORDER_CANCELLABLE_STATUSES)[number],
    )
  ) {
    throw new ValidationError(
      "Only pending or confirmed orders can be cancelled",
    );
  }
}

export async function cancelOrderForUser(
  userId: string,
  orderId: string,
  reason: string,
): Promise<void> {
  const order = await orderRepository.findById(orderId);

  if (!order) throw new NotFoundError(ERR_ORDER_NOT_FOUND);
  if (order.userId !== userId)
    throw new AuthorizationError("You are not authorised to cancel this order");

  assertCancellable(order);

  await orderRepository.cancelOrder(orderId, reason);

  serverLogger.info("Order cancelled by user", { userId, orderId, reason });
}

/**
 * Cancels a subset of line items on an already-placed order and lets the rest
 * proceed. Matches today's whole-order cancellation behavior: marks the items
 * cancelled + sets `refundPending: true`, leaves the actual refund to the
 * existing admin-initiated flow (no auto-refund call here). If every item on
 * the order ends up cancelled, falls through to the same whole-order
 * `cancelOrder` path `cancelOrderForUser` uses, rather than leaving a
 * zero-item live order.
 */
export async function cancelOrderItemsForUser(
  userId: string,
  orderId: string,
  itemIds: string[],
  reason: string,
): Promise<void> {
  if (itemIds.length === 0) {
    return cancelOrderForUser(userId, orderId, reason);
  }

  const order = await orderRepository.findById(orderId);

  if (!order) throw new NotFoundError(ERR_ORDER_NOT_FOUND);
  if (order.userId !== userId)
    throw new AuthorizationError("You are not authorised to cancel this order");

  assertCancellable(order);

  const items = order.items ?? [];
  const targetIds = new Set(itemIds);
  const matchedIds = new Set(
    items.filter((i) => targetIds.has(i.productId)).map((i) => i.productId),
  );
  if (matchedIds.size === 0) {
    throw new ValidationError("None of the selected items belong to this order");
  }

  const allCancelled = items.every(
    (i) => matchedIds.has(i.productId) || i.cancelledQuantity != null,
  );
  if (allCancelled) {
    return cancelOrderForUser(userId, orderId, reason);
  }

  const cancelledAt = new Date();
  const updatedItems: OrderDocumentItem[] = items.map((item) =>
    matchedIds.has(item.productId)
      ? {
          ...item,
          cancelledQuantity: item.quantity,
          cancelledAt,
          cancelledReason: reason,
        }
      : item,
  );

  await orderRepository.update(orderId, {
    items: updatedItems,
    refundPending: true,
    updatedAt: cancelledAt,
  });

  serverLogger.info("Order items cancelled by user", {
    userId,
    orderId,
    itemIds: [...matchedIds],
    reason,
  });
}

export async function listOrdersForUser(
  userId: string,
): Promise<OrderDocument[]> {
  return orderRepository.findByUser(userId);
}

/**
 * One order, for the buyer who placed it.
 *
 * 🛑 RETURNS PLAINTEXT, and the return TYPE says so. See
 * `getAddressByIdForUser` for the full reasoning — same defect, same shape.
 *
 * `OrderRepository.mapDoc` does not decrypt, so this returned `enc:v1:` blobs
 * for `userName`, `userEmail` and the `shippingAddress` name and phone, to
 * the buyer, about their own order. Its caller is a server action that hands
 * the result straight to the client.
 *
 * Revealing here rather than at the caller, because this function is what
 * knows the read is owner-scoped: it throws `NotFoundError` — not Forbidden,
 * deliberately, so the response cannot confirm an order exists — for any
 * order whose `userId` is not the caller's.
 */
export async function getOrderByIdForUser(
  userId: string,
  orderId: string,
): Promise<OrderPlain> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError(ERR_ORDER_NOT_FOUND);
  if (order.userId !== userId) throw new NotFoundError(ERR_ORDER_NOT_FOUND);
  return orderRepository.revealOrder(order);
}

/**
 * Retrieve live tracking info for an order via the registered IShippingProvider.
 * Returns null when no shipping provider is registered or no trackingNumber exists.
 */
export async function getTrackingInfo(
  trackingId: string,
): Promise<TrackingInfo | null> {
  const { shipping } = getProviders();
  if (!shipping) {
    serverLogger.warn(
      "getTrackingInfo called but no shipping provider registered",
    );
    return null;
  }
  return shipping.trackShipment(trackingId);
}
