/**
 * Degradation that the caller can SEE.
 *
 * Every bug this search/PII migration surfaced returned HTTP 200 with
 * plausible-looking rows. A dropped Sieve clause, a swallowed
 * FAILED_PRECONDITION, a retry with `q` deleted — none of them errored, and a
 * reader had no way to tell a narrowed list from an unnarrowed one. A
 * `serverLogger.warn` does not help: it goes to the operator, and the person
 * being misled is the user.
 *
 * So when a handler cannot serve exactly what was asked for but chooses to
 * serve something anyway, it must say so ON THE RESPONSE.
 *
 * This is not an error channel. A degraded response is a successful response
 * whose shape is honest about a compromise the handler made deliberately —
 * "I applied your filter but ignored your sort", not "something went wrong".
 * A failure that has no defensible partial answer should still throw.
 */

/** One thing the handler could not honour, and why. */
export interface DegradedNotice {
  /** What was dropped, in the caller's vocabulary: "sorts", "filters.status". */
  dropped: string;
  /**
   * Why, in one sentence a UI can show verbatim. Written for the user, not the
   * operator — "Results are not sorted while searching" beats
   * "FAILED_PRECONDITION: composite index required".
   */
  reason: string;
}

/**
 * Attach notices to a response payload.
 *
 * Returns the payload UNCHANGED when nothing degraded, so the common path
 * carries no `degraded: false` noise and a client can treat the field's mere
 * presence as the signal.
 */
export function withDegraded<T extends object>(
  payload: T,
  notices: readonly DegradedNotice[],
): T | (T & { degraded: readonly DegradedNotice[] }) {
  if (notices.length === 0) return payload;
  return { ...payload, degraded: notices };
}

/**
 * The specific compromise three admin search endpoints make.
 *
 * `/api/admin/{users,reviews,payouts}` resolve `q` through an HMAC blind index
 * (`emailIndex==<hash>`) or an exact name match. Firestore needs a composite
 * index for each equality x sort x direction combination, and preserving the
 * caller's sort across all three endpoints was measured at **14** additional
 * indexes — to order a result set that an exact email match bounds at one row.
 *
 * Dropping the sort is therefore the right trade. Dropping it SILENTLY was not:
 * the sort dropdown went on displaying "Oldest" over unsorted rows.
 */
export const SORT_DROPPED_FOR_EXACT_SEARCH: DegradedNotice = {
  dropped: "sorts",
  reason:
    "Results are not sorted while searching — search matches an exact value, " +
    "so ordering is unavailable for this query.",
};
