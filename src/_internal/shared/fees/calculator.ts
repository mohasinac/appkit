/**
 * Shared fee calculator — single source of truth for platform commission,
 * gateway fee, GST, and COD handling fee math. Replaces the ~5 duplicated
 * (and in the payout case, inconsistent) formulas that used to live
 * separately in checkout actions, refund actions, and the two payout
 * eligibility jobs.
 *
 * Two distinct fee shapes:
 *  - `computeCheckoutFees` — what the BUYER pays on top of the subtotal
 *    (platform fee + GST on that fee). The gateway fee is absorbed by the
 *    platform, never passed through to the buyer.
 *  - `computePayoutDeduction` — what's deducted from the SELLER's payout
 *    (platform fee + gateway fee + GST on the platform fee).
 *
 * All money amounts are in decimal rupees.
 */

import { roundRupees } from "../../../utils/number.formatter";
import { resolveStateKey } from "./india-states";

export interface FeeCommissionRates {
  platformFeePercent: number;
  gstPercent: number;
  /** Rupee floor (not paise) — matches the existing `minimumTransactionFee` doc convention. */ // audit-money-units-ok: clarifies this is NOT paise
  minimumTransactionFee?: number;
  /**
   * Rupee ceiling on the buyer-facing platform commission. Optional so
   * siteSettings documents saved before this field existed keep working —
   * falls back to DEFAULT_PLATFORM_FEE_MAX (₹10).
   *
   * Applies to `computeCheckoutFees` (what the BUYER pays) only. The seller-side
   * `computePayoutDeduction` is deliberately uncapped — that is a separate
   * commercial decision, not the same number.
   */ // audit-money-units-ok: rupee ceiling, not paise
  platformFeeMax?: number;
  gatewayFeePercent?: number;
}

/** Buyer-facing platform commission ceiling, in decimal rupees. */
const DEFAULT_PLATFORM_FEE_MAX = 10;

export interface CheckoutFees {
  /** Platform commission in decimal rupees, capped at `platformFeeMax`. */
  platformFee: number;
  /** GST on the (already capped) platform fee, in decimal rupees. */
  gstOnFee: number;
  /** platformFee + gstOnFee, floored at minimumTransactionFee. */
  totalFee: number;
}

/**
 * What the buyer pays on top of the subtotal.
 *
 * The cap is applied to the commission BEFORE GST is computed, because GST is
 * levied on the commission actually charged — capping afterwards would bill tax
 * on money that was never collected.
 */
export function computeCheckoutFees(subtotal: number, commissions: FeeCommissionRates): CheckoutFees {
  const uncapped = roundRupees(subtotal * (commissions.platformFeePercent / 100));
  const cap = commissions.platformFeeMax ?? DEFAULT_PLATFORM_FEE_MAX;
  const platformFee = Math.min(uncapped, cap);
  const gstOnFee = roundRupees(platformFee * (commissions.gstPercent / 100));
  const totalFee = Math.max(platformFee + gstOnFee, commissions.minimumTransactionFee ?? 0);
  return { platformFee, gstOnFee, totalFee };
}

/**
 * Split one checkout's platform commission across the orders it produces.
 *
 * The buyer is charged a single capped commission for the transaction, but the
 * cart splits into one order per store, and each `OrderDocument` records its own
 * `platformFee` (invoices, reconciliation). Apportioning pro-rata by group
 * subtotal keeps those per-order figures meaningful; giving the last group the
 * rounding remainder guarantees they sum to exactly what was charged, so the
 * orders can never quietly total a rupee more or less than the buyer paid.
 *
 * @param groupSubtotals `[storeId, subtotal]` pairs, in stable order.
 */
