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
    courierChanged: quote.courierId !== actual.courierId,
  };
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
