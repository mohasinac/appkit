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
  /**
   * Commission rate on the SELLER's payout (`computePayoutDeduction`).
   *
   * 🛑 NO LONGER THE BUYER-FACING MODEL. `computeCheckoutFees` charges
   * `platformFeePerListingUnit × unitCount` — see that function's header for
   * the owner's spec. This field is a seller-side commercial term and the two
   * were never the same number; they merely shared a rate by accident.
   */
  platformFeePercent: number;
  gstPercent: number;
  /** Rupee floor (not paise) — matches the existing `minimumTransactionFee` doc convention. */ // audit-money-units-ok: clarifies this is NOT paise
  minimumTransactionFee?: number;
  /**
   * 🛑 DEAD FOR CHECKOUT, and deliberately left declared rather than deleted.
   *
   * It was the rupee ceiling on the old percentage commission. The owner's
   * 2026-11-08 ruling replaced that model outright with a flat fee per listing
   * line, and **a ₹10 ceiling applied to `n × ₹10` would cap every order at ₹10
   * and silently destroy the new rule** — which is exactly why this carries a
   * warning instead of quietly staying in the arithmetic.
   *
   * Still declared because `siteSettings.commissions.platformFeeMax` is a live
   * stored field with an admin form behind it, and `explainPlatformFee` must be
   * able to recognise a legacy document. Removing the field from the schema is
   * a cross-lane change (the `siteSettings` schema is not this lane's) and is
   * reported rather than made here.
   */ // audit-money-units-ok: rupee ceiling, not paise
  platformFeeMax?: number;
  /**
   * ₹ per listing UNIT charged to the buyer — the buyer-facing platform fee.
   *
   * Optional so a `siteSettings` document saved before this field existed keeps
   * working: it falls back to `DEFAULT_PLATFORM_FEE_PER_LISTING_UNIT`.
   *
   * 🛑 A stored `0` is honoured as zero and is NOT the same as absent. An admin
   * switching the fee off is a real configuration; `??` (not `||`) is what keeps
   * the two distinguishable.
   */ // audit-money-units-ok: rupees per unit, not paise
  platformFeePerListingUnit?: number;
  gatewayFeePercent?: number;
}

/**
 * The platform fee per listing UNIT, in decimal rupees. Owner, 2026-11-08:
 * *"our website platform fees is 10rs per listing so an order with n items is
 * nx10 rs, plus gst 18%"*.
 *
 * ## 🛑 PER UNIT, and this reading was CONFIRMED against the alternative
 *
 * "Per listing" is ambiguous between a listing LINE and a listing UNIT, and the
 * two differ on every multi-quantity order. The owner was asked directly
 * (2026-11-08) and answered that **one line with quantity 3 is ₹30, not ₹10**.
 *
 * ⚠ `mocks/18-shipping-fees.qm` draws the OTHER reading — *"Per LINE, not per
 * unit: three of one item is one line"* — with a worked table beside it. The
 * owner's answer is newer and explicit, so the code follows the owner and the
 * mock is reported for correction by the session that owns it. Recorded here
 * rather than silently resolved: a money formula with two sources of truth is
 * how the divergences this codebase keeps paying for begin.
 *
 * 🛑 A FALLBACK, not the mechanism. The rate is `FeeCommissionRates`
 * configuration precisely because ₹10 and 18% are **today's India values**, not
 * universal truths — a different jurisdiction resolves a different fee and a
 * different tax rate (A18: tax resolves by origin/destination country pair). A
 * hardcoded `10` or `0.18` in the arithmetic is the vertical coupling the
 * governing principle forbids.
 *
 * It is defaulted HERE rather than only in `CHECKOUT_DEFAULT_COMMISSIONS`
 * because that object is used solely when the settings read FAILS
 * (`siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS`). A live
 * settings document that predates the field would otherwise resolve
 * `undefined`, and the new rule would be dead in production while looking
 * configured — the "seam nobody used" shape D44 is about.
 */
export const DEFAULT_PLATFORM_FEE_PER_LISTING_UNIT = 10;

