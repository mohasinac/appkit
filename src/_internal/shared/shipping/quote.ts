/**
 * What the buyer is quoted for shipping, what the seller actually spent, and
 * who wears the difference.
 *
 * Pure and synchronous — no I/O, no Firestore, no provider. Every surface that
 * touches a shipping figure resolves through here so the quote shown at
 * checkout, the amount charged, the order record and the reconciliation can
 * never disagree (Root Cause #75: a rule reachable by copy-paste WILL be
 * copied, and the copy never learns about the branch added later).
 *
 * ## The model
 *
 * 1. Shiprocket returns per-courier rates for the buyer's pincode.
 * 2. Each rate is ROUNDED UP to the nearest ₹50 and that is what the buyer
 *    sees and is charged. The raw rate is never shown and never billed.
 * 3. The seller ships. If their courier is dearer than the charged figure they
 *    absorb the difference; if it is cheaper the buyer is credited the
 *    difference in points, 1 point = ₹1.
 *
 * ## 🛑 Reconciliation measures against the CHARGED figure, not the raw rate
 *
 * This is the decision that makes the whole thing coherent, and it is worth
 * stating because the obvious alternative is defensible and wrong.
 *
 * Measuring against the raw rate would let the platform keep the round-up
 * (₹70 raw → ₹100 charged → a silent ₹30 margin on every parcel) while still
 * calling the ₹50 step a "rounding". Measuring against the charged figure
 * means the buyer is made whole for every rupee they handed over that did not
 * become postage: ₹100 charged, shipped at ₹47, 53 points back. The round-up
 * stops being a margin and becomes a BUFFER that absorbs ordinary courier
 * variance before the seller has to.
 *
 * It also makes the rule explainable in one sentence to both sides — "you pay
 * the rounded quote and get back whatever we did not spend", "you keep the
 * quote and cover any overage" — and a rule a seller can predict is a rule
 * they do not dispute.
 */

/**
 * Shipping is always billed in whole ₹50 steps.
 *
 * 🛑 Not a formatting choice. A courier rate is a volatile per-parcel number
 * (fuel, zone, weight slab, surcharge) and quoting it to the rupee invites a
 * dispute every time the actual differs by ₹3. A coarse step makes the quote
 * stable, makes it look like a price rather than a machine reading, and buys
 * the headroom that keeps most orders off the reconciliation path entirely.
 */
export const SHIPPING_ROUND_UP_TO = 50;

/**
 * Round a raw carrier rate up to the next ₹50.
 *
 * `Math.ceil`, so ₹70 → ₹100 and ₹100 → ₹100 — a rate exactly on a step is NOT
 * pushed to the next one. ₹0 stays ₹0: free shipping must survive the rounding
 * or every free-shipping order silently acquires a ₹50 charge.
 *
 * Negative input is clamped to 0 rather than rounded "up" toward zero, which
 * would otherwise turn a bad provider response into a credit.
 */
export function roundShippingUp(rawRate: number): number {
  if (!Number.isFinite(rawRate) || rawRate <= 0) return 0;
  return Math.ceil(rawRate / SHIPPING_ROUND_UP_TO) * SHIPPING_ROUND_UP_TO;
}

/** One courier the buyer may pick, as offered at checkout. */
export interface ShippingQuoteOption {
  /** Stable id from the carrier, so a pick survives a re-quote. */
  courierId: string;
  /** Display name — "Ekart", "Delhivery", "India Post". */
  courierName: string;
  /**
   * The carrier's own rate, kept for the audit trail and NEVER rendered.
   *
   * 🛑 Showing both numbers would invite "why am I paying ₹100 for a ₹70
   * courier" — a question whose honest answer (the difference comes back to
   * you as points if it is not spent) is not something a buyer should have to
   * reconstruct from two figures on a checkout page.
   */
  rawRate: number;
  /** What the buyer sees and is charged. `roundShippingUp(rawRate)`. */
  chargedRate: number;
  estimatedDays: number;
}

/**
 * The option the buyer committed to, frozen onto the order.
 *
 * 🛑 Stored, never recomputed. Carrier rates move hourly; re-quoting at
 * reconciliation time would compare the seller's actual spend against a price
 * nobody was ever charged, and the buyer's points would change depending on
 * when the job happened to run. Same reasoning as `OrderSourceContext` being
 * written once at creation.
 */
export interface SelectedShippingQuote {
  courierId: string;
  courierName: string;
  rawRate: number;
  /** The amount actually added to the order total. */
  chargedRate: number;
  estimatedDays: number;
  /** When the quote was taken, so a stale pick is recognisable. */
  quotedAt: Date;
}

