"use server";

/**
 * Filing and adjudicating a protection claim — the first callers
 * `protectionAvailability()` and `adjudicateClaim()` have ever had.
 *
 * ## What was wrong (D11)
 *
 * We charge 2% (min ₹30) shipment protection and 3% (min ₹49) sale protection
 * at four money sites. The decision logic, the custody state machine, the
 * window constants and the order fields all existed with **zero callers**, and
 * the refund path did not know the add-on existed. A FAQ promised *"we pursue
 * the courier and refund you"* and *"refunded no questions asked"*.
 *
 * ## The two gates, and why both are server-side
 *
 * 1. **Did the buyer actually buy this cover?** Read off the ORDER's own
 *    `shipmentProtectionFee` / `saleProtectionFee` — the amount charged — not
 *    off the live store or the live settings. A seller must not be able to
 *    withdraw cover after the sale, which is the same snapshot reasoning
 *    `finalSale` uses on the refund path.
 * 2. **Is the window still open?** The `claim-shipping` / `claim-sale`
 *    obligations, derived from `deliveryDate` through
 *    `PROTECTION_CLAIM_WINDOW_HOURS` (48h / 168h). One definition, shared with
 *    the sweep that closes the window and earns the premium.
 */

import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { ValidationError, NotFoundError } from "../../../../errors";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import { protectionClaimsRepository } from "../../../../features/protection-claims/repository/protection-claims.repository";
import {
  PROTECTION_CLAIM_DETAIL_MAX,
  PROTECTION_CLAIM_DETAIL_MIN,
  REASON_TO_KIND,
  createProtectionClaimId,
  type ProtectionClaimDocument,
  type ProtectionClaimReason,
} from "../../../../features/protection-claims/schemas/firestore";
import {
  adjudicateClaim,
  SALE_PROTECTION_MAX_VALUE,
  type ClaimFinding,
} from "../../../shared/features/shipping/protections";
import { deadlinesFor } from "../../../shared/obligations/deadlines";
import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";
import { orderGoodsValue } from "../../../shared/checkout/order-math";
import { formatMoney } from "../../../../utils/number.formatter";

export interface FileProtectionClaimInput {
  orderId: string;
  reason: ProtectionClaimReason;
  detail: string;
  itemIds?: string[];
  evidenceUrls?: string[];
}

/**
 * File a claim as the buyer.
 *
 * 🛑 The COVER KIND is derived from the reason, never taken from the caller.
 * `REASON_TO_KIND` maps transit failures to shipment cover and item failures
 * to sale cover — because letting the buyer pick would let them file a
 * non-delivery against the 7-day sale window after the 48-hour transit window
 * had closed, which is the window rule defeated by a dropdown.
 */
export async function fileProtectionClaimAction(
  input: FileProtectionClaimInput,
): Promise<ActionResult<{ claimId: string }>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);

    const detail = input.detail?.trim() ?? "";
    if (detail.length < PROTECTION_CLAIM_DETAIL_MIN) {
      throw new ValidationError(
        `Please describe what happened in at least ${PROTECTION_CLAIM_DETAIL_MIN} characters — a claim with no account of the problem cannot be assessed.`,
      );
    }
    if (detail.length > PROTECTION_CLAIM_DETAIL_MAX) {
      throw new ValidationError(`Please keep the description under ${PROTECTION_CLAIM_DETAIL_MAX} characters.`);
    }

    const order = await orderRepository.findById(input.orderId);
    if (!order) throw new NotFoundError(`Order ${input.orderId} not found`);
    if (order.userId !== user.uid) {
      throw new ValidationError("You can only claim against your own order.");
    }

    const kind = REASON_TO_KIND[input.reason];

    /*
     * GATE 1 — did this order actually CARRY the cover?
     *
     * 🛑 Read off the order's own recorded fee, not the live store or the live
     * settings. A seller flipping `supportsSaleProtection` off after the sale
     * must not be able to withdraw cover the buyer paid for — the same
     * reasoning `finalSale` uses on the refund path, and the same reason
     * `OrderDocumentItem.finalSale` exists at all.
     */
    const feePaid = kind === "shipping" ? order.shipmentProtectionFee : order.saleProtectionFee;
    if (!feePaid || feePaid <= 0) {
      throw new ValidationError(
        kind === "shipping"
          ? "This order does not carry shipment protection."
          : "This order does not carry sale protection.",
      );
    }

    /*
     * GATE 2 — is the window still open?
     *
     * Derived from the obligation policy, so the buyer's form, the sweep that
     * closes the window, and whatever page shows the deadline all read one
     * definition.
     *
     * 🛑 No `deliveryDate` means the clock has not STARTED, which is not the
     * same as closed — a parcel that never arrived is exactly what shipment
     * cover is for, and refusing it for want of a delivery date would deny the
     * claim the cover most exists for.
     */
    const obligationKind = kind === "shipping" ? "claim-shipping" : "claim-sale";
    const window = deadlinesFor(order).find((d) => d.kind === obligationKind);
    if (order.deliveryDate && window && window.dueAt.getTime() <= Date.now()) {
      throw new ValidationError(
        `The ${kind === "shipping" ? "shipment" : "sale"} protection claim window for this order closed on ${window.dueAt.toLocaleDateString("en-IN")}.`,
      );
    }

    /*
     * The ceiling. `SALE_PROTECTION_MAX_VALUE` (₹25,000) is tested against what
     * was PAID for the claimed goods, which is why `claimedAmount` is
     * snapshotted at filing rather than recomputed later.
     */
    const claimedAmount = orderGoodsValue(order);
    if (kind === "sale" && claimedAmount > SALE_PROTECTION_MAX_VALUE) {
      throw new ValidationError(
        `Sale protection covers orders up to ${formatMoney(SALE_PROTECTION_MAX_VALUE)}. This order is above that, so the claim needs a human — please contact support.`,
      );
    }

    const claim = await protectionClaimsRepository().file({
      kind,
      orderId: order.id,
      storeId: order.storeId ?? "",
      buyerId: user.uid,
      reason: input.reason,
      detail,
      claimedAmount,
      ...(input.itemIds?.length ? { itemIds: input.itemIds } : {}),
      ...(input.evidenceUrls?.length ? { evidenceUrls: input.evidenceUrls } : {}),
      ...(order.isTestData ? { isTestData: true } : {}),
    });

    /*
     * Into the operator queue, because a claim is money at risk with a human
     * decision attached — which is exactly what `paymentCases` is for. Keyed on
     * the claim, so re-filing or a sweep re-observing it produces one case.
     *
     * Fire-and-forget: a queue write must never fail the buyer's claim.
     */
    void paymentCasesRepository()
      .openOrObserve({
        kind: "protection_claim",
        subjectId: `claim:${claim.id}`,
        severity: "warning",
        title: `${kind === "shipping" ? "Shipment" : "Sale"} protection claim — ${order.id}`,
        detail: [
          `A buyer has claimed against protection cover they paid for.`,
          "",
          `Order: ${order.id}`,
          `Store: ${order.storeId ?? "(none)"}`,
          `Cover: ${kind} (fee paid: ${feePaid})`,
          `Reason: ${input.reason}`,
          `Claimed amount: ${claimedAmount}`,
          "",
          detail,
          "",
          `🛑 A PROTECTED claim is refunded unconditionally — the finding decides`,
          `WHO PAYS, never whether the buyer is refunded. See adjudicateClaim.`,
        ].join("\n"),
        entityType: "order",
        entityId: order.id,
        amountAtRisk: claimedAmount,
        orderIds: [order.id],
      })
      .catch((err: unknown) => {
        void normalizeError(err);
      });

    serverLogger.warn("protection claim filed", {
      claimId: claim.id,
      orderId: order.id,
      kind,
      reason: input.reason,
    });

    return { claimId: claim.id };
  });
}

