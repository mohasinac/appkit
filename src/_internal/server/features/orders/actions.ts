"use server";

import { orderRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from "../../../shared/features/orders/schema";
import { assertOrderCancellable, assertOrderOwnership, assertReturnWindowOpen } from "./service";
import { ValidationError } from "../../../shared/errors/index";
import { OrderNotFoundError, OrderOwnershipError } from "../../../shared/features/orders/errors";

export async function createOrderAction(input: unknown) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid order input");
  return orderRepository.create({
    ...(parsed.data as any),
    userId: user.uid,
    status: "pending",
  } as any);
}

export async function cancelOrderAction(input: unknown) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  await assertOrderCancellable(parsed.data.orderId, user.uid);
  return orderRepository.cancelOrder(parsed.data.orderId, parsed.data.reason ?? "Cancelled by user");
}

export async function requestReturnAction(input: unknown) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  await assertReturnWindowOpen(parsed.data.orderId, user.uid);
  return orderRepository.updateStatus(parsed.data.orderId, "return_requested" as any);
}

export async function updateOrderStatusAction(input: unknown) {
  const user = await requireRoleUser(["seller", "admin"]);
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  const order = await orderRepository.findById(parsed.data.orderId).catch(() => null);
  if (!order) throw new OrderNotFoundError(parsed.data.orderId);
  if (user.role !== "admin" && order.storeId !== user.uid) {
    throw new OrderOwnershipError(parsed.data.orderId);
  }
  return orderRepository.updateStatus(parsed.data.orderId, parsed.data.status as any, {
    trackingNumber: parsed.data.trackingNumber,
    shippingCarrier: parsed.data.carrier,
  } as any);
}