/** What the seller really shipped with, recorded when they dispatch. */
export interface ActualShipmentCost {
  courierId: string;
  courierName: string;
  /** The seller's real postage, to the rupee. Not rounded. */
  actualRate: number;
}

/**
 * The outcome of comparing what was charged with what was spent.
 *
 * Exactly one of `sellerAbsorbs` / `buyerPoints` is non-zero, and both are
 * non-negative — a signed "difference" field would make every consumer decide
 * what its sign meant, and the two directions have completely different
 * consequences (one is a cost to a seller, one is a credit to a buyer).
 */
export interface ShippingReconciliation {
  /** Rupees the seller eats because their courier cost more than quoted. */
  sellerAbsorbs: number;
  /** Points credited to the buyer, 1 point = ₹1. */
  buyerPoints: number;
  /**
   * Rupees the seller is REIMBURSED for postage — `min(spent, charged)`.
   *
   * ## 🛑 This is the D45 decision, and it applies to BOTH branches
   *
   * Owner, 2026-10-21: *"if seller ships on their own then they have to upload
   * the receipt of the shipment with the tracking number so that it is paid to
   * them directly; if they use our platform's integration (Shiprocket) they do
   * not get the money, the platform keeps it."* Plus: reimbursement **capped at
   * what the buyer paid**, and the saving goes to the **buyer as points**.
   *
   * So shipping stops being revenue to allocate and becomes a COST TO
   * REIMBURSE. The third output completes a formula whose other two terms this
   * function already computed from the same two inputs:
   *
   * ```
   * reimbursable  = min(spent, charged)
   * sellerAbsorbs = max(0, spent − charged)
   * buyerPoints   = max(0, charged − spent)
   * ```
   *
   * 🛑 **The platform nets exactly zero on shipping in every case**, which is
   * the property that makes it defensible to both sides and is worth stating as
   * an invariant rather than leaving to be inferred:
   *
   * | buyer paid | receipt | seller gets | buyer gets | platform |
   * |---|---|---|---|---|
   * | ₹120 | ₹80 | ₹80 | ₹40 points | **₹0** |
   * | ₹80 | ₹120 | ₹80 | — | **₹0** |
   * | ₹100 | ₹100 | ₹100 | — | **₹0** |
   *
   * It is computed here for every order rather than only on the self-shipped
   * branch, because today the platform keeps shipping in the QUOTED path too —
   * so this is the fix for both, not a new rule for one. Whether it is actually
   * PAID is gated separately: a Shiprocket-booked parcel was paid for by us, so
   * `reimbursable` must not reach the payout base there. See
   * `isReimbursableShipment`.
   */
  reimbursable: number;
  /** True when the seller shipped with a courier the buyer did not choose. */
  courierChanged: boolean;
}

/**
 * Compare the charged quote against the real spend.
 *
 * 🛑 Works on the CHARGED figure (see the header). The worked examples from the
 * spec, with the ₹70 Ekart quote billed at ₹100:
 *
 *   shipped Delhivery ₹100 → sellerAbsorbs 0,   buyerPoints 0
 *   shipped Delhivery ₹120 → sellerAbsorbs 20,  buyerPoints 0
 *   shipped India Post ₹47 → sellerAbsorbs 0,   buyerPoints 53
 *
 * Points are the EXACT rupee difference and are deliberately not rounded to a
 * ₹50 step. The round-up exists to make a *quote* stable; applying it to a
 * credit would either invent money (rounding up) or quietly keep some of the
 * buyer's (rounding down).
 */
export function reconcileShipping(
  quote: Pick<SelectedShippingQuote, "chargedRate" | "courierId">,
  actual: ActualShipmentCost,
): ShippingReconciliation {
  const charged = Number.isFinite(quote.chargedRate) ? Math.max(0, quote.chargedRate) : 0;
  const spent = Number.isFinite(actual.actualRate) ? Math.max(0, actual.actualRate) : 0;
  const delta = roundMoney(charged - spent);

  return {
    sellerAbsorbs: delta < 0 ? Math.abs(delta) : 0,
    buyerPoints: delta > 0 ? delta : 0,
    /*
     * `min(spent, charged)` — capped at what the buyer paid, per the owner's
     * decision. Rounded through the same helper as the others: a bare
     * `Math.min` of two 2dp figures is safe, but keeping all three terms on one
     * rounding path is what stops `reimbursable + buyerPoints` drifting a paisa
     * away from `charged`, which is the invariant an auditor would check.
     */
    reimbursable: roundMoney(Math.min(spent, charged)),
    courierChanged: quote.courierId !== actual.courierId,
  };
}

