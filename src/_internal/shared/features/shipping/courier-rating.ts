/**
 * Courier ratings — C5f. Two numbers, side by side, NEVER blended.
 *
 * ## 🛑 The one rule
 *
 * The carrier's own rating (Shiprocket's, when a booking exists) and ours are
 * shown separately and are never averaged into a third figure.
 *
 * Same discipline as market-vs-sold price and estimated-vs-actual parcel
 * weight, and for the same reason in all three cases: **the gap is the
 * information**. A courier Shiprocket rates 4.8 and our own buyers rate 4.1 is
 * telling us something specific — that the aggregate across their whole book of
 * business does not describe our lanes, our parcels or our buyers. Averaging
 * the two to 4.45 destroys exactly that signal and launders a vendor's number
 * into one that looks like ours.
 *
 * ```
 * Blue Dart Air      Shiprocket 4.8★ · LetItRip 4.5★ (23)   1–2 days   ₹140
 * Delhivery Surface  Shiprocket 4.6★ · not enough data yet   3–5 days    ₹60
 * ```
 *
 * ## 🛑 Below the threshold: "not enough data yet", never a number
 *
 * Identical rule to the price index, and it has to be, because a courier list
 * is a choice made under time pressure: a 5.0 from one rating reads as better
 * than a 4.6 from four hundred, and the reader has no way to know otherwise
 * unless we decline to print it.
 *
 * ## What this module is NOT
 *
 * It does not query, it does not aggregate, and it does not fetch. The rollup
 * runs as a pass in the existing daily job — a new Cloud Scheduler job would be
 * a real registered cost (§ Firebase budget) for a number nobody reads hourly.
 *
 * 🛑 And `aggregateRatingJsonLd` stays `Product`-typed and is deliberately NOT
 * extended to cover this. A courier rating is operational feedback for a
 * fulfilment choice, not a product review; marking it up invites a rich result
 * for something we do not sell.
 */

/**
 * Below this, our own rating renders as a sample count and no star figure.
 *
 * Exported so the rollup, the projection and the view agree. A threshold one
 * applied and another did not would either hide real data or publish an average
 * of two votes as a reliability score.
 */
export const COURIER_RATING_MIN_CONFIDENT_SAMPLES = 5;

/** One courier's two numbers, as a renderer receives them. */
export interface CourierRatingPair {
  courierId: string;
  name: string;
  /**
   * The carrier's own rating, passed through verbatim.
   *
   * 🛑 Absent is not zero. A courier Shiprocket has not rated has no vendor
   * figure, and rendering 0★ would read as "rated terribly" rather than "not
   * rated" — the same distinction `undefined` vs `0` carries on every count in
   * this codebase (Root Cause #72).
   */
  providerRating?: number;
  /** Ours, from `courierStats/{courierId}`. Absent until anyone has rated. */
  platformRating?: { average: number; count: number; onTimeShare?: number };
}

export type CourierRatingDisplay =
  | { kind: "none"; label: string }
  | { kind: "provider-only"; providerRating: number; ourLabel: string }
  | { kind: "ours-only"; average: number; count: number }
  | { kind: "both"; providerRating: number; average: number; count: number };

/**
 * What to render for one courier.
 *
 * 🛑 Returns a discriminated union rather than two optional numbers, because
 * the four cases read differently and a renderer that has to decide will
 * eventually print `0★` for one of them. The union makes "we have no rating"
 * impossible to confuse with "we have a rating of zero".
 */
export function courierRatingDisplay(pair: CourierRatingPair): CourierRatingDisplay {
  const provider =
    typeof pair.providerRating === "number" && pair.providerRating > 0
      ? pair.providerRating
      : undefined;
  const ours =
    pair.platformRating && pair.platformRating.count >= COURIER_RATING_MIN_CONFIDENT_SAMPLES
      ? pair.platformRating
      : undefined;

  if (provider != null && ours) {
    return { kind: "both", providerRating: provider, average: ours.average, count: ours.count };
  }
  if (provider != null) {
    return { kind: "provider-only", providerRating: provider, ourLabel: "not enough data yet" };
  }
  if (ours) return { kind: "ours-only", average: ours.average, count: ours.count };
  return { kind: "none", label: "not rated yet" };
}

/**
 * 🛑 There is deliberately NO `combinedRating()` in this module, and this
 * comment is the enforcement.
 *
 * Every time a rating pair reaches a sort, a badge or a "best courier" pick,
 * the cheapest-looking move is to average the two so there is one number to
 * order by. Do not add it. If a single ordering is genuinely needed, order by
 * OURS and fall back to the provider's — stating which one you used — because
 * that is a choice a reader can evaluate, and a mean of two differently-sourced
 * populations is not.
 */

/** One vote. The document shape of `courierRatings`. */
export interface CourierRatingVote {
  courierId: string;
  orderId: string;
  userId: string;
  /** 1–5. */
  rating: number;
  /** Did it arrive by the promised date? Tracked separately from the stars. */
  onTime: boolean;
  comment?: string;
}

/**
 * Is this vote acceptable?
 *
 * 🛑 One vote per user per ORDER, not per courier — a buyer who used Blue Dart
 * four times has four legitimate opinions, and collapsing them to one would
 * weight a frequent buyer the same as a one-off. Idempotency is by document id
 * (`{orderId}__{userId}`), reusing the precedent `ReviewDocument.helpfulVoterIds`
 * already sets rather than inventing a second one.
 */
export function isValidCourierVote(vote: Partial<CourierRatingVote>): boolean {
  if (!vote.courierId || !vote.orderId || !vote.userId) return false;
  if (typeof vote.rating !== "number" || !Number.isInteger(vote.rating)) return false;
  return vote.rating >= 1 && vote.rating <= 5;
}

/** The deterministic id — a re-vote overwrites rather than double-counting. */
export function courierVoteId(orderId: string, userId: string): string {
  return `${orderId}__${userId}`;
}

/** The rolled-up shape, written daily. */
export interface CourierStats {
  courierId: string;
  average: number;
  count: number;
  /** Share of votes reporting on-time delivery, 0–1. */
  onTimeShare: number;
  computedAt: Date;
}

/**
 * Roll a vote list into stats.
 *
 * Pure, so the daily job and any verification share one implementation.
 * 🛑 Returns `null` for an empty list rather than a zeroed record — writing
 * `average: 0, count: 0` would publish a courier as rated-zero, and a reader
 * cannot tell that from a genuinely terrible courier.
 */
export function rollUpCourierVotes(
  courierId: string,
  votes: readonly CourierRatingVote[],
  now: Date,
): CourierStats | null {
  const valid = votes.filter((v) => isValidCourierVote(v));
  if (valid.length === 0) return null;
  const sum = valid.reduce((s, v) => s + v.rating, 0);
  const onTime = valid.filter((v) => v.onTime).length;
  return {
    courierId,
    average: Math.round((sum / valid.length) * 100) / 100,
    count: valid.length,
    onTimeShare: Math.round((onTime / valid.length) * 100) / 100,
    computedAt: now,
  };
}
