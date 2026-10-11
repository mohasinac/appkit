/**
 * The two buyer protections — C5e.
 *
 * ## 🛑 What was wrong, and why the fix is a claim path rather than a deletion
 *
 * `computeShipmentProtectionFee` is real: `max(₹30, 2%)`, opt-in per store,
 * written to the order as `shipmentProtectionAddon` / `shipmentProtectionFee`,
 * rendered as a "Protected" chip. And `OrderAddonBadges.tsx` claims the flag
 * *"changes how a loss claim is handled"* — while **no refund, dispute or RMA
 * code reads it anywhere**. A buyer paid 2% for a promise the system could not
 * keep.
 *
 * An earlier revision of the plan concluded "delete it". That was wrong. The
 * diagnosis was right — the fee was real and the claim path did not exist —
 * but the missing half is the claim, and **escrow is the pot it pays from**.
 * Holding the buyer's funds until delivery is what turns the badge from a
 * promise into a mechanism.
 *
 * ## TWO protections, because they fail independently
 *
 *   SHIPPING  loss or damage IN TRANSIT. We are the carrier's counterparty
 *             under escrow, so the carrier claim is ours to pursue and the
 *             buyer never argues with a courier.
 *   SALE      the item itself — not as described, wrong item, item issues.
 *             Branches the return flow, skipping the seller-fault
 *             determination.
 *
 * A parcel that arrives intact containing the wrong bey is a SALE problem, not
 * a shipping one. A single blended "protection" would charge once and have to
 * answer both — and, worse, would have to be wholly offered or wholly withheld
 * on a final-sale item, where the right answers differ (see below).
 */

/** Which protection. Deliberately not a boolean pair in the signatures. */
export type ProtectionKind = "shipping" | "sale";

export const PROTECTION_KINDS: readonly ProtectionKind[] = ["shipping", "sale"];

/** Why a protection is not on offer. Rendered to the buyer, so it is copy. */
export type ProtectionUnavailableReason =
  | "platform-disabled"
  | "seller-not-supported"
  | "final-sale";

export type ProtectionAvailability =
  | { available: true }
  | { available: false; reason: ProtectionUnavailableReason };

export interface ProtectionTierInput {
  /** TIER 1 — admin, platform-wide. `commissions.*FeeEnabled`. Default TRUE. */
  platformEnabled: boolean;
  /**
   * TIER 2 — the seller, for their own orders. Default FALSE.
   *
   * 🛑 The two defaults are opposite ON PURPOSE and it is not an
   * inconsistency. The admin flag answers "do we offer this product at all" —
   * we built it, so `true`. The seller flag answers "has this seller agreed to
   * be held to it" — they have not been asked, so `false`. Defaulting the
   * seller flag to `true` would enrol every existing seller in a liability
   * they never accepted, which is a worse failure than a day-one page full of
   * risk notices.
   */
  sellerSupports: boolean;
  /**
   * TIER 3 — the item. `finalSale` from the ORDER ITEM's snapshot at claim
   * time, or the product at purchase time.
   */
  finalSale: boolean;
}

/**
 * Is this protection on offer, and if not, why.
 *
 * 🛑 `finalSale` is checked for SALE protection only, and the asymmetry is the
 * strongest argument for keeping the two separate:
 *
 *   final sale + sale protection      INELIGIBLE. "No returns" and
 *                                     "no-questions-asked refund" are a plain
 *                                     contradiction, and `finalSale` exists
 *                                     precisely so a seller cannot be made to
 *                                     take an item back.
 *   final sale + shipping protection  UNAFFECTED. A parcel lost in transit was
 *                                     never delivered, so there is nothing for
 *                                     "final" to be final about — the buyer
 *                                     did not receive the item they accepted
 *                                     as non-returnable.
 *
 * Order of checks is the order of ownership: platform, then seller, then item.
 * That matters because the REASON is rendered, and "we do not offer this" is a
 * different sentence from "this seller does not offer this".
 */
