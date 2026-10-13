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
  | "final-sale"
  | "above-value-cap"
  | "excluded-category";

export type ProtectionAvailability =
  | { available: true }
  | { available: false; reason: ProtectionUnavailableReason };

/**
 * C5e — the VALUE CAP on sale protection, and the categories excluded outright.
 *
 * The plan's standing rule was that no badge appears on a real listing until
 * these exist, because *"a no-questions-asked guarantee on a Rs 40,000 graded
 * slab is a different product from one on a Rs 149 spin track"*. Directed to
 * "use standard from net" rather than invent them, so both the SHAPE and the
 * exclusion list follow the two marketplaces that publish theirs, and the
 * NUMBER follows our own measured price bands.
 *
 * ── Where the shape comes from ─────────────────────────────────────────────
 *
 * - **Amazon A-to-z** caps a claim at **$2,500 including shipping**, with a
 *   90-day filing window. So a cap is normal practice, it is inclusive of
 *   shipping, and it is generous relative to a typical basket.
 * - **eBay Money Back Guarantee** excludes whole CATEGORIES rather than
 *   discounting them — vehicles, real estate, services, **digitally delivered
 *   content**, travel vouchers, NFTs — and applies a different regime above a
 *   value threshold (authentication at $200 for trading cards, $500 for coins),
 *   after which an inspected item is **final sale** on the
 *   "doesn't match the listing" basis. It also SHORTENS the window for
 *   bullion from 30 days to 3.
 *
 * ── 🛑 Why the NUMBER is ours and not a converted dollar figure ────────────
 *
 * $2,500 is ~Rs 2.2 lakh, which is above the most expensive thing in the entire
 * crawled corpus. A cap nothing can reach is not a cap. So it is set from this
 * catalogue's own measured distribution instead: every band's median and p75
 * sits under Rs 15,000 and the maxima are Rs 74,999 (Hot Wheels), Rs 75,000
 * (TCG collection box) and Rs 1,59,102 (otakuisland's range top).
 *
 * **Rs 25,000 covers every median and every p75 measured**, and excludes only
 * the grail tail — graded slabs, booster boxes, premium statues — which is
 * exactly the tier eBay routes to authentication rather than to a blanket
 * guarantee.
 */
export const SALE_PROTECTION_MAX_VALUE = 25_000;

/**
 * 🛑 INCLUSIVE of shipping, following Amazon, and compared against the ITEM
 * LINE's total rather than the order's.
 *
 * Per line, because a Rs 40,000 slab in a basket with two Rs 200 tips must not
 * drag the tips out of cover, and the two Rs 200 tips must not carry the slab
 * into it. The cover is a promise about an ITEM.
 */
export const SALE_PROTECTION_VALUE_BASIS = "line-total-including-shipping" as const;

/**
 * Listing types sale protection is never offered on, and why each one.
 *
 * 🛑 Every entry is a case where the claim is UNADJUDICABLE, not merely
 * expensive — which is the distinction that keeps this list honest and short.
 * A value cap handles "expensive"; this handles "we could not tell".
 */
export const SALE_PROTECTION_EXCLUDED_LISTING_TYPES: readonly string[] = [
  /*
   * A live animal or plant's condition on arrival cannot be adjudicated from
   * photographs after the fact, and it changes by the hour. eBay excludes the
   * adjacent categories outright for the same reason.
   */
  "live",
  /*
   * eBay excludes "digitally delivered content" by name. Once a code is
   * revealed it cannot be returned, and whether it was already redeemed is not
   * something we can establish — which is why the reveal is logged rather than
   * reversible.
   */
  "digital-code",
  /*
   * A meetup sale with no shipment and no platform custody. There is nothing
   * to inspect, nothing to route to a warehouse, and the buyer handled the
   * item before paying — the inspection step the cover depends on has already
   * happened, in person.
   */
  "classified",
];

/**
 * Whether a GRADED slab is excluded.
 *
 * 🛑 Following eBay's own rule rather than our preference: an item inspected
 * under its Authenticity Guarantee is **final sale** on the "doesn't match the
 * listing" basis. A third party has already certified the grade, so a
 * no-questions-asked refund would let a buyer overturn that certification by
 * changing their mind — and `ProductGrading.certNumber` deep-links to the
 * grader, so the buyer can verify before paying.
 */
export const SALE_PROTECTION_EXCLUDES_GRADED = true;

/**
 * Claim windows, in hours from DELIVERY.
 *
 * Two windows because the two covers fail on different clocks, which is the
 * same argument that made them two add-ons:
 *
 * - **shipping** 48h — already this platform's stated damage window, in the
 *   seeded FAQ and in C0c's copy. Transit damage is visible on unboxing, and a
 *   longer window makes "damaged in transit" indistinguishable from
 *   "damaged afterwards".
 * - **sale** 7 days — long enough to actually inspect a collectible against
 *   its listing (weigh a bey, check a mould, compare a photo), short enough
 *   that condition can still be attributed. eBay runs 30 days generally and
 *   **3** for bullion; Amazon runs 90. 7 sits deliberately at the strict end,
 *   because unlike either of them we are also underwriting the refund.
 */
export const PROTECTION_CLAIM_WINDOW_HOURS: Record<ProtectionKind, number> = {
  shipping: 48,
  sale: 24 * 7,
};

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
  /**
   * TIER 3 — the line's total INCLUDING shipping, for the value cap. Absent
   * skips the cap check rather than failing it: a missing figure is our gap,
   * and refusing cover over it would charge a fee and then decline the claim.
   */
  lineTotal?: number;
  /** TIER 3 — the listing type, for the exclusion list. */
  listingType?: string;
  /** TIER 3 — whether the item carries a third-party grade. */
  isGraded?: boolean;
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
  /*
   * C5e's value and category gates, SALE only.
   *
   * 🛑 Shipping protection is deliberately exempt from both. A parcel lost in
   * transit was never delivered, so neither the item's value nor whether it is
   * a digital code or a graded slab changes what happened — and we are the
   * carrier's counterparty under escrow, so it is our claim to pursue either
   * way. Applying the cap here would be withdrawing cover for the one failure
   * the buyer has no part in.
   */
  if (kind === "sale") {
    if (input.listingType && SALE_PROTECTION_EXCLUDED_LISTING_TYPES.includes(input.listingType)) {
      return { available: false, reason: "excluded-category" };
    }
    if (SALE_PROTECTION_EXCLUDES_GRADED && input.isGraded) {
      return { available: false, reason: "excluded-category" };
    }
    if (typeof input.lineTotal === "number" && input.lineTotal > SALE_PROTECTION_MAX_VALUE) {
      return { available: false, reason: "above-value-cap" };
    }
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