export function allocateCheckoutFees(
  groupSubtotals: readonly (readonly [string, number])[],
  fees: CheckoutFees,
): Map<string, { platformFee: number; gstOnFee: number }> {
  const allocation = new Map<string, { platformFee: number; gstOnFee: number }>();
  if (groupSubtotals.length === 0) return allocation;

  const total = groupSubtotals.reduce((sum, [, subtotal]) => sum + subtotal, 0);

  /*
   * ── D41: THE `minimumTransactionFee` FLOOR IS APPLIED HERE, ONCE ──────────
   *
   * `computeCheckoutFees` computes `totalFee = max(platformFee + gstOnFee,
   * minimumTransactionFee)` — and **`totalFee` had ZERO consumers.** Measured:
   * the only references were its own declaration, its computation and its
   * return. So the floor existed in a field nothing read.
   *
   * The capture route re-derived it by hand instead
   * (`max(rawTotal, discountedSubtotal + minimumTransactionFee + …)`), while
   * this allocator apportioned the UNFLOORED `platformFee`/`gstOnFee` to each
   * order group. Consequence where the floor bit: **the gateway captured the
   * floored amount and the orders recorded less than was collected.** The
   * buyer's statement and our own records disagreed, by exactly the shortfall.
   *
   * The shortfall is treated as additional PLATFORM FEE, with no GST of its
   * own, because the floor is defined on `platformFee + gstOnFee` COMBINED —
   * so `flooredPlatformFee + gstOnFee` is exactly `totalFee`, which is exactly
   * what the capture route charges. Adding GST on top of the shortfall would
   * push the captured total above the floor and reintroduce the mismatch in
   * the other direction.
   *
   * A floor nothing applies is not a floor; a floor applied in one of two
   * places is worse, because the two then disagree about money.
   */
  const feeShortfall = Math.max(0, roundRupees(fees.totalFee - (fees.platformFee + fees.gstOnFee)));
  const flooredPlatformFee = roundRupees(fees.platformFee + feeShortfall);

  let platformRemaining = flooredPlatformFee;
  let gstRemaining = fees.gstOnFee;

  groupSubtotals.forEach(([storeId, subtotal], index) => {
    const isLast = index === groupSubtotals.length - 1;
    // An all-zero cart can't be apportioned by share — fall back to giving the
    // whole (necessarily zero-ish) fee to the last group rather than dividing
    // by zero.
    const share = total > 0 ? subtotal / total : 0;
    const platformFee = isLast ? roundRupees(platformRemaining) : roundRupees(flooredPlatformFee * share);
    const gstOnFee = isLast ? roundRupees(gstRemaining) : roundRupees(fees.gstOnFee * share);
    platformRemaining = roundRupees(platformRemaining - platformFee);
    gstRemaining = roundRupees(gstRemaining - gstOnFee);
    allocation.set(storeId, { platformFee, gstOnFee });
  });

  return allocation;
}

export interface PayoutDeduction {
  /** Platform commission in decimal rupees. */
  platformFee: number;
  /** Payment gateway cost, absorbed by the platform from the seller's share, in decimal rupees. */
  gatewayFee: number;
  /** GST on the platform fee, in decimal rupees. */
  gstOnFee: number;
  /** platformFee + gatewayFee + gstOnFee. */
  totalDeduction: number;
  /** grossAmount - totalDeduction, floored at 0. */
  netAmount: number;
}

export function computePayoutDeduction(grossAmount: number, commissions: FeeCommissionRates): PayoutDeduction {
  const platformFee = roundRupees(grossAmount * (commissions.platformFeePercent / 100));
  const gatewayFee = roundRupees(grossAmount * ((commissions.gatewayFeePercent ?? 0) / 100));
  const gstOnFee = roundRupees(platformFee * (commissions.gstPercent / 100));
  const totalDeduction = roundRupees(platformFee + gatewayFee + gstOnFee);
  const netAmount = Math.max(0, roundRupees(grossAmount - totalDeduction));
  return { platformFee, gatewayFee, gstOnFee, totalDeduction, netAmount };
}

export interface CodHandlingFeeRates {
  /**
   * Rupee CEILING on the COD handling fee. Optional so a `siteSettings`
   * document saved before this field existed does not produce NaN — falls
   * back to ₹200.
   */ // audit-money-units-ok: rupee ceiling, not paise
  codHandlingFeeCap?: number;
  /** Optional for the same reason — falls back to 10%. */
  codHandlingFeePercent?: number;
}

