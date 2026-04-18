import { getAdminDb } from "../../../providers/db-firebase";
import type {
  FailedCheckoutReason,
  FailedPaymentReason,
} from "../schemas/firestore";
import {
  FAILED_CHECKOUTS_COLLECTION,
  FAILED_PAYMENTS_COLLECTION,
} from "../schemas/firestore";

export interface FailedCheckoutMeta {
  addressId?: string;
  paymentMethod?: string;
  cartTotal?: number;
  cartItemCount?: number;
}

export interface FailedPaymentMeta {
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amountRs?: number;
  addressId?: string;
}

export class FailedCheckoutRepository {
  async logCheckout(
    uid: string,
    reason: FailedCheckoutReason,
    detail?: string,
    meta?: FailedCheckoutMeta,
  ): Promise<void> {
    const db = getAdminDb();
    const ref = db.collection(FAILED_CHECKOUTS_COLLECTION).doc();
    await ref.set({
      id: ref.id,
      uid,
      reason,
      ...(detail ? { detail } : {}),
      ...(meta ?? {}),
      createdAt: new Date(),
    });
  }

  async logPayment(
    uid: string,
    reason: FailedPaymentReason,
    detail?: string,
    meta?: FailedPaymentMeta,
  ): Promise<void> {
    const db = getAdminDb();
    const ref = db.collection(FAILED_PAYMENTS_COLLECTION).doc();
    await ref.set({
      id: ref.id,
      uid,
      reason,
      ...(detail ? { detail } : {}),
      ...(meta ?? {}),
      createdAt: new Date(),
    });
  }
}

export const failedCheckoutRepository = new FailedCheckoutRepository();