/**
 * May this order's postage be reimbursed to the seller at all?
 *
 * ## 🛑 Gated on WHO BOOKED, never on whether a receipt exists
 *
 * Owner's rule: a seller who ships themselves is paid the approved amount on
 * proof; a seller who uses our Shiprocket integration gets nothing, because we
 * already paid the courier.
 *
 * Testing for a receipt instead would be the exploitable version — a seller
 * could upload a receipt for a parcel the platform paid for and be reimbursed
 * for someone else's spend. The discriminator has to be the booking, which is
 * a fact about how the shipment was created and not something the claimant
 * supplies.
 *
 * ## 🛑 It fails OPEN on an unknown booker, and the previous docstring claimed
 * the opposite
 *
 * That text read: *"It returns FALSE when the booker is unknown, and that
 * direction is deliberate: paying out on an unverified premise is the error
 * that cannot be undone."* **The code has always returned TRUE.** Corrected
 * 2026-10-21 — the code is right and the comment was wrong, which is the
 * dangerous way round: a reader trusted a safety property that was not there.
 *
 * Fail-open is correct here because **nothing writes
 * `platformBookedShipment`.** A self-shipped parcel has no flag to set, so a
 * fail-closed gate would refuse every seller and the reimbursement feature
 * would be entirely dead. Absence means "self-shipped", which is the common
 * case, and the real protection on that path is the evidence-plus-approval
 * step — a seller is paid the amount an admin approves from an uploaded
 * receipt, never an amount they assert.
 *
 * ## 🛑 THE GATE IS THEREFORE INERT, and that is a prerequisite, not a bug
 *
 * Measured 2026-10-21: `platformBookedShipment` has ZERO writers — only this
 * declaration, the `ShippingReconciliation` field and the order schema. The
 * exposure is nil **today** because nothing creates a platform booking either:
 * `ShiprocketShippingProvider` is registered in `providers.config.ts` but
 * nothing calls its `createShipment`.
 *
 * So the day that booking path is wired, THE SAME COMMIT must write this flag.
 * Otherwise the gate fails open on a parcel the platform paid for and the
 * seller is reimbursed for our spend — the exact double-payment this function
 * exists to prevent.
 *
 * Gated on WHO BOOKED rather than on whether a receipt exists, because testing
 * for a receipt is the exploitable version: a seller could upload a receipt for
 * a parcel the platform paid for. The discriminator has to be a fact about how
 * the shipment was created, not something the claimant supplies — which is
 * also why this function deliberately does NOT look at
 * `shippingReimbursement`. That parameter was accepted and never read, and an
 * unread parameter invites exactly the misuse it was meant to forbid, so it is
 * gone.
 */
export function isReimbursableShipment(order: { platformBookedShipment?: boolean }): boolean {
  if (order.platformBookedShipment === true) return false;
  return true;
}

/**
 * Two decimal places.
 *
 * Money is stored as decimal rupees (Root Cause #31), so a subtraction can
 * leave a float artefact — `100 - 47.1` is `52.900000000000006`, and that would
 * become a points credit with eleven decimal places on a user's balance.
 */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Turn carrier serviceability results into offerable options.
 *
 * 🛑 Drops any courier whose rate is not a usable number instead of charging
 * ₹0 for it. `resolveShippingCost` already carries this lesson in its
 * `shippingUnavailable` flag: a zero there "would ship every parcel free at
 * our expense, silently, until somebody noticed". A malformed row from a
 * provider is missing data, never free postage.
 *
 * Sorted cheapest-first, then fastest — the buyer is choosing, so the default
 * reading order should be the one most of them want.
 */
export function toQuoteOptions(
  couriers: readonly { courierId?: string; name: string; rate: number; estimatedDays: number }[],
): ShippingQuoteOption[] {
  return couriers
    .filter((c) => Number.isFinite(c.rate) && c.rate > 0 && Boolean(c.name))
    .map((c) => ({
      // Providers do not all return an id. Falling back to the name keeps the
      // pick round-trippable; it is only ever compared against itself.
      courierId: c.courierId ?? c.name,
      courierName: c.name,
      rawRate: c.rate,
      chargedRate: roundShippingUp(c.rate),
      estimatedDays: c.estimatedDays,
    }))
    .sort((a, b) => a.chargedRate - b.chargedRate || a.estimatedDays - b.estimatedDays);
}