/** Buyer-facing COD handling ceiling, in decimal rupees. */
const DEFAULT_COD_HANDLING_FEE_CAP = 200;
const DEFAULT_COD_HANDLING_FEE_PERCENT = 10;

/**
 * COD handling fee charged to the buyer: **min(subtotal × percent, cap)**.
 *
 * 🛑 The ₹200 is a CEILING, and it used to be applied as a FLOOR
 * (`Math.max(min, percentFee)`) by a field called `codHandlingFeeMin`. The
 * percentage then ran away on anything expensive: a ₹20,000 listing was
 * charged **₹2,000** of "handling", which is not what handling a parcel costs
 * — it is a tenth of the order. Measured on the live settings document
 * (`codHandlingFeeMin: 200`, `codHandlingFeePercent: 10`) in the cart, and the
 * figure was real: the buyer was quoted ₹22,011.80 on a ₹20,000 item.
 *
 * 🛑 What the fee IS, which is what makes the cap the correct shape: it is a
 * TOKEN covering our cost of having shipped a parcel for free when the buyer
 * does not pay on delivery. That cost is a courier's return leg — it scales
 * with the parcel, not with the price of what is inside it. A ₹20,000 top and
 * a ₹2,000 one cost the same to send back, so a fee that is 10× larger on the
 * first is not recovering a cost, it is a surcharge on being expensive.
 *
 * The percentage survives because it is right at the small end — ₹150 of
 * handling on a ₹300 order would exceed half the order — so the rule is "10%,
 * but never more than ₹200". Below ₹2,000 the percentage binds; above it the
 * cap does.
 *
 * The field was RENAMED rather than reinterpreted. A `…Min` read as a maximum
 * is Root Cause #51's shape — a label describing the reverse of what the code
 * does — and the next person to read the settings document would have had no
 * way to tell. A live document carrying the old key now falls through to
 * `DEFAULT_COD_HANDLING_FEE_CAP`, which is the same ₹200, so the rename
 * changes no number on its own.
 */
export function computeCodHandlingFee(subtotal: number, rates: CodHandlingFeeRates): number {
  const cap = rates.codHandlingFeeCap ?? DEFAULT_COD_HANDLING_FEE_CAP;
  const percent = rates.codHandlingFeePercent ?? DEFAULT_COD_HANDLING_FEE_PERCENT;
  const percentFee = roundRupees(subtotal * (percent / 100));
  return Math.min(percentFee, cap);
}

export interface GiftWrapFeeRates {
  /** Admin master toggle — the addon isn't charged (even if the buyer selected it) unless this is true. */
  giftWrapFeeEnabled?: boolean;
  /** Flat rupee fee charged when the buyer opts in. Falls back to ₹49. */
  giftWrapFee?: number;
}

const DEFAULT_GIFT_WRAP_FEE = 49;

/** Flat gift-wrap addon fee — charged only when the buyer opted in AND the admin has the addon enabled. */
export function computeGiftWrapFee(addonSelected: boolean, rates: GiftWrapFeeRates): number {
  if (!addonSelected || !rates.giftWrapFeeEnabled) return 0;
  return rates.giftWrapFee ?? DEFAULT_GIFT_WRAP_FEE;
}

export interface ShipmentProtectionFeeRates {
  /** Admin master toggle — the addon isn't charged (even if the buyer selected it) unless this is true. */
  shipmentProtectionFeeEnabled?: boolean;
  /** Percent of subtotal. Falls back to 2%. */
  shipmentProtectionFeePercent?: number;
  /** Rupee floor. Falls back to ₹30. */
  shipmentProtectionFeeMin?: number;
}

const DEFAULT_SHIPMENT_PROTECTION_FEE_PERCENT = 2;
const DEFAULT_SHIPMENT_PROTECTION_FEE_MIN = 30;

