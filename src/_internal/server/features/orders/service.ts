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
  const order = await orderRepository.findById(orderId).catch(() => null);
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

export async function assertReturnWindowOpen(orderId: string, userId: string): Promise<OrderDocument> {
  const order = await assertOrderOwnership(orderId, userId);
  if (order.status !== "delivered") throw new OrderCancelError(order.status);
  const deliveredAt = order.deliveryDate instanceof Date
    ? order.deliveryDate
    : new Date((order as any).updatedAt ?? Date.now());
  if (Date.now() - deliveredAt.getTime() > ORDER_RETURN_WINDOW_MS) throw new OrderReturnWindowError();
  return order;
}