export function protectionAvailability(
  kind: ProtectionKind,
  input: ProtectionTierInput,
): ProtectionAvailability {
  if (!input.platformEnabled) {
    return { available: false, reason: "platform-disabled" };
  }
  if (!input.sellerSupports) {
    return { available: false, reason: "seller-not-supported" };
  }
  if (kind === "sale" && input.finalSale) {
    return { available: false, reason: "final-sale" };
  }
  return { available: true };
}

/**
 * Whether to show the buyer a pre-purchase RISK NOTICE.
 *
 * 🛑 Absence must read as "not supported", never as "unknown". A tri-state
 * where `undefined` renders neither a badge nor a notice is the worst of the
 * three outcomes: the buyer gets no signal at all and cannot tell a seller who
 * declined from one who has not been asked.
 *
 * `platform-disabled` is the one reason that shows NOTHING — if we do not
 * offer the product, there is nothing to disclose about this seller, and a
 * notice would be us advertising a gap we created.
 */
export function showsRiskNotice(a: ProtectionAvailability): boolean {
  return !a.available && a.reason === "seller-not-supported";
}

/**
 * Whether to show the seller's safety BADGE.
 *
 * 🛑 Gated on the claim path existing, not merely on the flag. A badge for a
 * promise the platform cannot keep is the dead `OrderAddonBadges` tooltip one
 * level up — a seller opting into something we do not honour.
 */
export function showsSafetyBadge(a: ProtectionAvailability): boolean {
  return a.available;
}

/**
 * 🛑 The two badges must never appear together on one card.
 *
 * "Final sale" beside "Sale protected" is incoherent to a buyer and they are
 * right. A final-sale listing shows the final-sale badge and, when the seller
 * supports it, the SHIPPING-protection badge only.
 */
export function badgesFor(input: ProtectionTierInput): {
  finalSale: boolean;
  shippingProtected: boolean;
  saleProtected: boolean;
} {
  const shipping = protectionAvailability("shipping", input);
  const sale = protectionAvailability("sale", input);
  return {
    finalSale: input.finalSale,
    shippingProtected: showsSafetyBadge(shipping),
    saleProtected: showsSafetyBadge(sale),
  };
}

// ── What to charge ──────────────────────────────────────────────────────────

/**
 * Both protection fees for one order group, with all three tiers applied.
 *
 * 🛑 This exists because there are THREE money sites that must agree — the
 * pricing preview (what the buyer is shown), `createOrderForGroup` (what the
 * order records) and `POST /api/payment/create-order` (what the gateway
 * captures) — and a fee charged at one and refused at another is an overcharge
 * with no record. Root Cause #75's shape: a rule reachable by copy-paste will
 * be copied, and the copy made before a branch was added never learns about
 * it. Exporting the whole computed pair rather than the predicate is what
 * stops a caller re-deriving the `&&`.
 *
 * 🛑 The caller still supplies `finalSale` from the right source for its own
 * moment: the live product at PREVIEW (no order exists yet), the order item's
 * snapshot at CREATION and at CLAIM. That is deliberately not hidden in here —
 * which source is correct depends on when you are asking, and a helper that
 * guessed would get the claim-time case wrong, which is the one that matters.
 */
export function computeProtectionFees(input: {
  /** Order-group goods value the percentage applies to. */
  subtotal: number;
  selected: { shipping: boolean; sale: boolean };
  tiers: {
    platformShipping: boolean;
    platformSale: boolean;
    sellerShipping: boolean;
    sellerSale: boolean;
    finalSale: boolean;
  };
  /** `(subtotal, selected, rates)` — pass the matching `compute*Fee`. */
  shippingFee: (subtotal: number, selected: boolean) => number;
  saleFee: (subtotal: number, selected: boolean) => number;
}): { shippingProtectionFee: number; saleProtectionFee: number } {
  const { subtotal, selected, tiers } = input;
  const shippingOk = protectionAvailability("shipping", {
    platformEnabled: tiers.platformShipping,
    sellerSupports: tiers.sellerShipping,
    finalSale: tiers.finalSale,
  }).available;
  const saleOk = protectionAvailability("sale", {
    platformEnabled: tiers.platformSale,
    sellerSupports: tiers.sellerSale,
    finalSale: tiers.finalSale,
  }).available;
  return {
    shippingProtectionFee: input.shippingFee(subtotal, selected.shipping && shippingOk),
    saleProtectionFee: input.saleFee(subtotal, selected.sale && saleOk),
  };
}

