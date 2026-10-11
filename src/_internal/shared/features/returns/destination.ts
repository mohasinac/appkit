/**
 * Where a return or an RTO physically goes — C5g / C5h.
 *
 * ## 🛑 The address is DERIVED, never typed
 *
 * `returnDestination()` in `../shipping/protections` decides warehouse-vs-seller
 * from the add-on and the admin trust flag; this module turns that decision into
 * the actual address string.
 *
 * A free-text `returnAddress` field a human fills in would be a second owner of
 * a value we can compute, and the wrong one is a parcel lost — which is a worse
 * outcome than any of the drift this codebase usually pays for. So it is
 * derived once, at approval, and then SNAPSHOTTED onto the order: an admin
 * flipping `returnsDirectToSeller` while a parcel is in the post must not
 * retroactively change where the buyer was told to send it.
 */

/** Minimal shape — whatever a store carries that could serve as a pickup point. */
export interface SellerReturnAddressSource {
  storeName?: string;
  /** The store's own pickup address, when it has one. */
  pickupAddress?: string;
}

export type ReturnAddressResolution =
  | { kind: "warehouse"; address: string }
  | { kind: "seller"; address: string }
  /**
   * 🛑 The third outcome, and the reason this returns a union rather than a
   * string.
   *
   * A seller-routed return whose store has no pickup address has NO
   * destination, and `""` would be rendered to the buyer as a blank address
   * block — "post it to nowhere", with a success state. Measured 2026-10-11:
   * `addresses` carries zero `ownerType:"store"` rows, so this is the common
   * case today rather than a corner.
   *
   * The caller must refuse to approve the return and tell the seller to add a
   * pickup address. It cannot accidentally hand out an empty one.
   */
  | { kind: "unavailable"; reason: "seller-has-no-pickup-address" | "warehouse-not-configured" };

export interface ResolveReturnAddressInput {
  destination: "warehouse" | "seller";
  /** `process.env.WAREHOUSE_ADDRESS` — config, not a secret. */
  warehouseAddress?: string;
  seller?: SellerReturnAddressSource;
}

/**
 * The address to show the buyer.
 *
 * 🛑 `COMPANY_ADDRESS` is deliberately NOT consulted here, and must never
 * become a fallback. It is a test fixture — a known-good destination for the
 * smoke script — and substituting it for a missing warehouse or seller address
 * would ship a real returned parcel to our own office while reporting success.
 * That is the exact plausible-200 shape this plan keeps finding, and the
 * tempting use is also the dangerous one.
 */
export function resolveReturnAddress(
  input: ResolveReturnAddressInput,
): ReturnAddressResolution {
  if (input.destination === "warehouse") {
    const w = (input.warehouseAddress ?? "").trim();
    if (!w) return { kind: "unavailable", reason: "warehouse-not-configured" };
    return { kind: "warehouse", address: w };
  }
  const s = (input.seller?.pickupAddress ?? "").trim();
  if (!s) return { kind: "unavailable", reason: "seller-has-no-pickup-address" };
  return { kind: "seller", address: s };
}

// ── C5h: RTO ────────────────────────────────────────────────────────────────

/**
 * An RTO — Return To Origin — is the carrier sending a parcel back because it
 * could not be delivered. Nobody asked for it.
 *
 * 🛑 That is what makes it a THIRD path rather than a variant of a return: no
 * claim exists, no return was approved, and it arrives whether or not anyone is
 * expecting it. So it cannot reuse the custody chain's `requested`/`approved`
 * states — it enters at `received`, which is the first state that describes
 * something physically present.
 */
export const RTO_ENTRY_CUSTODY = "received" as const;

export type RtoCostBearer = "platform" | "seller" | "buyer";

/**
 * Who bears the RTO leg.
 *
 * 🛑 **Us, either way**, and this is C5g-policy applied rather than re-decided.
 * The common cause is a wrong or incomplete buyer address: charging the seller
 * for a buyer's typo drives sellers off, and billing the buyer after the fact is
 * uncollectable.
 *
 * But it is RECORDED rather than silently absorbed. An RTO has a real cost —
 * the carrier bills the return leg, and under escrow the buyer's shipping money
 * is already spent on the forward leg, so it is a genuine new charge with
 * nothing collected behind it. Absorbing it quietly is how a cost becomes
 * invisible and then structural; `reason` is what makes it a line someone can
 * total.
 */
export function rtoCostBearer(): { bearer: RtoCostBearer; reason: string } {
  return {
    bearer: "platform",
    reason:
      "RTO legs are absorbed by the platform (C5g-policy): the usual cause is a " +
      "wrong or incomplete delivery address, which is nobody's fault we can bill.",
  };
}

// ── C5i: abuse signal ───────────────────────────────────────────────────────

