/**
 * ── WAIVING FEES AND SHIPPING ON A PRIZE CLAIM ───────────────────────────────
 *
 * Owner, 2026-11-14, after being shown a real claim that completed: the item
 * was ₹0 but the order totalled ₹11.80 (₹10 platform fee + ₹1.80 GST) and a
 * courier was set to collect ₹10.62 on delivery. Asked what a winner should
 * pay, the answer was **nothing** — waive the fee, its GST and shipping — with
 * the behaviour behind a config row so it can change without a deploy.
 *
 * ## 🛑 WHY THE WAIVER IS EXPRESSED AS ZERO BILLABLE UNITS
 *
 * `computeCheckoutFees(subtotal, commissions, lineUnitCounts)` bills
 * `Σ rateFor(units) × units` per line. A waived line therefore contributes
 * **zero units**, and the fee arithmetic needs no new branch at all — no
 * second code path through a money formula, which is the thing this codebase
 * has paid for repeatedly (Root Cause #75: a second implementation of a money
 * rule, living in the least trustworthy place).
 *
 * ⚠ It also keeps the TAPER honest. The bands taper per line by quantity, so
 * zeroing a line is not the same as subtracting its fee afterwards: a cart of
 * one prize and four normal units must bill the four at the four-unit rate,
 * not at the five-unit rate with one unit's charge deducted. Only removing the
 * units from the input gets that right.
 *
 * ## 🛑 WHY THE DEFAULT IS ON, AGAINST THE USUAL MONEY-PATH RULE
 *
 * The standing rule is *unknown → false* on a money path. This flag inverts
 * it, deliberately, and the reasoning is the same asymmetry already recorded
 * for `isOnlinePaymentEnabled`: that flag picks a SENTENCE, this one REDUCES A
 * CHARGE. Neither grants a capability, so the conservative direction is not
 * "refuse".
 *
 * | a failed settings read assumes… | consequence |
 * |---|---|
 * | WAIVE (this choice) | the platform loses ~₹12 of fee on a prize it gave away. Recoverable, trivial |
 * | CHARGE | a prize winner is billed to collect a prize, and a courier asks them for money at the door. The owner's explicit answer was "nothing" |
 *
 * ⚠ So the cost of being wrong is asymmetric by two orders of magnitude, and
 * the expensive direction is the one the "unknown → false" rule would pick.
 * Named as a function so the asymmetry has somewhere to be explained, rather
 * than appearing as a stray `!== false` that a later reader "tidies".
 *
 * 🛑 It can never widen an ENTITLEMENT. The waiver only ever applies to a line
 * the purchase gate has already decided is entitled — see `billableUnitsFor`.
 * A buyer with no ticket is refused outright, long before any fee is computed,
 * so there is no configuration of this flag that makes a prize takeable.
 */

/** The slice of site settings this module reads. Narrow on purpose. */
export interface PrizeFeeWaiverSettings {
  prizes?: {
    /**
     * Waive the platform fee, its GST and shipping on a ticket-entitled line.
     *
     * ⚠ ABSENT MEANS WAIVE. See the header for why this flag's unknown case is
     * inverted relative to every other money-path flag.
     */
    waiveFeesOnClaim?: boolean;
  };
}

/**
 * Is the claim waiver on?
 *
 * ⚠ `!== false`, not `=== true`. An absent setting and a `true` setting must
 * answer the same thing, and only an explicit `false` turns it off — so an
 * admin who wants winners to pay the fee has to say so.
 */
export function isPrizeFeeWaiverEnabled(settings: PrizeFeeWaiverSettings | undefined): boolean {
  return settings?.prizes?.waiveFeesOnClaim !== false;
}

/** The minimum a line needs to be billed. */
export interface WaivableLine {
  productId: string;
  quantity?: number;
}

/**
 * How many units of this line the platform fee may bill.
 *
 * 🛑 `entitled` MUST be the purchase gate's own answer, never a re-derivation.
 * Deriving "is this a prize the buyer may have" a second time here would be
 * two statements of one entitlement rule — and the one that decides MONEY
 * drifting from the one that decides ACCESS is how a buyer is charged for
 * something they were entitled to, or entitled to something they were not
 * charged for. `entitledPrizeProductIds` exists so there is one derivation.
 */
export function billableUnitsFor(
  line: WaivableLine,
  entitled: ReadonlySet<string>,
  waive: boolean,
): number {
  const raw = line.quantity ?? 0;
  const units = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  if (!waive) return units;
  return entitled.has(line.productId) ? 0 : units;
}

/**
 * Is EVERY line in this group entitled — i.e. is the group a pure prize claim?
 *
 * Used for shipping, which is priced per ORDER GROUP rather than per line, so
 * it cannot be apportioned the way a per-unit fee can.
 *
 * 🛑 ALL, not SOME. A group holding a prize and a normal item still ships one
 * parcel that a carrier charges for, and waiving its shipping would hand a
 * winner free delivery on whatever else they added — a discount nobody
 * authorised, reachable by putting one prize in the cart.
 *
 * ⚠ An EMPTY group answers `false`. "Every line is entitled" is vacuously true
 * of no lines, and a vacuous truth on a money path is how a degenerate input
 * becomes free shipping.
 */
export function groupIsFullyEntitled(
  lines: readonly WaivableLine[],
  entitled: ReadonlySet<string>,
  waive: boolean,
): boolean {
  if (!waive) return false;
  if (lines.length === 0) return false;
  return lines.every((l) => entitled.has(l.productId));
}

/**
 * The entitled set, derived from the purchase gate's own refusals.
 *
 * A line is entitled when it IS a prize and the gate did NOT refuse it. Both
 * halves matter: an ordinary listing is not entitled (it is simply not a
 * prize), and a prize the gate refused is not entitled either — that buyer is
 * about to be turned away, and a waiver on their line would mean the refusal
 * and the pricing disagreed about the same cart.
 *
 * ⚠ Takes the REFUSALS rather than recomputing from tickets, so this cannot
 * answer "entitled" for a line the gate is refusing. That is the single
 * derivation the header insists on.
 */
export function entitledPrizeProductIds(
  items: readonly { productId: string; isEventPrize?: boolean }[],
  refusals: readonly { productId: string }[],
): ReadonlySet<string> {
  const refused = new Set(refusals.map((r) => r.productId));
  const out = new Set<string>();
  for (const it of items) {
    if (it.isEventPrize === true && !refused.has(it.productId)) out.add(it.productId);
  }
  return out;
}
