/*
 * WHY: One implementation of "pinned events come first", shared by the two
 *      surfaces that render an event list.
 * WHAT: `sortPinnedFirst` — a stable partition on `EventDocument.isPinned`.
 *
 * EXPORTS:
 *   sortPinnedFirst — readonly T[] -> T[], pinned first, order otherwise kept
 *
 * @tag domain:events
 * @tag layer:util
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:features/events/components/EventsListPageView.tsx,features/events/actions/event-actions.ts
 * @tag sideEffects:none
 */

/** Just the part of an event this ordering reads. */
export interface PinnableEvent {
  isPinned?: boolean;
}

/**
 * Lift pinned events to the front, preserving the relative order of both
 * groups.
 *
 * 🛑 WHY THIS IS IN MEMORY AND NOT AN `orderBy`. Firestore's `orderBy`
 * excludes every document that lacks the ordering field (Root Cause #100), and
 * `isPinned` is absent from every event that is not pinned — which is all of
 * them bar one. Sorting on it in the query would return an events page
 * containing only the pinned row, with no error and a 200, and the failure
 * reads as "the other events were deleted" rather than as a bad sort.
 *
 * A boolean is also a one-bit sort key, so it would need a composite index
 * paired with `startsAt` for every filter combination the page offers, to buy
 * an ordering a single pass over at most `pageSize` rows already gives.
 *
 * 🛑 THE BOUND, STATED RATHER THAN IMPLIED: this reorders WITHIN the page it
 * is handed. A pinned event that falls on page 3 of a paginated result is
 * lifted to the top of page 3, not onto page 1. That is sufficient while the
 * whole catalogue fits one page — live holds 1 event against a pageSize of
 * 24, and the homepage rail asks for 6 — and it is the reason to revisit this
 * if events ever outgrow a single page. The fix then is a second bounded
 * query on `isPinned == true` (an EQUALITY, which is index-friendly and does
 * not have the missing-field problem an `orderBy` has) merged ahead of the
 * main result, not an `orderBy` on this field.
 *
 * `Array.prototype.sort` is specified as stable, so the comparator only needs
 * to express the pinned/unpinned difference to leave everything else alone.
 */
export function sortPinnedFirst<T extends PinnableEvent>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) => Number(b.isPinned === true) - Number(a.isPinned === true),
  );
}
