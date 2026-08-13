"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { orderRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from "../../../shared/features/orders/schema";
import { assertOrderCancellable, assertReturnWindowOpen } from "./service";
import { ValidationError } from "../../../shared/errors/index";
import { OrderNotFoundError, OrderOwnershipError } from "../../../shared/features/orders/errors";
import { isAdminUser, isModeratorUser } from "../../../../features/auth/role-predicates";

export async function createOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = createOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid order input");
      return orderRepository.create({
        ...(parsed.data as any),
        userId: user.uid,
        status: "pending",
      } as any);
  });
}

export async function cancelOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = cancelOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      await assertOrderCancellable(parsed.data.orderId, user.uid);
      return orderRepository.cancelOrder(parsed.data.orderId, parsed.data.reason ?? "Cancelled by user");
  });
}

export async function requestReturnAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = cancelOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      await assertReturnWindowOpen(parsed.data.orderId, user.uid);
      return orderRepository.updateStatus(parsed.data.orderId, "return_requested" as any);
  });
}

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const parsed = updateOrderStatusSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const order = await orderRepository.findById(parsed.data.orderId).catch(() => null);
      if (!order) throw new OrderNotFoundError(parsed.data.orderId);
      if (!isAdminUser(user) && order.storeId !== user.uid) {
        throw new OrderOwnershipError(parsed.data.orderId);
      }
      return orderRepository.updateStatus(parsed.data.orderId, parsed.data.status as any, {
        trackingNumber: parsed.data.trackingNumber,
        shippingCarrier: parsed.data.carrier,
      } as any);
  });
}

// ── P-1 Manual payment proof ─────────────────────────────────────────────────

export async function attachPaymentProofAction(
  orderId: string,
  proof: { proofUrl: string; transactionId?: string; mimeType?: string },
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
    const order = await orderRepository.findById(orderId).catch(() => null);
    if (!order) throw new OrderNotFoundError(orderId);
    if (!isAdminUser(user) && order.userId !== user.uid) throw new OrderOwnershipError(orderId);
    const pm = order.paymentMethod ?? "";
    if (pm !== "cash" && pm !== "upi_manual") {
      throw new ValidationError("Payment proof can only be attached to cash or UPI orders");
    }
    if (order.paymentProofUrl) {
      throw new ValidationError("PROOF_ALREADY_ATTACHED");
    }
    await orderRepository.update(orderId, {
      paymentProofUrl: proof.proofUrl,
      paymentTransactionId: proof.transactionId,
      paymentProofMimeType: proof.mimeType,
      paymentProofUploadedAt: new Date(),
    } as any);
  });
}

export async function adminVerifyPaymentAction(orderId: string): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);
    if (!isAdminUser(user) && !isModeratorUser(user)) {
      throw new ValidationError("Only admin or moderator can verify payments");
    }
    const order = await orderRepository.findById(orderId).catch(() => null);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.paymentStatus === "paid") return; // idempotent
    await orderRepository.update(orderId, {
      paymentStatus: "paid",
      paymentId: order.paymentTransactionId ?? order.paymentId ?? `manual-${orderId}`,
      status: "processing",
      paymentRecord: {
        method: "manual",
        transactionId: order.paymentTransactionId,
        proofUrl: order.paymentProofUrl,
        amountPaise: order.totalPrice,
        paidAt: new Date(),
        verifiedBy: user.uid,
        verificationMethod: "manual_review",
      },
    } as any);
  });
}