export interface CheckoutFees {
  /** Platform fee in decimal rupees: `perListingUnit × unitCount`. */
  platformFee: number;
  /** GST on the platform fee, in decimal rupees. */
  gstOnFee: number;
  /** platformFee + gstOnFee, floored at minimumTransactionFee. */
  totalFee: number;
  /**
   * The unit count the fee was computed from, carried so the explainer and the
   * order record describe the same `n` the charge was derived from rather than
   * recounting it from a different collection.
   */
  unitCount: number;
  /** The per-unit rate actually applied, after the config fallback. */
  perListingUnit: number;
}

/**
 * What the buyer pays on top of the subtotal.
 *
 * ## 🛑 ₹10 PER LISTING UNIT × n, PLUS GST — owner, 2026-11-08
 *
 * *"our website platform fees is 10rs per listing so an order with n items is
 * nx10 rs, plus gst 18%"*, confirmed on the ambiguous half: **one line with
 * quantity 3 is ₹30.**
 *
 * This REPLACED a percentage-of-subtotal model capped at ₹10. The two are not
 * variations of each other: the old model charged **at most ₹10 for the whole
 * checkout** however many items were in it, so a 3-unit cart paid ₹10 where the
 * spec says ₹30 + ₹5.40 GST = ₹35.40. The cap is therefore not merely unused
 * here, it is actively incompatible — see `platformFeeMax`.
 *
 * ## ⚠ PER UNIT, NOT PER LINE — `mocks/18-shipping-fees.qm` draws the other one
 *
 * The mock states *"Per LINE, not per unit: three of one item is one line"* and
 * tabulates it. The owner's direct answer is newer and explicit and wins; the
 * contradiction is reported rather than quietly picked. See
 * `DEFAULT_PLATFORM_FEE_PER_LISTING_UNIT`.
 *
 * ## 🛑 What a "unit" is: the BUYER-VISIBLE quantity
 *
 * `unitCount` is `sum(item.quantity)` over cart lines — never
 * `expandCartLineToOrderRows`'s output. That expansion fans ONE composed
 * listing into a row per member so each can carry its own HSN and be cancelled
 * independently; counting those rows would charge ₹30 for a single three-part
 * bey the buyer bought once, which is neither reading of the owner's rule.
 *
 * ## 🛑 `unitCount` IS REQUIRED, not optional with a fallback
 *
 * Every one of the six call sites must supply it, and `tsc` is what guarantees
 * that. An optional parameter defaulting to the old percentage model would be
 * the D44 shape exactly: a seam declared, never passed, and silently wrong at
 * every money path for as long as nobody checked.
 *
 * ## Where GST rounds
 *
 * Once, on the whole fee base, through the same `roundRupees` every other money
 * term uses — never per unit. Rounding 18% of ₹10 three times accumulates a
 * different number than rounding 18% of ₹30 once, and the invoice has to agree
 * with the capture to the paisa.
 */
export function computeCheckoutFees(
  subtotal: number,
  commissions: FeeCommissionRates,
  unitCount: number,
): CheckoutFees {
  const perListingUnit =
    commissions.platformFeePerListingUnit ?? DEFAULT_PLATFORM_FEE_PER_LISTING_UNIT;
  /*
   * Clamped and integer-floored defensively. `unitCount` is summed from
   * server-resolved cart quantities in every caller, so it cannot be negative
   * or fractional today — but it is the multiplier on a charge, and a NaN here
   * would produce a NaN total the gateway would reject only after the buyer
   * pressed pay.
   */
  const units = Number.isFinite(unitCount) ? Math.max(0, Math.floor(unitCount)) : 0;
  const platformFee = roundRupees(units * Math.max(0, perListingUnit));
  const gstOnFee = roundRupees(platformFee * (commissions.gstPercent / 100));
  const totalFee = Math.max(platformFee + gstOnFee, commissions.minimumTransactionFee ?? 0);
  return { platformFee, gstOnFee, totalFee, unitCount: units, perListingUnit };
}