/**
 * Scam-registry types an inspection finding can substantiate.
 *
 * 🛑 All four ALREADY EXIST in `features/scams/constants/scam-types.ts` —
 * verified, not assumed. The registry anticipated this control before the
 * control existed, so C5i adds no scam type.
 *
 * 🛑 And inspection is BIDIRECTIONAL evidence, not a buyer-fraud filter. It is
 * the only point in the flow where a human sees the actual item, which makes it
 * the only place either party's pattern can be substantiated. A plan that
 * framed it as buyer-abuse control would be using half of it — so two of these
 * four are seller-side.
 */
export const RETURN_ABUSE_SCAM_TYPES = {
  /** BUYER: returned a different item. Literally why we inspect. */
  returnSwap: "return_swap_fraud",
  /** BUYER: serial no-questions-asked refunds. */
  claimAbuse: "chargeback_fraud",
  /** SELLER: items that keep coming back as "not as described". */
  sellerMisrepresentation: "condition_misrepresentation",
  /** SELLER: shipped nothing. */
  sellerEmptyBox: "empty_box_ship",
} as const;

export type ReturnAbuseSignal =
  (typeof RETURN_ABUSE_SCAM_TYPES)[keyof typeof RETURN_ABUSE_SCAM_TYPES];

/**
 * Thresholds at which a pattern is worth a human's attention.
 *
 * 🛑 A threshold is a SIGNAL, not a verdict. Crossing one opens a
 * `ReportDocument` for admin review; it does not deny a claim and it does not
 * ban anyone. An automatic exclusion on a count would punish an unlucky buyer
 * who received two genuinely bad items, and the registry's own entries are
 * written as patterns to RECOGNISE rather than rules to fire.
 */
export const RETURN_ABUSE_THRESHOLDS = {
  /** Change-of-mind claims on a no-questions-asked cover, per buyer. */
  buyerChangeOfMindClaims: 3,
  /** Genuine "not as described" findings against one seller. */
  sellerGenuineFindings: 3,
} as const;

export interface ReturnAbuseCounters {
  /** Protected change-of-mind claims by this buyer, pre-computed. */
  buyerChangeOfMindClaims?: number;
  /** Genuine findings against this seller, pre-computed. */
  sellerGenuineFindings?: number;
}

/**
 * Which signals this inspection substantiates.
 *
 * 🛑 The counters are PRE-COMPUTED and passed in. "How many claims has this
 * buyer made" is an unbounded per-request aggregation over orders — the exact
 * pattern that paused this project (Root Cause #104) — so it rides the daily
 * job as one more pass, the same lever as the price index and the pageViews
 * rollup. This function must never query.
 */
export function returnAbuseSignals(input: {
  finding: "genuine" | "change-of-mind";
  protectedSale: boolean;
  /** True when inspection found a DIFFERENT item than the one sold. */
  itemMismatch?: boolean;
  /** True when inspection found an empty or itemless parcel. */
  emptyParcel?: boolean;
  counters?: ReturnAbuseCounters;
}): ReturnAbuseSignal[] {
  const out: ReturnAbuseSignal[] = [];
  const c = input.counters ?? {};

  // Buyer side. A swap is substantiated by the item itself, with no threshold —
  // one wrong item back is not a pattern, it is an act.
  if (input.itemMismatch) out.push(RETURN_ABUSE_SCAM_TYPES.returnSwap);
  if (
    input.protectedSale &&
    input.finding === "change-of-mind" &&
    (c.buyerChangeOfMindClaims ?? 0) >= RETURN_ABUSE_THRESHOLDS.buyerChangeOfMindClaims
  ) {
    out.push(RETURN_ABUSE_SCAM_TYPES.claimAbuse);
  }

  // Seller side.
  if (input.emptyParcel) out.push(RETURN_ABUSE_SCAM_TYPES.sellerEmptyBox);
  if (
    input.finding === "genuine" &&
    (c.sellerGenuineFindings ?? 0) >= RETURN_ABUSE_THRESHOLDS.sellerGenuineFindings
  ) {
    out.push(RETURN_ABUSE_SCAM_TYPES.sellerMisrepresentation);
  }

  return out;
}

/**
 * What enforcement actually is.
 *
 * 🛑 Withdrawing FUTURE eligibility, never denying a live claim. The moment
 * inspection can block a protected refund the promise is false, and we are back
 * to a badge that means nothing. A buyer flagged for claim abuse keeps the
 * marketplace and loses the cover they abused — which composes with the
 * existing soft-ban machinery (`BannedAction` is already a closed set) rather
 * than extending it.
 */
export function enforcementFor(signals: readonly ReturnAbuseSignal[]): {
  deniesCurrentClaim: false;
  withdrawsFutureSaleProtection: boolean;
  opensReportForReview: boolean;
} {
  return {
    deniesCurrentClaim: false,
    withdrawsFutureSaleProtection: signals.includes(RETURN_ABUSE_SCAM_TYPES.claimAbuse),
    opensReportForReview: signals.length > 0,
  };
}
