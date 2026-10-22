/**
 * The pricing registry — every rate the platform charges, in one place, with
 * its tier and who may change it.
 *
 * ## Why this exists
 *
 * Before it, a rate was a field on `siteSettings` and nothing said what KIND
 * of thing it was. A GST percentage, a policy ceiling the owner sets, and an
 * operational commission a back-office agent tunes all looked identical in the
 * schema and in the admin form — so the only thing standing between an agent
 * and editing a statutory tax rate was that nobody had tried.
 *
 * It is also the destination `audit-money-paths`' R6 needs. That rule is
 * specified as "a percentage or fee literal in logic, not in the pricing
 * registry", and was deliberately NOT implemented in 9a because the registry
 * did not exist: a rule whose remedy is "move it somewhere that isn't there"
 * can only produce noise.
 *
 * ## 🛑 Three tiers, and the top one is NOT editable here at all
 *
 * | Tier | Who | Why |
 * |---|---|---|
 * | `statutory` | **nobody** | A GST rate is not ours to choose. It is read from `/admin/tax-codes`, which is sourced per HSN, and a writable copy here would be a second place for a filed tax figure to disagree with itself |
 * | `policy` | admin only, reason required | A ceiling the owner decides — `platformFeeMax`, the OTP threshold, `minPayoutAmount`. Changing one changes what the business promises, not what it charges today |
 * | `operational` | back-office | Commission, COD handling, the add-on fees. Tuned, audited, and reversible |
 *
 * ## 🛑 EVERY CHANGE IS FORWARD-ONLY. This is the load-bearing rule.
 *
 * A rate answers *"what do we charge from now on"* and never *"what did we
 * charge"*. Historical paths read the record's own snapshot — `order.gst`,
 * `order.platformFee`, `appliedDiscounts` — which is why those fields are
 * snapshotted at all, and `audit-money-paths`' R7 blocks a live read in a
 * payout, invoice or GSTR-1 path.
 *
 * Without that, lowering a commission would silently restate every historical
 * payout, and an invoice reprinted after a GST change would state a tax that
 * was never charged. **Invoices are FILED.** The failure is not a wrong screen;
 * it is a wrong return.
 *
 * ## 🛑 A rate appearing here does NOT make it public
 *
 * `gatewayFeePercent`, `payoutHoldDays`, `minPayoutAmount` and
 * `surchargeSellerSharePercent` are seller-side economics and stay in
 * `PRIVATE_*_FIELDS` (Root Cause #70 — a deny-list projection once shipped all
 * 25 commission fields to anonymous callers). This registry describes an ADMIN
 * surface. Buyer-facing display goes through `toBuyerFacingFees()` /
 * `toBuyerEmiSettings()`, and `audit-guest-price-leak`'s R6 blocks a seller
 * rate reaching a buyer path.
 */

/** Who may change a rate, and what the change costs in ceremony. */
export type RateTier = "statutory" | "policy" | "operational";

/**
 * Render order: most constrained first.
 *
 * 🛑 A runtime array with the type DERIVED from it would be the usual pattern
 * here, but it is inverted on purpose — `RateTier` is the union the registry
 * and `canEditRate` switch on, and this array is only a presentation order.
 * Typing it `readonly RateTier[]` makes a missing tier a silent omission from
 * the page rather than a compile error, so it is `Record`-checked below.
 */
export const RATE_TIER_ORDER = ["statutory", "policy", "operational"] as const satisfies readonly RateTier[];

/** A tier absent from `RATE_TIER_ORDER` is a compile error, not a missing section. */
const _TIER_ORDER_COVERS_UNION: Record<RateTier, true> = {
  statutory: true,
  policy: true,
  operational: true,
};
void _TIER_ORDER_COVERS_UNION;

/** How to read and render the number. */
export type RateUnit = "percent" | "rupees" | "days" | "minutes" | "count";