/**
 * Split one checkout's platform fee across the orders it produces.
 *
 * The buyer is charged one fee for the transaction, but the cart splits into one
 * order per store and each `OrderDocument` records its own `platformFee`
 * (invoices, reconciliation). Giving the last group the rounding remainder
 * guarantees the per-order figures sum to exactly what was charged, so the
 * orders can never quietly total a rupee more or less than the buyer paid.
 *
 * ## 🛑 APPORTIONED BY UNIT COUNT WHEN UNIT COUNTS ARE SUPPLIED
 *
 * The fee is `₹10 × units`, so the share that belongs to a store is the share
 * of the UNITS it holds — not the share of the money. Pro-rata by subtotal
 * gives a demonstrably wrong per-order figure under this model: a cart with one
 * ₹5,000 unit at store A and one ₹100 unit at store B is charged ₹20, and by
 * subtotal that apportions ₹19.61 / ₹0.39 when each order is in fact a
 * one-unit ₹10 order. The total charged is identical either way, so this is an
 * invoice-correctness defect rather than an overcharge — the same shape as
 * `isIntraStateSupply`'s CGST/SGST-vs-IGST split, and it matters for the same
 * reason: a GST return is built from the per-order rows, not the cart total.
 *
 * Subtotal apportionment survives as the fallback for callers that cannot
 * supply counts, so no existing behaviour changes silently.
 *
 * @param groupSubtotals `[storeId, subtotal]` pairs, in stable order.
 * @param groupUnitCounts Units per store. Omit to apportion by subtotal.
 */
export function allocateCheckoutFees(
  groupSubtotals: readonly (readonly [string, number])[],
  fees: CheckoutFees,
  groupUnitCounts?: ReadonlyMap<string, number>,
): Map<string, { platformFee: number; gstOnFee: number }> {
  const allocation = new Map<string, { platformFee: number; gstOnFee: number }>();
  if (groupSubtotals.length === 0) return allocation;

  /*
   * The weight each group's share is computed from. Unit counts when the caller
   * knows them and they sum to something positive — a zero-unit cart cannot be
   * apportioned by units any more than an all-zero cart can be apportioned by
   * money, and in both cases the whole (necessarily zero-ish) fee goes to the
   * last group rather than dividing by zero.
   */
  const unitWeights = groupUnitCounts
    ? groupSubtotals.map(([storeId]) => groupUnitCounts.get(storeId) ?? 0)
    : null;
  const unitWeightTotal = unitWeights ? unitWeights.reduce((s, w) => s + w, 0) : 0;
  const useUnits = unitWeights !== null && unitWeightTotal > 0;

  const total = useUnits
    ? unitWeightTotal
    : groupSubtotals.reduce((sum, [, subtotal]) => sum + subtotal, 0);

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
    const weight = useUnits ? (unitWeights?.[index] ?? 0) : subtotal;
    const share = total > 0 ? weight / total : 0;
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
  /** grossAmount - totalDeduction + shippingReimbursement, floored at 0. */
  netAmount: number;
  /**
   * Postage refunded to the seller, added AFTER the deductions (D45).
   *
   * Reported separately so a payout can be explained: "₹951 goods less ₹10 fee
   * plus ₹80 postage" is a sentence; one net figure is not.
   */
  shippingReimbursement: number;
  /**
   * Rupee value of buyer points this order was settled with, deducted from
   * `netAmount` (D46/D47, decisions 3 and 17 — the accepting store funds the
   * redemption).
   *
   * Returned as its own figure rather than folded into `totalDeduction` for the
   * same reason `shippingReimbursement` is: *"'₹900 less ₹30 commission plus
   * ₹80 postage' is a sentence; one net figure is not."* A seller looking at a
   * short payout needs to see which of the four terms shortened it.
   */
  pointsFunded: number;
}

/**
 * What a seller is actually paid.
 *
 * ## 🛑 `shippingReimbursement` is added AFTER the fee bases, never into them
 *
 * D45 makes postage a **cost being refunded**, not revenue. So it is the one
 * term in this function that is added to `netAmount` while being excluded from
 * `platformFee` and `gatewayFee` — because commissioning a seller's postage
 * would mean charging them for the privilege of posting the parcel, and taking
 * a gateway percentage of it would mean charging them a card fee on money that
 * is reimbursing a cash outlay.
 *
 * That is also why it is a parameter here rather than something a caller adds
 * to `grossAmount` before calling: `grossAmount` IS the commission base, so
 * folding postage into it silently commissions it. Four payout paths call this
 * (the seller's own earnings view, the manual request, and both jobs) and all
 * four must agree to the rupee — a seller shown one number and paid another is
 * worse than either number being wrong alone. One owner is what guarantees it.
 *
 * Defaulted to 0, so the three call sites that do not yet pass it keep their
 * current behaviour exactly rather than silently gaining a term.
 *
 * ## 🛑 `pointsFunded` is the mirror of that, and it is a DEDUCTION
 *
 * Decisions 3 and 17: the programme is seller-funded at both ends — the
 * accepting store absorbs the redemption, the originating store bears the
 * earn — and the platform funds neither. So points spent on an order reduce
 * that order's payout by the rupee value spent.
 *
 * It sits in the SAME position as postage and for the inverse reason: outside
 * the commission and gateway bases. The seller agreed to fund a discount, not
 * to pay us a commission on the discount they funded, and a gateway percentage
 * on money no gateway touched is not a card fee at all.
 *
 * 🛑 So `grossAmount` is untouched and the fee figures are IDENTICAL whether
 * points were used or not. That is what keeps the commission the seller is
 * charged a function of the sale rather than of how the buyer chose to settle
 * it — and it is why this cannot be implemented by passing a smaller
 * `grossAmount`, which is the obvious shortcut and silently reduces our own
 * commission by 2% of every redemption.
 *
 * Also defaulted to 0, for the same reason.
 */
