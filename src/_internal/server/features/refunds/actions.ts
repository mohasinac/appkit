"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
/**
 * processRefundAction — append a refund event to an order.
 *
 * Supports two paths:
 *  - Razorpay: calls the payment provider's `refund()` method, then records
 *    the razorpayRefundId on the event.
 *  - Manual: no payment-provider call; records manualTransactionId + optional
 *    proof document URL.
 *
 * Both paths require `confirmIrrevocable: true` from the caller to prevent
 * accidental use — callers must acknowledge the action is non-reversible.
 *
 * Setting `contestable` to false is a side-effect of `orderRepository.postRefundEvent`.
 */

import { randomUUID } from "crypto";
import { getProviders } from "../../../../contracts/registry";
import { normalizeError } from "../../../../errors/normalize";
import { rupeesToPaise } from "../../../../providers/payment-razorpay/index";
import { orderRepository } from "../../../..";
import { ORDER_FIELDS } from "../../../../constants/field-names";
import { NotFoundError, ValidationError } from "../../../../errors";
import { serverLogger } from "../../../../monitoring";
import type { OrderRefundEvent, RefundType } from "../../../../features/orders/schemas";
import {
  isFinalSaleExempt,
  RETURN_REASON_LABEL,
  type ReturnReason,
} from "../../../shared/features/orders/return-reasons";
import { REFUND_COPY } from "../../../shared/features/orders/refund-copy";
import { applyRefundDeductionAction } from "../payouts/actions";
import { getAdminDb } from "../../../../providers/db-firebase";
import {
  PRODUCT_COLLECTION,
  PRODUCT_CODES_SUBCOLLECTION,
} from "../../../../features/products/schemas/firestore";

type DigitalCodeItem = { productId: string; listingType?: string };

/**
 * SB-UNI-N — block the refund if any of the order's digital codes has already
 * been claimed (revealed). Throws ValidationError on the first claimed code.
 */
async function assertDigitalCodesNotClaimed(
  orderId: string,
  items: ReadonlyArray<DigitalCodeItem>,
): Promise<void> {
  if (items.length === 0) return;
  const db = getAdminDb();
  for (const item of items) {
    const codesSnap = await db
      .collection(PRODUCT_COLLECTION)
      .doc(item.productId)
      .collection(PRODUCT_CODES_SUBCOLLECTION)
      .where("orderId", "==", orderId)
      .limit(1)
      .get();
    if (codesSnap.empty) continue;
    const codeStatus = codesSnap.docs[0].data()?.status as string | undefined;
    if (codeStatus === "claimed") {
      throw new ValidationError(
        "The digital code for this order has already been revealed and cannot be refunded automatically. Please contact support.",
      );
    }
  }
}

/**
 * SB-UNI-N — fire-and-forget revoke of any AVAILABLE (unclaimed) digital code
 * tied to the refunded order. Failures are logged but never thrown.
 */
function revokeAvailableDigitalCodes(
  orderId: string,
  items: ReadonlyArray<DigitalCodeItem>,
): void {
  if (items.length === 0) return;
  const db = getAdminDb();
  for (const item of items) {
    db.collection(PRODUCT_COLLECTION)
      .doc(item.productId)
      .collection(PRODUCT_CODES_SUBCOLLECTION)
      .where("orderId", "==", orderId)
      .where(ORDER_FIELDS.STATUS, "==", "available")
      .limit(1)
      .get()
      .then((snap) => revokeFirstSnapDoc(snap))
      .catch((e) => serverLogger.error("refund: code query failed", { error: normalizeError(e).message }));
  }
}

function revokeFirstSnapDoc(snap: FirebaseFirestore.QuerySnapshot): void {
  if (snap.empty) return;
  snap.docs[0].ref
    .update({ status: "revoked", updatedAt: new Date() })
    .catch((e) => serverLogger.error("refund: code revoke failed", { error: normalizeError(e).message }));
}

export type ProcessRefundInput = {
  orderId: string;
  type: RefundType;
  /** Decimal rupees. Must be > 0 and ≤ remaining refundable amount on the order. */
  amount: number;
  /**
   * Coded reason. Replaced a free-text `reason: string` — final sale has to
   * refuse a change-of-mind return while always allowing a "didn't get what I
   * paid for" claim, and that decision cannot be made against prose.
   */
  reasonCode: ReturnReason;
  /** Optional human elaboration, stored alongside the code. */
  reasonNote?: string;
  /** Product/item ids affected (for partial refunds). */
  itemIds?: string[];
  /** Required: caller must explicitly confirm this action is irrevocable. */
  confirmIrrevocable: true;
  /** uid of the user processing the refund (admin / seller). */
  refundedBy: string;
} & (
  | {
      method: "razorpay";
      /** Razorpay paymentId from the order (order.paymentId). */
      razorpayPaymentId: string;
      manualTransactionId?: never;
      proofDocumentUrl?: never;
      proofDocumentMimeType?: never;
    }
  | {
      method: "manual";
      razorpayPaymentId?: never;
      manualTransactionId?: string;
      proofDocumentUrl?: string;
      proofDocumentMimeType?: string;
    }
);