/** Shipment-protection addon fee: max(fixed floor, subtotal × percent) — charged only when the buyer opted in AND the admin has the addon enabled. */
export function computeShipmentProtectionFee(subtotal: number, addonSelected: boolean, rates: ShipmentProtectionFeeRates): number {
  if (!addonSelected || !rates.shipmentProtectionFeeEnabled) return 0;
  const percent = rates.shipmentProtectionFeePercent ?? DEFAULT_SHIPMENT_PROTECTION_FEE_PERCENT;
  const min = rates.shipmentProtectionFeeMin ?? DEFAULT_SHIPMENT_PROTECTION_FEE_MIN;
  const percentFee = roundRupees(subtotal * (percent / 100));
  return Math.max(min, percentFee);
}

/**
 * Sale protection — C5e. The SECOND cover, and a separate fee because it
 * answers a different failure.
 *
 * Shipment protection covers loss or damage in TRANSIT; this covers the item
 * itself (not as described, wrong item, item issues). A parcel that arrives
 * intact containing the wrong bey is a sale problem, not a shipping one — see
 * `_internal/shared/features/shipping/protections.ts` for why the two must not
 * be blended, and for the `finalSale` asymmetry that makes it impossible.
 *
 * Priced higher than shipment protection (3% / ₹49 floor) because the claim it
 * underwrites is unconditional: a protected change-of-mind refund is still
 * paid, and absorbed by the platform. That absorption is what the fee buys.
 */
export interface SaleProtectionFeeRates {
  /** Admin master toggle — the addon isn't charged (even if the buyer selected it) unless this is true. */
  saleProtectionFeeEnabled?: boolean;
  /** Percent of subtotal. Falls back to 3%. */
  saleProtectionFeePercent?: number;
  /** Rupee floor. Falls back to ₹49. */
  saleProtectionFeeMin?: number;
}

const DEFAULT_SALE_PROTECTION_FEE_PERCENT = 3;
const DEFAULT_SALE_PROTECTION_FEE_MIN = 49;

/** Sale-protection addon fee: max(fixed floor, subtotal × percent) — charged only when the buyer opted in AND the admin has the addon enabled. */
export function computeSaleProtectionFee(subtotal: number, addonSelected: boolean, rates: SaleProtectionFeeRates): number {
  if (!addonSelected || !rates.saleProtectionFeeEnabled) return 0;
  const percent = rates.saleProtectionFeePercent ?? DEFAULT_SALE_PROTECTION_FEE_PERCENT;
  const min = rates.saleProtectionFeeMin ?? DEFAULT_SALE_PROTECTION_FEE_MIN;
  const percentFee = roundRupees(subtotal * (percent / 100));
  return Math.max(min, percentFee);
}

/**
 * P-8 GST — buyer-facing product tax, distinct from the platform-commission
 * GST above. Intra-state orders split the rate evenly between CGST + SGST;
 * inter-state orders charge the full rate as IGST. All amounts in decimal rupees.
 */
export interface GstBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstAmount: number;
}

/**
 * The rate used when nobody has determined one — HSN 95030020, non-electronic
 * toys, which is nearly this whole catalogue.
 *
 * 🛑 A LAST RESORT, not a mechanism. The real resolution order is the
 * product's own `gstRate` → the category's `taxCodeId` → this. A listing that
 * reaches this constant means its category has no tax code, and THAT is the
 * defect to fix; every use must warn and flag the product for triage. The
 * measure of success is that it fires for nothing.
 *
 * It exists because the alternative is worse in one direction specifically:
 * under GST-inclusive pricing the tax is already inside the price, so backing
 * out 0% would treat the whole amount as taxable value, pay the seller all of
 * it, and leave us owing tax on money already handed over. Exclusive pricing
 * merely fails to collect, which does not lose money we hold.
 *
 * Belongs in `siteSettings.gst` the day a rate revision has to land without a
 * deploy — `TaxCodeDocument.effectiveFrom` records that toys have already
 * moved once — but a constant is the honest starting point rather than a
 * settings field nobody has a reason to change.
 */
export const DEFAULT_GST_RATE = 5;

