/**
 * The self-shipped postage reimbursement — D45's other half.
 *
 * ## Why this is a separate module from `reconcile.ts`
 *
 * `reconcileOrderShipping` runs at DISPATCH, on an order that went through the
 * courier picker, and compares a quote against a declared spend. This runs on
 * an order with NO quote, is triggered by a seller submitting evidence and then
 * by an admin approving it, and compares what the buyer paid against an
 * approved receipt. Different trigger, different inputs, different actor.
 *
 * 🛑 But they write the SAME `shippingReconciliation` field, and that is
 * deliberate: two records of "what shipping actually cost" on one order is the
 * denormalised-mirror trap (Root Cause #42). Sharing the field also shares the
 * idempotency key — its presence is what stops a double-approval paying twice,
 * exactly as it stops a double-dispatch crediting points twice.
 *
 * ## The owner's rule, verbatim
 *
 * *"If seller ships on their own then they have to upload the receipt of the
 * shipment with the tracking number so that it is paid to them directly; if
 * they use our platform's integration (Shiprocket) to place the order, they do
 * not get the money, the platform keeps it… The seller may set an initial value
 * of shipping but the only approved amount will be given to them."*
 *
 * Plus: reimbursement **capped at what the buyer paid**, and the saving to the
 * **buyer as points**.
 *
 * ## The invariant worth stating
 *
 * **The platform nets exactly zero on shipping in every case.**
 *
 * | buyer paid | approved receipt | seller gets | buyer gets | platform |
 * |---|---|---|---|---|
 * | ₹120 | ₹80  | ₹80  | ₹40 points | **₹0** |
 * | ₹80  | ₹120 | ₹80  | —          | **₹0** |
 * | ₹100 | ₹100 | ₹100 | —          | **₹0** |
 */

import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import { pointsRepository } from "../../../../features/points/repository/points.repository";
import {
  reconcileShipping,
  isReimbursableShipment,
} from "../../../shared/shipping/quote";

import { serverLogger } from "../../../../monitoring";
import type { ReconcileShippingResult } from "./reconcile";
import { formatMoney } from "../../../../utils/number.formatter";

export interface SubmitShippingEvidenceInput {
  orderId: string;
  /** What the seller says the postage cost. An ESTIMATE, not an entitlement. */
  declaredAmount: number;
  evidenceUrl?: string;
  trackingNumber?: string;
}

/**
 * The seller submits postage evidence on a self-shipped order.
 *
 * ## 🛑 It records a CLAIM and moves nothing
 *
 * *"The seller may set an initial value of shipping but the only approved
 * amount will be given to them."* So this writes `declaredAmount` and stops.
 * The entitlement is `approvedAmount`, written only once a human has read the
 * receipt — and they are separate fields rather than one that gets
 * overwritten, because a seller who claims ₹120 and is approved ₹80 must leave
 * both figures visible.
 *
 * ## 🛑 The platform-booked refusal is about WHO BOOKED, not about evidence
 *
 * `isReimbursableShipment` keys on the booking. Gating on "a receipt exists"
 * would be the exploitable version: a seller could upload a receipt for a
 * parcel we paid Shiprocket for and be reimbursed for our own spend.
 *
 * Refused HERE as well as at approval, so the seller is told at submission
 * rather than after waiting for a review that could only ever decline. That is
 * the dead-end shape avoided (Root Cause #56).
 */
export async function submitShippingEvidence(
  input: SubmitShippingEvidenceInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const order = await orderRepository.findById(input.orderId);
  if (!order) return { ok: false, reason: "That order does not exist." };

  if (!isReimbursableShipment(order)) {
    return {
      ok: false,
      reason:
        "This parcel was booked and paid for through the platform's courier integration, so there is no postage to reimburse.",
    };
  }

  if (order.shippingReimbursement?.approvedAt) {
    return { ok: false, reason: "A reimbursement has already been approved on this order." };
  }

  if (!Number.isFinite(input.declaredAmount) || input.declaredAmount < 0) {
    return { ok: false, reason: "The declared postage needs to be a number." };
  }

  await orderRepository.update(input.orderId, {
    shippingReimbursement: {
      declaredAmount: input.declaredAmount,
      ...(input.evidenceUrl ? { evidenceUrl: input.evidenceUrl } : {}),
      ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
      submittedAt: new Date(),
      /*
       * No approved values carried forward — there are none, because the
       * `approvedAt` guard above refuses resubmission after approval. Before
       * approval a seller may correct their claim freely, which is the right
       * affordance: the alternative is a support ticket to fix a typo.
       */
    },
  });

  return { ok: true };
}

export interface ApproveShippingReimbursementInput {
  orderId: string;
  /** What an admin will actually pay. May differ from the declared amount. */
  approvedAmount: number;
  /** Why, when it differs from what was declared. */
  note?: string;
  /** 🛑 An admin uid. Never `"system"` — see below. */
  approvedBy: string;
}