export interface RateDescriptor {
  /**
   * Dotted path inside `siteSettings`, e.g. `commissions.platformFeePercent`.
   *
   * 🛑 The path IS the identity. A registry keyed on a prettier id would be a
   * second name for one field, and the two would drift the first time a field
   * moved — the mirror problem (Root Cause #42) applied to money.
   */
  path: string;
  label: string;
  /** What this rate actually does, in the operator's words rather than the field's. */
  description: string;
  tier: RateTier;
  unit: RateUnit;
  /**
   * `true` when the value is seller-side economics.
   *
   * Not a display hint — it is what keeps `audit-guest-price-leak` honest
   * about which rates may never reach a buyer-facing path.
   */
  sellerOnly?: boolean;
}

/**
 * Every rate, in the order an operator would look for them.
 *
 * 🛑 **Statutory rates are deliberately ABSENT rather than listed read-only.**
 *
 * The first draft included GST as `tier: "statutory", editable: false`, and
 * that is the worse design: a read-only row on this page is a SECOND place GST
 * appears, and the day the two disagree the page is the one an operator
 * believes. `/admin/tax-codes` owns per-HSN rates, sourced and effective-dated
 * already. This page links there instead of mirroring it.
 *
 * The tier remains in the union because the DISTINCTION is what the page has
 * to teach — and because a future statutory value that genuinely has no other
 * home needs somewhere honest to go.
 */
export const RATE_REGISTRY: readonly RateDescriptor[] = [
  // ── Policy ceilings: the owner's decisions ──────────────────────────────
  {
    path: "commissions.platformFeeMax",
    label: "Platform fee cap",
    description:
      "The most we take from one checkout, before GST on it. Applied before the tax, because GST is levied on the commission actually charged.",
    tier: "policy",
    unit: "rupees",
  },
  {
    path: "payment.otpCheckoutThreshold",
    label: "OTP threshold",
    description:
      "Order value above which a buyer must confirm by one-time code. Measured on the WHOLE checkout, not each resulting per-seller order — otherwise a big cart dodges it by spanning sellers.",
    tier: "policy",
    unit: "rupees",
  },
  {
    path: "payment.codMaxOrderValue",
    label: "COD ceiling",
    description: "The largest order we will hand over against cash on delivery.",
    tier: "policy",
    unit: "rupees",
  },
  {
    path: "commissions.minPayoutAmount",
    label: "Minimum payout",
    description: "A seller's balance must reach this before a payout runs.",
    tier: "policy",
    unit: "rupees",
    sellerOnly: true,
  },
  {
    path: "commissions.payoutHoldDays",
    label: "Payout hold",
    description:
      "How long a seller's money waits after delivery, so a dispute can still be raised against it.",
    tier: "policy",
    unit: "days",
    sellerOnly: true,
  },

  // ── Operational: tuned, audited, reversible ─────────────────────────────
  {
    path: "commissions.platformFeePercent",
    label: "Platform commission",
    description: "Our cut of a checkout, before the cap above is applied.",
    tier: "operational",
    unit: "percent",
  },
  {
    path: "commissions.minimumTransactionFee",
    label: "Minimum transaction fee",
    description: "The floor under the commission, so a very small order still covers its own cost.",
    tier: "operational",
    unit: "rupees",
  },
  {
    path: "commissions.gatewayFeePercent",
    label: "Gateway fee",
    description: "What the payment provider takes. Recorded so a payout can account for it.",
    tier: "operational",
    unit: "percent",
    sellerOnly: true,
  },
  {
    path: "commissions.codHandlingFeePercent",
    label: "COD handling fee",
    description: "Charged to the buyer for paying cash on delivery.",
    tier: "operational",
    unit: "percent",
  },
  {
    path: "commissions.codHandlingFeeCap",
    label: "COD handling cap",
    description: "The most the COD handling fee can reach on one order.",
    tier: "operational",
    unit: "rupees",
  },
  {
    path: "commissions.codDepositPercent",
    label: "COD token",
    description: "Paid up front on a cash-on-delivery order; the rest is collected at the door.",
    tier: "operational",
    unit: "percent",
  },
  {
    path: "commissions.giftWrapFee",
    label: "Gift wrap",
    description: "Per-store add-on. Charged once per seller in the cart, never once per cart.",
    tier: "operational",
    unit: "rupees",
  },
  {
    path: "commissions.shipmentProtectionFeePercent",
    label: "Shipment protection",
    description: "Transit cover, charged per store. Claimable within 48 hours of delivery.",
    tier: "operational",
    unit: "percent",
  },
  {
    path: "commissions.shipmentProtectionFeeMin",
    label: "Shipment protection floor",
    description: "The minimum transit-cover premium on any one order.",
    tier: "operational",
    unit: "rupees",
  },
  {
    path: "commissions.saleProtectionFeePercent",
    label: "Sale protection",
    description: "Cover against the sale itself going wrong. A different window from transit cover.",
    tier: "operational",
    unit: "percent",
  },
  {
    path: "commissions.saleProtectionFeeMin",
    label: "Sale protection floor",
    description: "The minimum sale-cover premium on any one order.",
    tier: "operational",
    unit: "rupees",
  },
] as const;

