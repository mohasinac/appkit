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
import { orderRepository } from "../repository/orders.repository";
import type { OrderDocument } from "../schemas";

const CANCELLABLE_STATUSES = ["pending", "confirmed"] as const;

export async function cancelOrderForUser(
  userId: string,
  orderId: string,
  reason: string,
): Promise<void> {
  const order = await orderRepository.findById(orderId);

  if (!order) throw new NotFoundError("Order not found");
  if (order.userId !== userId)
    throw new AuthorizationError("You are not authorised to cancel this order");

  if (
    !CANCELLABLE_STATUSES.includes(
      order.status as (typeof CANCELLABLE_STATUSES)[number],
    )
  ) {
    throw new ValidationError(
      "Only pending or confirmed orders can be cancelled",
    );
  }

  await orderRepository.cancelOrder(orderId, reason);

  serverLogger.info("Order cancelled by user", { userId, orderId, reason });
}

export async function listOrdersForUser(
  userId: string,
): Promise<OrderDocument[]> {
  return orderRepository.findByUser(userId);
}

export async function getOrderByIdForUser(
  userId: string,
  orderId: string,
): Promise<OrderDocument> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order not found");
  if (order.userId !== userId) throw new NotFoundError("Order not found");
  return order;
}