/**
 * Adjudicate as an admin or moderator.
 *
 * 🛑 THE FINDING DECIDES WHO PAYS, NEVER WHETHER A PROTECTED BUYER IS
 * REFUNDED. `adjudicateClaim` encodes that and this action does not
 * second-guess it: on protected cover a `change-of-mind` finding STILL refunds
 * the buyer and moves the cost to the platform, raising a report — because the
 * promise sold was unconditional, and the only honest enforcement against
 * repeat abuse is withdrawing FUTURE eligibility, not denying this claim.
 *
 * 🛑 It records the decision and does NOT move money. The refund is
 * `processRefundAction`'s job, with its own idempotency key — and keeping them
 * apart means a claim that adjudicated but failed to refund leaves an `upheld`
 * claim with no `refundId`, which is a findable state rather than a lost one.
 */
export async function adjudicateProtectionClaimAction(
  claimId: string,
  finding: ClaimFinding,
): Promise<ActionResult<{ outcome: ReturnType<typeof adjudicateClaim> }>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);

    const claim = await protectionClaimsRepository().findById(claimId);
    if (!claim) throw new NotFoundError(`Protection claim ${claimId} not found`);
    if (claim.adjudicatedAt) {
      throw new ValidationError("This claim has already been adjudicated.");
    }

    /*
     * `protectedSale` is whether SALE cover was bought — the only tier
     * `adjudicateClaim` branches on. A shipment claim is assessed on the
     * finding alone, which is correct: transit cover is about the parcel
     * arriving, and "the buyer changed their mind" is not a transit outcome.
     */
    const outcome = adjudicateClaim(claim.kind === "sale", finding);

    await protectionClaimsRepository().adjudicate(claimId, {
      finding,
      outcome,
      adjudicatedBy: user.uid,
    });

    serverLogger.warn("protection claim adjudicated", {
      claimId,
      finding,
      refundBuyer: outcome.refundBuyer,
      costBorneBy: outcome.costBorneBy,
      raisesReport: outcome.raisesReport,
    });

    return { outcome };
  });
}

/** A buyer's own claims, for their order detail page. */
export async function getMyProtectionClaimsAction(): Promise<
  ActionResult<ProtectionClaimDocument[]>
> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    return protectionClaimsRepository().listForBuyer(user.uid);
  });
}

/** Whether this order can be claimed against right now, for rendering the CTA. */
export async function canClaimProtection(
  order: Parameters<typeof deadlinesFor>[0],
  kind: "shipping" | "sale",
): Promise<ActionResult<{ can: boolean; reason?: string }>> {
  /*
   * 🛑 Wrapped, because this file is `"use server"` — which makes EVERY export
   * in it a client-callable RPC endpoint, read-only predicate included. So it
   * owes the same uniform envelope as its sibling mutations: a caller cannot
   * tell a thrown repository error from a `{can:false}` verdict otherwise, and
   * "the claim window is closed" and "the lookup failed" are opposite answers.
   */
  return wrapAction(async () => {
  const feePaid = kind === "shipping" ? order.shipmentProtectionFee : order.saleProtectionFee;
  if (!feePaid || feePaid <= 0) return { can: false, reason: "not-covered" };

  const existing = await protectionClaimsRepository().findById(
    createProtectionClaimId(order.id, kind),
  );
  if (existing) return { can: false, reason: "already-claimed" };

  const obligationKind = kind === "shipping" ? "claim-shipping" : "claim-sale";
  const window = deadlinesFor(order).find((d) => d.kind === obligationKind);
  if (order.deliveryDate && window && window.dueAt.getTime() <= Date.now()) {
    return { can: false, reason: "window-closed" };
  }
  return { can: true };
  });
}