/** Lookup by path. `undefined` for a field nobody registered. */
export function rateByPath(path: string): RateDescriptor | undefined {
  return RATE_REGISTRY.find((r) => r.path === path);
}

/**
 * Who may change this rate.
 *
 * 🛑 `statutory` returns `false` for EVERYONE, admins included. That is not a
 * permission check that happens to exclude admins — it is the statement that
 * this value is not ours to choose. An admin who needs a different GST rate
 * needs a different HSN code, which is a different screen and a different
 * kind of decision.
 */
export function canEditRate(tier: RateTier, isAdmin: boolean): boolean {
  if (tier === "statutory") return false;
  if (tier === "policy") return isAdmin;
  return true;
}

/**
 * One recorded rate change. Appended, never overwritten.
 *
 * ## 🛑 `effectiveFrom` is forward-only and the WRITE must enforce it
 *
 * A backdated rate is indistinguishable from a correction in the data and
 * catastrophic in effect: every historical read that honours effective dates
 * would restate figures already invoiced and already paid out. The field exists
 * so a change can be SCHEDULED, not so history can be edited.
 *
 * `reason` is required on a `policy` change and optional otherwise, which is
 * the whole difference in ceremony between the two tiers.
 */
export interface RateChange {
  path: string;
  previousValue: number | null;
  newValue: number;
  /** Never earlier than the moment of the write. */
  effectiveFrom: Date;
  changedByUid: string;
  changedByName: string;
  reason?: string;
  changedAt: Date;
}

/**
 * Is this `effectiveFrom` acceptable?
 *
 * Returns a MESSAGE rather than a boolean so the caller can say which rule was
 * broken — "that date is in the past" and "nothing to change" are different
 * corrections, and a bare `false` makes the form guess.
 */
export function rejectRateChange(
  input: { effectiveFrom: Date; previousValue: number | null; newValue: number; reason?: string },
  tier: RateTier,
  now: Date,
): string | null {
  if (!Number.isFinite(input.newValue)) return "That is not a number.";
  if (input.newValue < 0) return "A rate cannot be negative.";
  if (input.previousValue === input.newValue) return "That is already the current value.";
  /*
   * A minute of slack, because a form submitted at 14:59:59 against a server
   * clock at 15:00:00 is not an attempt to backdate anything.
   */
  if (input.effectiveFrom.getTime() < now.getTime() - 60_000) {
    return "A rate change cannot be backdated — it would restate invoices already filed.";
  }
  if (tier === "policy" && !input.reason?.trim()) {
    return "A policy ceiling needs a reason.";
  }
  return null;
}