export async function processRefundAction(
  input: ProcessRefundInput,
): Promise<ActionResult<{ success: true; refundId: string }>> {
  return wrapAction(async () => {
    const order = await orderRepository.findById(input.orderId);
      if (!order) throw new NotFoundError(`Order ${input.orderId} not found`);
    
      if (input.amount <= 0) throw new ValidationError("Refund amount must be positive");
      if (input.amount > order.totalPrice) {
        throw new ValidationError("Refund amount exceeds order total");
      }
    
      // Guard: non-refundable orders (prize draws, bundles). A property of the
      // listing TYPE, decided by the platform — checked first because it
      // admits no exception, not even a seller-fault one.
      if (order.isNonRefundable) {
        throw new ValidationError("This order is marked non-refundable and cannot be refunded.");
      }

      /*
       * Guard: final sale.
       *
       * Unlike `isNonRefundable` this is per-LINE and reason-dependent. A
       * seller-fault claim is never blocked, however the listing was sold —
       * "no returns" is a statement about changing your mind, not a waiver of
       * the seller's obligation to ship what was described.
       *
       * Read from the ORDER's snapshot, never from the product: the buyer
       * agreed to the terms shown at checkout, and re-reading the live product
       * would let a seller flip the switch afterwards.
       */
      if (!isFinalSaleExempt(input.reasonCode)) {
        const scopedItems = input.itemIds?.length
          ? (order.items ?? []).filter((i) => input.itemIds!.includes(i.productId))
          : (order.items ?? []);
        if (scopedItems.some((i) => i.finalSale === true)) {
          throw new ValidationError(REFUND_COPY.request.finalSaleBlockedMessage);
        }
      }
    
      // SB-UNI-N — digital-code refund gate: block if code is already claimed (revealed).
      const digitalCodeItems = (order.items ?? []).filter(
        (i) => (i.listingType ?? "standard") === "digital-code",
      );
      await assertDigitalCodesNotClaimed(input.orderId, digitalCodeItems);
    
      const refundId = randomUUID();
      const now = new Date();
      let razorpayRefundId: string | undefined;
    
      if (input.method === "razorpay") {
        const payment = getProviders().payment;
        if (!payment) throw new ValidationError("Payment provider not configured");
        const result = await payment.refund(input.razorpayPaymentId, rupeesToPaise(input.amount));
        razorpayRefundId = result.id;
      }

      const isFull = input.amount >= order.totalPrice;

      const event: OrderRefundEvent = {
        refundId,
        type: input.type,
        amount: input.amount,
        ...(input.itemIds?.length ? { itemIds: input.itemIds } : {}),
        reasonCode: input.reasonCode,
        // `reason` stays the human-readable string every existing refund row
        // and every rendering of RefundHistoryTable already reads. It is now
        // DERIVED from the code rather than typed freehand, so the two can
        // never disagree about why a refund happened.
        reason: input.reasonNote
          ? `${RETURN_REASON_LABEL[input.reasonCode]} — ${input.reasonNote}`
          : RETURN_REASON_LABEL[input.reasonCode],
        refundedAt: now,
        refundedBy: input.refundedBy,
        ...(razorpayRefundId ? { razorpayRefundId } : {}),
        ...(input.method === "manual" && input.manualTransactionId
          ? { manualTransactionId: input.manualTransactionId }
          : {}),
        ...(input.method === "manual" && input.proofDocumentUrl
          ? {
              proofDocumentUrl: input.proofDocumentUrl,
              proofDocumentMimeType: input.proofDocumentMimeType,
            }
          : {}),
      };
    
      await orderRepository.postRefundEvent(input.orderId, event, isFull);
    
      // SB-UNI-N — revoke any available (unclaimed) digital codes linked to this order.
      revokeAvailableDigitalCodes(input.orderId, digitalCodeItems);
    
      // Fire-and-forget: deduct from the store's pending payout if one exists.
      // Failure here must not roll back the already-posted refund event.
      if (order.storeId) {
        applyRefundDeductionAction({
          storeId: order.storeId,
          orderId: input.orderId,
          refundId,
          refundedAmount: input.amount,
          // Same derived string the refund event records, so the payout
          // deduction and the refund history read identically.
          reason: event.reason,
        }).catch(() => {/* payout deduction is best-effort */});
      }
    
      return { success: true, refundId };
  });
}
