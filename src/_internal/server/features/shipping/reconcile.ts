/**
 * Close the loop on one order's shipping: compare what the buyer was charged
 * with what the seller actually spent, and credit the difference as points.
 *
 * Called from the seller's dispatch path, once the real postage is known.
 */
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import { pointsRepository } from "../../../../features/points/repository/points.repository";
import {
  reconcileShipping,
  type ActualShipmentCost,
} from "../../../shared/shipping/quote";
import { serverLogger } from "../../../../monitoring";
import { formatMoney } from "../../../../utils/number.formatter";

export interface ReconcileShippingResult {
  /** `null` when there was nothing to reconcile — see the reasons below. */
  outcome: "credited" | "seller-absorbed" | "exact" | null;
  sellerAbsorbs: number;
  buyerPoints: number;
  /**
   * Rupees of postage the seller is owed back — `min(spent, charged)`.
   *
   * 🛑 Computed on BOTH branches, because today the platform keeps shipping in
   * the quoted path too, so D45 is a fix for both rather than a new rule for
   * one. Whether it is PAID is a separate gate: `isReimbursableShipment`
   * refuses a Shiprocket-booked parcel, which we paid for ourselves.
   */
  reimbursable: number;
  /** Why nothing happened, when `outcome` is null. For logs and the UI. */
  skipped?: "no-quote" | "already-reconciled" | "no-buyer" | "awaiting-evidence";
}

/**
 * 🛑 IDEMPOTENT, and the guard is `order.shippingReconciliation` being unset.
 *
 * Crediting points is an APPEND to a ledger. Appends do not deduplicate
 * themselves, so a dispatch action that fired twice — a double-clicked button,
 * a retried job, a webhook delivered again — would pay the buyer twice, and
 * nothing downstream could distinguish that from two genuine savings. The
 * reconciliation record is written in the same step as the credit precisely so
 * it can be the key.
 *
 * It deliberately does NOT use a transaction spanning the order and the
 * ledger: `pointsRepository.append` already runs its own transaction over the
 * ledger and the balance mirror, and nesting would mean reading the order
 * inside it for no added safety. The residual risk is a crash between the
 * credit and the order write, which leaves a credited buyer and an order that
 * looks unreconciled — recoverable, and strictly better than the alternative
 * ordering, which would mark the order done and then fail to pay.
 */
export async function reconcileOrderShipping(
  orderId: string,
  actual: ActualShipmentCost,
): Promise<ReconcileShippingResult> {
  const order = await orderRepository.findById(orderId);

  if (!order) {
    return {
      outcome: null,
      sellerAbsorbs: 0,
      buyerPoints: 0,
      reimbursable: 0,
      skipped: "no-quote",
    };
  }

  /*
   * No quote means this order never went through the courier picker — a
   * manually-shipped seller, or an order placed before the feature. There is
   * no charged figure to measure against, so there is nothing to reconcile.
   * Inventing one from the flat `shippingFee` would compare the buyer's spend
   * against a number that was never a courier quote.
   */
  if (!order.selectedShippingQuote) {
    /*
     * 🛑 THIS SKIP BRANCH IS THE D45 CASE, and that is why it is still a skip
     * HERE rather than being handled inline.
     *
     * No quote means the seller shipped manually, so there is no quoted figure
     * to measure a saving against — and the money question is a different one:
     * what did the postage actually cost, proven by a receipt an admin has
     * approved. That is an admin-triggered event, not a dispatch-triggered one,
     * so it lives in `approveShippingReimbursement` below. Both write the SAME
     * `shippingReconciliation` field and therefore share one idempotency key.
     */
    return {
      outcome: null,
      sellerAbsorbs: 0,
      buyerPoints: 0,
      reimbursable: 0,
      skipped: "no-quote",
    };
  }

  if (order.shippingReconciliation) {
    return {
      outcome: null,
      sellerAbsorbs: order.shippingReconciliation.sellerAbsorbs,
      buyerPoints: order.shippingReconciliation.buyerPoints,
      reimbursable: order.shippingReconciliation.reimbursable ?? 0,
      skipped: "already-reconciled",
    };
  }

  const result = reconcileShipping(order.selectedShippingQuote, actual);
  const buyerUid = order.userId;

  if (result.buyerPoints > 0) {
    if (!buyerUid) {
      /*
       * A credit with nobody to credit. Recorded rather than thrown: the
       * parcel has shipped and the seller's dispatch must not fail because we
       * cannot find the buyer — but this is a real data fault and has to be
       * loud enough to find.
       */
      serverLogger.error("shipping reconciliation has points but no buyer", {
        orderId,
        buyerPoints: result.buyerPoints,
      });
      return {
        outcome: null,
        sellerAbsorbs: 0,
        buyerPoints: 0,
        reimbursable: 0,
        skipped: "no-buyer",
      };
    }

    await pointsRepository.append({
      userId: buyerUid,
      kind: "shipping_saving",
      amount: result.buyerPoints,
      orderId,
      /*
       * Names both couriers and both figures, because "53 points" on its own
       * is unexplainable six weeks later — and this string is written once and
       * never re-derived, so it stays true of the moment it describes even if
       * the order is edited afterwards.
       */
      description:
        `Shipping saving on ${orderId}: charged ${formatMoney(order.selectedShippingQuote.chargedRate)} ` +
        `for ${order.selectedShippingQuote.courierName}, shipped ${formatMoney(actual.actualRate)} ` +
        `via ${actual.courierName}.`,
    });
  }

  await orderRepository.update(orderId, {
    actualShipmentCost: actual,
    shippingReconciliation: { ...result, reconciledAt: new Date() },
  });

  return {
    outcome:
      result.buyerPoints > 0 ? "credited" : result.sellerAbsorbs > 0 ? "seller-absorbed" : "exact",
    sellerAbsorbs: result.sellerAbsorbs,
    buyerPoints: result.buyerPoints,
    reimbursable: result.reimbursable,
  };
}