/**
 * Whether this is an intra-state supply (CGST+SGST) or inter-state (IGST).
 *
 * 🛑 NOT a raw `===` on two strings, which is what `createOrderForGroup` and
 * `previewCheckoutPricing` both did. `constants/geo/subdivisions.ts` opens by
 * recording why that fails: the same `state` field held *"Karnataka",
 * "karnataka", "KA" and "Karnatka" depending on which of the three surfaces
 * created the row*. A picker now fixes new addresses, but the store's state
 * and every pre-picker row still arrive unnormalised.
 *
 * 🛑 Returns `null` for "cannot tell", and the distinction matters. The old
 * expression was `!!storeState && storeState === buyerState`, so a store with
 * no address resolved to `false` — i.e. **silently inter-state**, reported as
 * full IGST. Note what this defect is and is not: IGST total equals
 * CGST+SGST total, so **the buyer pays exactly the same amount either way**.
 * It is a compliance and reporting defect on the invoice, not an overcharge —
 * which is why it is safe to surface as `null` and let the caller log rather
 * than guess.
 */
export function isIntraStateSupply(
  storeState: string | undefined | null,
  buyerState: string | undefined | null,
): boolean | null {
  /*
   * ── G2: resolve through the state TABLE first, not string equality ───────
   *
   * This was `normaliseStateName(a) === normaliseStateName(b)` — lowercase,
   * strip non-letters, compare. Correct only when both sides happen to be
   * spelled the same way, and they are not: a seller types their pickup
   * state, a buyer types their delivery state, and a GSTIN carries the state
   * as a two-digit CODE. So `"KA"` vs `"Karnataka"` compared unequal and the
   * supply read as INTER-state, recording **IGST where CGST+SGST was due**.
   *
   * Worse, the old normaliser's `.replace(/[^a-z\s]/g, " ")` DESTROYED
   * digits, so a state held as `"29"` — or a full GSTIN — normalised to the
   * empty string and returned `null`, i.e. "place of supply undetermined",
   * which both callers then resolve to IGST with a warning.
   *
   * None of this changed the TOTAL (IGST total == CGST+SGST total), which is
   * precisely why it could live indefinitely: no figure in the system
   * disagreed with any other. Only the split was wrong, and the split is what
   * a GST return is built from.
   *
   * Verified against the table: "KA", "29", "29ABCDE1234F1Z5" and
   * "karnataka." all resolve to one key; "AP" vs "Arunachal Pradesh", "MP" vs
   * "Maharashtra" and "Punjab" vs "Puducherry" stay distinct (7 negative
   * controls, 0 false positives).
   */
  const keyA = resolveStateKey(storeState);
  const keyB = resolveStateKey(buyerState);
  if (keyA && keyB) return keyA === keyB;

  /*
   * 🛑 The string fallback STAYS, and it is a widening rather than a
   * replacement. An input the table cannot resolve — a typo, a non-Indian
   * state — used to be handled by plain equality, and for the case where BOTH
   * sides carry the SAME unrecognised spelling ("Karnatka" twice) that
   * produced the right answer. Dropping it would turn those into
   * "undetermined", which resolves to IGST, so a pure replacement would
   * REGRESS exactly the inputs the table was added to improve.
   */
  const a = normaliseStateName(storeState);
  const b = normaliseStateName(buyerState);
  if (!a || !b) return null;
  return a === b;
}

/** Lowercase, collapse whitespace, drop punctuation — "Tamil  Nadu." → "tamil nadu". */
function normaliseStateName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Back the tax OUT of a tax-inclusive amount: `gross × 100 / (100 + rate)`.
 *
 * 🛑 **Every price in this system is tax-inclusive.** A listing's `price` is
 * what the buyer pays; the GST is inside it and is remitted from it. That is
 * the Indian B2C convention, it is what worldhobbyshop asserts in its own
 * JSON-LD (`valueAddedTaxIncluded: true`), and it is what makes two listings
 * at ₹999 cost the same regardless of which seller posted them.
 *
 * A seller who would rather think in ex-tax terms sets
 * `StoreDocument.pricesIncludeGst: false`, and their typed price is grossed up
 * **once, at write time**, by `ProductRepository`. So the flag is an
 * AUTHORING convenience and never a display or checkout mode — the money
 * paths have no branch on it at all, which is the whole point: a mode flag
 * read in five places is five places to drift.
 *
 * `rate <= 0` returns the amount unchanged — an exempt supply has no tax to
 * back out, and dividing by 100 would be a silent no-op that merely looked
 * like arithmetic.
 */
