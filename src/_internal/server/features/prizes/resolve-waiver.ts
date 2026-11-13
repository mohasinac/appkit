/**
 * ── ONE DERIVATION OF "WHICH PRIZE LINES ARE ENTITLED" ───────────────────────
 *
 * Three checkout actions price a cart — `createCheckoutOrderAction` (the order
 * the buyer gets), `previewCheckoutPricing` (the number the buyer READS) and
 * `verifyAndPlaceGatewayOrderAction` (the amount the gateway CAPTURES). Each
 * derives its own per-line unit counts.
 *
 * 🛑 SO THE WAIVER HAS TO BE RESOLVED THE SAME WAY IN ALL THREE, OR THE
 * NUMBERS DISAGREE — and every way they can disagree is bad:
 *
 * | divergence | what the buyer experiences |
 * |---|---|
 * | preview waives, order does not | quoted ₹0, charged ₹11.80 — the D64 "money taken, order different" class |
 * | order waives, preview does not | quoted ₹11.80, charged ₹0 — harmless to them, and a reconciliation the accountant cannot explain |
 * | gateway waives, order does not | the capture and the stored order differ to the paisa, which is the one thing the invoice must never do |
 *
 * ⚠ The fee TAPER makes this worse than a flat adjustment: bands are per line
 * by quantity, so a cart priced with one line removed is not the same as the
 * same cart priced with that line's fee subtracted afterwards. Two call sites
 * applying "the same" waiver in different places genuinely produce different
 * totals.
 *
 * ✅ So this module is the single answer, and it is deliberately boring: load
 * the tickets, ask the purchase gate, and return the complement of its
 * refusals. No second opinion about who is entitled to what.
 */

import { couponsRepository } from "../../../../features/promotions/repository/coupons.repository";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { refusedPrizeLines } from "../../../shared/features/prizes/claim-gate";
import {
  entitledPrizeProductIds,
  isPrizeFeeWaiverEnabled,
  type PrizeFeeWaiverSettings,
} from "../../../shared/features/prizes/fee-waiver";

/** An applied coupon as the cart stores it. */
interface AppliedCouponRef {
  code: string;
  couponId?: string | undefined;
}

/** A cart line, as all three actions already have it. */
interface PricedLine {
  productId: string;
  productTitle?: string | undefined;
  quantity?: number | undefined;
}

export interface PrizeWaiver {
  /** Product ids the gate has ALLOWED as prize claims. */
  entitled: ReadonlySet<string>;
  /** Is the waiver switched on at all? */
  waive: boolean;
}

/**
 * Load the applied coupons as win tickets.
 *
 * 🛑 THE COUPON DOCUMENTS, NOT THE CART'S SNAPSHOT. `CartAppliedCoupon` carries
 * code, amount, scope and priced item ids — by design, because that is what
 * PRICING needs. It does not carry `restrictions`, and denormalising them onto
 * the cart would be worse than a read: a ticket revoked or re-scoped after it
 * was applied would live on in a stale snapshot, and the one thing an
 * entitlement must not be is a cached copy of itself.
 *
 * ⚠ An unreadable coupon contributes NO entitlement rather than being skipped
 * silently, so the gate then refuses the prize line — the fail-closed
 * direction.
 */
export async function loadPrizeTickets(applied: readonly AppliedCouponRef[]) {
  if (applied.length === 0) return [];
  const docs = await Promise.all(
    applied.map((c) =>
      c.couponId
        ? couponsRepository.findById(c.couponId).catch(() => null)
        : couponsRepository.getCouponByCode(c.code).catch(() => null),
    ),
  );
  return docs.filter(Boolean).map((d) => ({
    applicableProducts: d!.restrictions?.applicableProducts ?? [],
    allowedUserIds: d!.restrictions?.allowedUserIds ?? [],
    maxItemValue: d!.restrictions?.maxItemValue,
    claimQuantity: (d as { claimQuantity?: number }).claimQuantity,
  }));
}

/**
 * Which lines are entitled prize claims, and is the waiver on?
 *
 * ⚠ Returns an EMPTY entitled set when the waiver is off. The caller then
 * bills every line normally, so a switched-off waiver cannot accidentally zero
 * anything — the two facts travel together rather than being re-combined at
 * each call site.
 *
 * ⚠ One bounded read: a cart carries at most a handful of coupons (the
 * stacking rule caps it at one per store plus one platform-wide), and it is
 * skipped entirely for a cart with none — which is every ordinary checkout.
 */
export async function resolvePrizeWaiver(input: {
  items: readonly PricedLine[];
  productById: ReadonlyMap<string, ProductDocument | null>;
  appliedCoupons: readonly AppliedCouponRef[];
  buyerUserId: string;
  settings: PrizeFeeWaiverSettings | undefined;
}): Promise<PrizeWaiver> {
  const waive = isPrizeFeeWaiverEnabled(input.settings);
  if (!waive) return { entitled: new Set<string>(), waive: false };

  /* A listing IS a prize when it carries the block — no extra flag to forget
     to set, and no second source of truth about what a prize is. */
  const gateItems = input.items.map((it) => ({
    productId: it.productId,
    isEventPrize: Boolean(input.productById.get(it.productId)?.eventPrize?.eventId),
    productTitle: it.productTitle,
    quantity: it.quantity ?? 0,
    /* ⚠ The listing's NOMINAL worth, not its ₹0 checkout price — the ceiling
       arm compares against this. An absent value REFUSES rather than matching,
       so omitting it could only ever be stricter. */
    itemValue: input.productById.get(it.productId)?.price,
  }));

  /* No prize in the cart: skip the coupon read entirely. */
  if (!gateItems.some((g) => g.isEventPrize)) {
    return { entitled: new Set<string>(), waive };
  }

  const refusals = refusedPrizeLines({
    items: gateItems,
    tickets: await loadPrizeTickets(input.appliedCoupons),
    buyerUserId: input.buyerUserId,
  });

  return { entitled: entitledPrizeProductIds(gateItems, refusals), waive };
}
