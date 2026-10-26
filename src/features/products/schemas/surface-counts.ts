/**
 * Site-wide "does this browse surface have anything in it" counters.
 *
 * ## Why a sibling singleton and not a field on `siteSettings`
 *
 * `siteSettings` is admin-authored CONFIG and is in the tester's PRESERVE tier.
 * This is DERIVED measurement, rewritten by a job. Mixing the two means a
 * reconciler writing into the document that holds live API credentials, and it
 * means a reseed or a settings restore silently reverting a count. Same split
 * `categoryCounts` already makes against `categories`, and for the same
 * Root Cause #92 reason: nothing triggers on this collection, so writing it
 * can never re-enter the trigger that produced it.
 *
 * ## 🛑 ABSENT MEANS UNKNOWN, NEVER ZERO
 *
 * This is the single rule the whole file exists to enforce, and getting it
 * backwards hides the entire catalogue.
 *
 * A key missing from either map means "not measured yet" — a fresh install, a
 * failed job, a type added since the last run. Every reader must treat that as
 * **visible**, exactly as `getLiveCategoryCounts` returns `undefined` rather
 * than 0 so its callers fall back to `metrics`. Root Cause #72 is this
 * project's record of the opposite choice: a "hide it when it's empty" rule
 * whose count map did not cover an option, so "unknown" read as "zero" and the
 * section vanished.
 *
 * `Partial` is therefore load-bearing typing, not convenience — an explicit
 * zero and an absent key MUST stay distinguishable.
 *
 * ## 🛑 These are AVAILABLE rows, which is a time-dependent question
 *
 * The counts come from `listPublicProducts`, the one function every public
 * browse page already queries through — so a surface can never be hidden while
 * its own page would have rendered rows, which is the correctness property
 * that matters here and the reason this is not a bespoke `count()` query.
 *
 * It inherits that function's time-dependence: an auction becomes unavailable
 * by the clock with no product write, so a type whose last row just ended stays
 * "non-empty" until the next recompute. Erring toward VISIBLE is the right
 * direction for this feature — showing an empty list is a cosmetic problem,
 * hiding a live one is a lost sale.
 *
 * @tag domain:products
 * @tag layer:schema
 * @tag access:isomorphic
 */

import type { ListingType } from "../types/index";

export const SURFACE_COUNTS_COLLECTION = "surfaceCounts";
/** Singleton — these are site-wide totals, so there is exactly one row. */
export const SURFACE_COUNTS_DOC_ID = "global";

/**
 * Public browse surfaces that are NOT a listing type and so have no
 * `listings.listingTypes` flag to hang off.
 *
 * Deliberately just `reviews` today. A key here must have a real consumer —
 * `/stores` and `/categories` already have their own `browsePages` flag and
 * adding them here would be a second mechanism deciding one thing.
 */
export type CountedSurfaceKey = "reviews";

export interface SurfaceCountsDocument {
  id: string;
  /**
   * Available listings per type. Absent key = UNKNOWN = show.
   *
   * A map rather than scalar fields: the listing-type union has grown twice
   * (nine → ten with `spares`), and a map needs no schema change for the next.
   */
  listingTypes: Partial<Record<ListingType, number>>;
  /** Non-listing-type surfaces. Absent key = UNKNOWN = show. */
  surfaces: Partial<Record<CountedSurfaceKey, number>>;
  /**
   * When the figures were taken. Read by the admin panel so an operator can
   * tell "measured as empty an hour ago" from "never measured".
   */
  updatedAt: Date;
}

/**
 * Is this surface known to be empty?
 *
 * Returns `false` for an unmeasured surface — the caller must not be able to
 * express "hide it" without a measurement that says so.
 */
export function isKnownEmpty(count: number | undefined): boolean {
  return count === 0;
}