// ── Claim adjudication ──────────────────────────────────────────────────────

export type ClaimFinding = "genuine" | "change-of-mind";

export interface ClaimOutcome {
  /** Is the buyer refunded? */
  refundBuyer: boolean;
  /** Who absorbs the cost. */
  costBorneBy: "seller" | "platform" | "buyer";
  /** Whether a scam-registry signal should be raised for review. */
  raisesReport: boolean;
}

/**
 * 🛑 INSPECTION DECIDES WHO PAYS — NEVER WHETHER A PROTECTED BUYER IS
 * REFUNDED.
 *
 * This is the part that must not be got wrong, because it is where the promise
 * lives. Sale protection says *no questions asked*. If inspection could block
 * a protected refund then "no questions asked" is false, and we would be
 * rebuilding the dead-tooltip problem with extra steps.
 *
 *   protected + genuine          refunded · charged back to the SELLER
 *   protected + change-of-mind   refunded · absorbed by the PLATFORM —
 *                                this is what the fee prices
 *   unprotected + genuine        refunded · the SELLER's fault, seller pays
 *   unprotected + change-of-mind per the return policy — the BUYER pays
 *
 * What inspection gates is the chargeback, and that is also what makes the
 * seller-level opt-in meaningful: a seller supporting the cover accepts that
 * genuine claims land on them, and the fee covers the rest.
 *
 * `raisesReport` is a SIGNAL, not a verdict. A threshold opens a
 * `ReportDocument` for a human; an automatic exclusion on a count would punish
 * an unlucky buyer who received two genuinely bad items, and the scam
 * registry's entries are written as patterns to recognise rather than rules to
 * fire.
 */
export function adjudicateClaim(
  protectedSale: boolean,
  finding: ClaimFinding,
): ClaimOutcome {
  if (protectedSale) {
    return finding === "genuine"
      ? { refundBuyer: true, costBorneBy: "seller", raisesReport: false }
      : /*
         * Refunded anyway — the promise is unconditional. The report is
         * raised because repeated change-of-mind claims on a
         * no-questions-asked cover is exactly the `chargeback_fraud` pattern
         * the registry already documents, and the only honest enforcement is
         * withdrawing FUTURE eligibility, never denying this claim.
         */
        { refundBuyer: true, costBorneBy: "platform", raisesReport: true };
  }
  return finding === "genuine"
    ? { refundBuyer: true, costBorneBy: "seller", raisesReport: false }
    : { refundBuyer: false, costBorneBy: "buyer", raisesReport: false };
}

/**
 * Where a RETURN ships to — C5g, stated here because it branches on the
 * add-on and nothing else should re-derive that.
 *
 * 🛑 Warehouse routing applies ONLY to a sale-protection claim, not to returns
 * in general. We take custody only where we are the ones underwriting the
 * refund, which is also the only case where we need to know whether to charge
 * the seller back. An ordinary return on an unprotected order stays between
 * the buyer and the seller exactly as it does today.
 *
 * The admin trust flag sends even a protected claim to the seller.
 */
export function returnDestination(input: {
  saleProtectedClaim: boolean;
  /** `StoreDocument.returnsDirectToSeller` — ADMIN-granted, never seller-set. */
  sellerTrustedByAdmin: boolean;
}): "warehouse" | "seller" {
  if (!input.saleProtectedClaim) return "seller";
  return input.sellerTrustedByAdmin ? "seller" : "warehouse";
}

/**
 * Where an RTO lands — C5h. Same rule, different trigger.
 *
 * An RTO is not buyer-initiated: the carrier is sending a parcel back because
 * it could not be delivered. Nobody asked for it, so no claim exists — but the
 * destination still follows who underwrote the order, because that is who has
 * to inspect and account for it.
 */
export function rtoDestination(input: {
  saleProtectedOrder: boolean;
}): "warehouse" | "seller" {
  return input.saleProtectedOrder ? "warehouse" : "seller";
}