/**
 * An admin approves a postage reimbursement.
 *
 * ## 🛑 Never automatic, and the ABSENCE of a system path is the enforcement
 *
 * This moves money to a seller on the strength of a document somebody has to
 * look at. There is no overload accepting `"system"`, and the guard below
 * throws on it — the same shape and the same reason as
 * `paymentCasesRepository.resolve()`. A rule enforced by a flag can be flipped;
 * a rule enforced by the absence of a code path cannot.
 *
 * ## 🛑 The cap is `shippingFee`, NOT the quote — and getting that backwards is easy
 *
 * There is no `selectedShippingQuote` on this branch; its absence is what makes
 * it this branch. The distinction between the two figures is real:
 *
 *   · the QUOTE answers *"did the seller save money against what they told the
 *     buyer"* — the right basis for the dispatch-time comparison;
 *   · `shippingFee` answers *"what did the buyer actually hand over"* — the
 *     right basis for a cap, and the owner's stated one.
 *
 * Reading the quote here would be `undefined` and would cap everything at
 * zero. Conversely, inventing a quote from `shippingFee` on the OTHER branch
 * would compare a real spend against a number that was never a courier quote,
 * which is exactly why that branch refuses to do it.
 *
 * ## The saving still goes to the buyer, because it is ONE rule for both branches
 *
 * A buyer's outcome must not depend on whether a courier picker happened to be
 * involved in their order.
 */
export async function approveShippingReimbursement(
  input: ApproveShippingReimbursementInput,
): Promise<ReconcileShippingResult & { approved: number }> {
  const nothing = {
    outcome: null as null,
    sellerAbsorbs: 0,
    buyerPoints: 0,
    reimbursable: 0,
    approved: 0,
  };

  if (!input.approvedBy || input.approvedBy === "system") {
    /*
     * Thrown, not returned. A caller that ignored an `{ ok: false }` here would
     * have approved a payout with no human behind it, and that is not a
     * condition to hand back as data for someone to forget to check.
     */
    throw new Error(
      "A shipping reimbursement must be approved by a named admin — there is no system approver.",
    );
  }

  const order = await orderRepository.findById(input.orderId);
  if (!order) return { ...nothing, skipped: "no-quote" as const };

  if (!isReimbursableShipment(order)) {
    return { ...nothing, skipped: "no-quote" as const };
  }

  if (!order.shippingReimbursement) {
    /*
     * Its own skip reason rather than a silent zero: "the seller has not
     * claimed yet" and "we decided nothing is owed" are different facts, and an
     * operator surface has to be able to tell them apart.
     */
    return { ...nothing, skipped: "awaiting-evidence" as const };
  }

  if (order.shippingReconciliation) {
    return {
      outcome: null,
      sellerAbsorbs: order.shippingReconciliation.sellerAbsorbs,
      buyerPoints: order.shippingReconciliation.buyerPoints,
      reimbursable: order.shippingReconciliation.reimbursable ?? 0,
      approved: order.shippingReimbursement.approvedAmount ?? 0,
      skipped: "already-reconciled" as const,
    };
  }

  const chargedToBuyer =
    typeof order.shippingFee === "number" && Number.isFinite(order.shippingFee)
      ? Math.max(0, order.shippingFee)
      : 0;
  const spent = Math.max(0, input.approvedAmount);

  /*
   * The SAME pure function the quoted branch uses, fed the buyer-paid figure as
   * the charged rate. One formula, both branches — which is the whole reason
   * `reimbursable` was added to it rather than computed a second time here
   * (Root Cause #75).
   *
   * The courier ids are a matched sentinel pair so `courierChanged` comes out
   * false: on a self-shipped order the buyer never chose a courier, so "the
   * seller changed it" is not a fact that exists.
   */
  const result = reconcileShipping(
    { chargedRate: chargedToBuyer, courierId: "self-shipped" },
    { actualRate: spent, courierId: "self-shipped", courierName: "Seller-arranged" },
  );

  if (result.buyerPoints > 0 && order.userId) {
    await pointsRepository.append({
      userId: order.userId,
      kind: "shipping_saving",
      amount: result.buyerPoints,
      orderId: input.orderId,
      /*
       * Names both figures. "₹40 points" alone is unexplainable weeks later,
       * and this string is written once and never re-derived, so it stays true
       * of the moment it describes.
       */
      description:
        `Shipping saving on ${input.orderId}: you paid ${formatMoney(chargedToBuyer)} for postage, ` +
        `the approved cost was ${formatMoney(spent)}.`,
    });
  }

  await orderRepository.update(input.orderId, {
    shippingReimbursement: {
      ...order.shippingReimbursement,
      approvedAmount: spent,
      approvedBy: input.approvedBy,
      approvedAt: new Date(),
      ...(input.note ? { approvalNote: input.note } : {}),
    },
    shippingReconciliation: { ...result, reconciledAt: new Date() },
  });

  serverLogger.info("shipping reimbursement approved", {
    orderId: input.orderId,
    declared: order.shippingReimbursement.declaredAmount,
    approved: spent,
    chargedToBuyer,
    buyerPoints: result.buyerPoints,
    approvedBy: input.approvedBy,
  });

  return {
    outcome:
      result.buyerPoints > 0 ? "credited" : result.sellerAbsorbs > 0 ? "seller-absorbed" : "exact",
    sellerAbsorbs: result.sellerAbsorbs,
    buyerPoints: result.buyerPoints,
    reimbursable: result.reimbursable,
    approved: spent,
  };
}