/**
 * A commission PERCENT (what an admin types) as a RATE (what a payout row
 * stores). `5` becomes `0.05`.
 *
 * Trivial arithmetic, and it lives here anyway for two reasons. `/ 100` on a
 * `commissions.*` field is exactly what `audit-money-paths` R3 forbids outside
 * this file, because the two units are both bare numbers and swapping them
 * silently charges a seller 100× or 1/100× — there is no type that separates
 * them. And it was already open-coded identically in `autoPayoutEligibility`
 * and `weeklyPayoutEligibility` (both staged in that audit), so the next
 * writer copied the shape rather than a helper.
 *
 * 🛑 This is a UNIT CONVERSION, not a rounding site. Do not round here: the
 * rate is stored to explain a fee that has already been computed and rounded
 * by `computePayoutDeduction`, and rounding the explanation would make it
 * disagree with the amount it explains.
 */
export function commissionPercentToRate(percent: number | undefined): number {
  return (percent ?? 0) / 100;
}

export function computePayoutDeduction(
  grossAmount: number,
  commissions: FeeCommissionRates,
  shippingReimbursement = 0,
  pointsFunded = 0,
): PayoutDeduction {
  const platformFee = roundRupees(grossAmount * (commissions.platformFeePercent / 100));
  const gatewayFee = roundRupees(grossAmount * ((commissions.gatewayFeePercent ?? 0) / 100));
  const gstOnFee = roundRupees(platformFee * (commissions.gstPercent / 100));
  const totalDeduction = roundRupees(platformFee + gatewayFee + gstOnFee);
  const postage = Number.isFinite(shippingReimbursement)
    ? Math.max(0, shippingReimbursement)
    : 0;
  const points = Number.isFinite(pointsFunded) ? Math.max(0, pointsFunded) : 0;
  /*
   * Clamped at zero, as it already was. A redemption cannot exceed 50% of the
   * order total, so it cannot plausibly exceed the net — but a floor here means
   * no caller can ever hand a seller a negative payout, which would be written
   * to a `PayoutDocument.amount` that every downstream sum then treats as a
   * credit against the platform.
   */
  const netAmount = Math.max(0, roundRupees(grossAmount - totalDeduction + postage - points));
  return {
    platformFee,
    gatewayFee,
    gstOnFee,
    totalDeduction,
    netAmount,
    shippingReimbursement: roundRupees(postage),
    pointsFunded: roundRupees(points),
  };
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

export interface WhatsAppNotifyFeeRates {
  /** Admin master toggle — the addon isn't charged (even if the buyer selected it) unless this is true. */
  whatsappNotifyFeeEnabled?: boolean;
  /** Flat rupee fee charged when the buyer opts in. Falls back to ₹10. */
  whatsappNotifyFee?: number;
}

const DEFAULT_WHATSAPP_NOTIFY_FEE = 10;

/** Flat WhatsApp order-updates addon fee — charged only when the buyer opted in AND the admin has the addon enabled. */
export function computeWhatsAppNotifyFee(addonSelected: boolean, rates: WhatsAppNotifyFeeRates): number {
  if (!addonSelected || !rates.whatsappNotifyFeeEnabled) return 0;
  return rates.whatsappNotifyFee ?? DEFAULT_WHATSAPP_NOTIFY_FEE;
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
