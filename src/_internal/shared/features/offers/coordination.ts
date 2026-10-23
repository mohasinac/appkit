/**
 * Coordinated purchase — several people chipping in on one listing.
 *
 * ## 🛑 It is a SPECIALISED OFFER. Almost nothing here is new.
 *
 * Owner, 2026-10-22: *"it is not a variant, it is similar to an offer, which
 * the seller enables on the listing, then the customer can coordinate on it,
 * it is a specialized offer."*
 *
 * What that framing DELETES is the valuable part, because every one of these
 * is a thing somebody would otherwise build:
 *
 * | Looks required | Actually |
 * |---|---|
 * | a 7th `OrderSourceContext` variant | none — it is `offer-accepted`, and the provenance card renders that branch already |
 * | an `orderType` tab | none — the Offer-wins tab covers it |
 * | a commit / settlement path | the offer lifecycle: `made → countered → accepted → paid`, with its chain fields, `checkoutDeadline` and lapse sweep |
 * | a new money term | none — `unitPriceFor` honours `lockedPrice`, so tax, payout base, refund ceiling and the invoice all follow |
 * | a cart lane | none — the existing `offer` lane, not locked, lapsing at `checkoutDeadline` |
 *
 * So this module holds exactly two things the offer did not already have: WHO
 * is chipping in and how much, and WHERE each of them wants their parcel.
 *
 * The arithmetic is Part 2's and is not re-derived here — `resolveSplit` and
 * `lockedPriceWithSurplus` live in `checkout/split.ts`, already committed,
 * already carrying the rounding-remainder discipline and the
 * goods-not-landed-cost argument that makes the surplus a correct charge.
 */

import type { SplitContribution } from "../../checkout/split";

/**
 * 🛑 FIVE, and the ceiling is about carrier quotes rather than taste.
 *
 * Each distinct destination needs its own `Shipment` and its own real
 * `checkServiceability` call, so members multiply outbound API calls on a
 * path a buyer is waiting on — against Rule #6's ~3-round-trip budget and a
 * 10s function ceiling. Five is what fits with room for the rest of checkout.
 *
 * It is NOT a statement that six people may not club together; it is the
 * number of parcels one offer can quote for synchronously. Raising it means
 * moving quoting off the request path first.
 */
export const SHARED_PURCHASE_MAX_MEMBERS = 5;

/**
 * One contributor.
 *
 * ## 🛑 There is deliberately NO member NAME field
 *
 * `encryptPiiFields` is a FLAT top-level loop that never descends into
 * arrays, so a `name` nested inside `coordination.members` would be written
 * to Firestore in PLAINTEXT and never decrypted on the way back out — the
 * same trap § "Status History" documents for `statusHistory[].changes`, where
 * it was closed by scrubbing rather than by convention.
 *
 * A member is a uid; names are resolved from it at render time. Anyone adding
 * `name` here must add it to `OFFER_PII_FIELDS` in the same change, and that
 * list does not reach into arrays either — so the real answer is: don't.
 */
export interface CoordinationMember extends SplitContribution {
  /** Firebase Auth uid of the person chipping in. */
  uid: string;
  /**
   * WHERE this member's parcel goes — an ID into `addresses`, never a copy.
   *
   * 🛑 **A reference, and this is not a style preference.** Copying the
   * address inline would put a name, a phone number and a street into the
   * offer document — a cart-adjacent record with no encryption story and no
   * retention story, which is two new obligations to serve one picker.
   *
   * 🛑 **The id MUST be verified server-side to belong to the submitting
   * buyer.** An id is guessable in a way an address is not: without the check,
   * a member supplies any `addresses` document id and the parcel ships to a
   * stranger's house at the coordinator's expense. See `assertOwnedAddresses`.
   *
   * Absent means "same as the coordinator's" — one parcel, which is the
   * ordinary case and must not require every member to pick.
   */
  destinationAddressId?: string;
}

export interface OfferCoordination {
  /**
   * The coordinator is the offer's own `buyerUid` and is NOT repeated here.
   *
   * A second copy is a mirror, and a mirror drifts the first time a write
   * path sets one and not the other (Root Cause #42). The coordinator is also
   * a contributing member, so they appear in `members` like everyone else —
   * what makes them the coordinator is owning the offer.
   */
  members: CoordinationMember[];
  /**
   * The landed cost the split was resolved against, snapshotted at the moment
   * the coordinator committed.
   *
   * 🛑 Snapshotted, not recomputed. Shipping and fees move; a split agreed on
   * Monday must still mean the same amounts on Friday, and recomputing would
   * silently re-divide what people already agreed to pay.
   */
  landedCostAtSplit: number;
  /** `contributed − landedCostAtSplit`, which rides on `lockedPrice`. */
  surplus: number;
}

/**
 * Is this set of members committable?
 *
 * Returns a MESSAGE rather than a boolean, for the same reason
 * `rejectRateChange` does: "too many members" and "the split is short" need
 * different corrections, and a bare `false` makes the form guess.
 *
 * 🛑 It does NOT check the split arithmetic — `resolveSplit` owns that, and
 * duplicating the `Σ(contributions) ≥ landedCost` test here would be a second
 * implementation of the one invariant Part 2 exists to hold.
 */
export function rejectCoordination(members: readonly CoordinationMember[]): string | null {
  if (members.length === 0) return "A coordinated purchase needs at least one contributor.";
  if (members.length > SHARED_PURCHASE_MAX_MEMBERS) {
    return `A coordinated purchase is limited to ${SHARED_PURCHASE_MAX_MEMBERS} contributors.`;
  }
  const uids = new Set(members.map((m) => m.uid));
  if (uids.size !== members.length) {
    /*
     * One person twice is almost always a UI slip, and letting it through
     * means their two rows are summed into one charge they did not agree to.
     */
    return "The same person appears more than once.";
  }
  for (const m of members) {
    if (m.splitMode === "percent" && (m.percent == null || m.percent <= 0 || m.percent > 100)) {
      return "Every percentage share must be between 0 and 100.";
    }
    if (m.splitMode === "amount" && (m.amount == null || m.amount <= 0)) {
      return "Every fixed share must be more than zero.";
    }
  }
  return null;
}

/** The distinct destinations this offer will have to ship to. */
export function destinationIds(members: readonly CoordinationMember[]): string[] {
  return [...new Set(members.map((m) => m.destinationAddressId).filter((id): id is string => !!id))];
}