export function taxableFromInclusive(gross: number, rate: number): number {
  if (rate <= 0) return roundRupees(gross);
  return roundRupees((gross * 100) / (100 + rate)); // audit-money-units-ok: tax back-out, not a paise conversion
}

/**
 * The inverse: gross an EX-TAX amount up to its tax-inclusive equivalent,
 * `taxable × (100 + rate) / 100`.
 *
 * Used in exactly one place — `ProductRepository`, when a store with
 * `pricesIncludeGst: false` saves a price. That is the whole extent of the
 * flag: one conversion, at write time, after which the stored price is
 * tax-inclusive like every other and no money path can tell the difference.
 *
 * ₹999 ex-tax at 5% → ₹1,048.95 inclusive, which backs out to ₹999.00 again.
 * The round trip is exact at 2dp for every rate in the union, asserted rather
 * than assumed.
 */
export function grossFromTaxable(taxable: number, rate: number): number {
  if (rate <= 0) return roundRupees(taxable);
  return roundRupees((taxable * (100 + rate)) / 100); // audit-money-units-ok: tax gross-up, not a paise conversion
}

/**
 * The breakdown of a tax-INCLUSIVE amount, with two invariants guaranteed by
 * construction rather than by arithmetic luck:
 *
 *   **taxable + gstAmount === gross**      (to the paisa)
 *   **cgst + sgst === gstAmount**          (to the paisa)
 *
 * 🛑 Why this exists instead of `calculateGst(rate, intra, taxableFromInclusive(...))`.
 *
 * That composition rounds TWICE and overshoots. Measured on the ₹999 @ 5% case
 * the plan itself specifies: the taxable rounds UP to 951.43, then
 * `calculateGst`'s intra branch takes `half = round(47.5715 / 2) = 23.79` and
 * returns `round(half × 2) = 47.58` — so taxable + tax came to **₹999.01** and
 * the invoice no longer reconciled with the ₹999 the buyer was charged.
 *
 * Under the old add-on-top model that could not happen: the tax was whatever
 * it was and the total was defined as price + tax, so the invariant was free.
 * Making prices inclusive is what turns it into something that must be
 * enforced — the tax is now a PARTITION of a fixed amount, not an addition to
 * it.
 *
 * So the tax is the **exact complement** of the taxable value, and the split
 * assigns the remainder to the second half rather than rounding both. This is
 * the same discipline `allocateAcrossMembers` already applies, and the same
 * class of defect as the `Math.round(gstAmount / 2)` split that C0c's defect 2
 * removed — one level further out.
 */
export function calculateGstInclusive(
  rate: number,
  intraState: boolean,
  gross: number,
): GstBreakdown {
  if (rate <= 0) {
    const t = roundRupees(gross);
    return { taxableAmount: t, cgst: 0, sgst: 0, igst: 0, gstAmount: 0 };
  }
  const taxableAmount = taxableFromInclusive(gross, rate);
  const gstAmount = roundRupees(gross - taxableAmount);
  if (intraState) {
    const cgst = roundRupees(gstAmount / 2); // audit-money-units-ok: halving a tax amount
    return { taxableAmount, cgst, sgst: roundRupees(gstAmount - cgst), igst: 0, gstAmount };
  }
  return { taxableAmount, cgst: 0, sgst: 0, igst: gstAmount, gstAmount };
}

export function calculateGst(
  rate: number,
  intraState: boolean,
  taxableAmount: number,
): GstBreakdown {
  const gstAmount = roundRupees(taxableAmount * (rate / 100));
  if (intraState) {
    const half = roundRupees(gstAmount / 2);
    return { taxableAmount, cgst: half, sgst: half, igst: 0, gstAmount: roundRupees(half * 2) };
  }
  return { taxableAmount, cgst: 0, sgst: 0, igst: gstAmount, gstAmount };
}
