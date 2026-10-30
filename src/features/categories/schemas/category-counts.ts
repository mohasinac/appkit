/**
 * G3b — LISTING COUNTS, maintained incrementally leaf→root.
 *
 * 🛑 WHY THIS IS A SIBLING COLLECTION AND NOT A FIELD ON `categories`.
 *
 * `handleCategoryWrite` calls `notifyRevalidate({ collection: "categories" })`
 * as its FIRST statement, unconditionally, before any branch — so ANY write to
 * a category document drops that category page's ISR entry. Under leaf→root,
 * publishing one listing touches up to five ancestors, so it would drop five
 * ISR entries per publish. This project was paused with **ISR writes at 3.1M
 * against a 200K cap (15.5×)**, which settles the question.
 *
 * It also removes the Root Cause #92 hazard outright: a trigger that writes
 * back to the collection it watches produced 1,017,548 invocations in 24 hours
 * and a billing denial that blocked `firebase deploy`.
 *
 * 🛑 AND `metrics.*` ON `categories` STAYS — a constraint the plan did not
 * record. Two Sieve SORTS order by `metrics.productCount` through Firestore
 * (`CategoriesIndexListing`'s "Most Products" and
 * `AdminSublistingCategoriesView`'s "Most listings"), and a sibling collection
 * cannot serve an `orderBy` on the categories query. So:
 *
 *   - `metrics.*`      — written ONLY by the nightly `countersReconcile`, as
 *                        today. The two sorts keep working at exactly today's
 *                        accuracy, so there is no regression, and the ISR cost
 *                        is unchanged from the status quo (one drop per
 *                        category per night, already happening).
 *   - `categoryCounts` — the LIVE value, written per product mutation. Fires no
 *                        revalidation, because nothing triggers on it.
 *
 * Readers prefer `categoryCounts` and fall back to `metrics`. That ordering is
 * what makes the feature additive: a category with no counts document yet
 * renders exactly as it does today rather than as zero.
 *
 * 🛑 HOW FRESH IT ACTUALLY IS, stated precisely rather than as "live".
 *
 * The count is of AVAILABLE rows — `isListingRowAvailable`, the same predicate
 * `countersReconcile` and the listing query use. That predicate is partly
 * TIME-dependent: `collector drop` is the one type with an inequality clause
 * (`collectorDropEndDate`), so a collector drop becomes unavailable by the clock with no
 * product write, and no incremental counter can observe that.
 *
 * In practice the window is minutes, not a day: `collectorDropSettlement` writes
 * `isSold: true` when it settles, and that write re-evaluates the counter.
 * Every other type's unavailability is write-driven (stock, `isSold`,
 * `digitalCode.codesAvailable`, the prize-draw reveal status).
 *
 * So: instant for every write-driven change, and bounded by the settlement
 * cadence for a just-ended collector drop. That is strictly better than today, where
 * every change is up to 24h stale. The nightly reconciler stays as the
 * authority and the audit — its `drifted` counter becomes a real signal that
 * an increment was missed.
 */

import type { ListingType } from "../../products/types";

export const CATEGORY_COUNTS_COLLECTION = "categoryCounts";

/**
 * Per-listing-type counters.
 *
 * 🛑 `Partial` on purpose: an absent key means "zero observed". Writing nine
 * explicit zeros on every row is noise, and it would also make an untouched
 * category indistinguishable from one measured as empty.
 *
 * A MAP rather than scalar fields, because own+total across nine listing types
 * is 18 fields that grow with the union — and the union has grown twice
 * already. A map needs no schema change for a tenth type.
 */
export type ListingTypeCounts = Partial<Record<ListingType, number>>;

/**
 * 🛑 THE INVARIANT, and the one way to get this wrong:
 *
 *     total  =  own  +  (every descendant's own)
 *
 * **`total` ALREADY INCLUDES `own`. Never add them.** `own + total` double-counts
 * every item filed directly under the row, and on a leaf — where `total === own`
 * — it doubles the whole number.
 *
 * So there are three questions and only two stored fields, because the third is
 * a subtraction and a stored mirror of it would drift the first time one half
 * was written without the other (Root Cause #42):
 *
 * | Question | Read |
 * |---|---|
 * | "how many are filed right here?" | `own` |
 * | "how many are under my subcategories?" | **`descendantCountsFor()`** — `total − own`, derived |
 * | "how many will clicking this show me?" | `total` |
 *
 * The third is the one a buyer means, which is why `liveTotalFor` returns it
 * and why the category chips and grid read it. The second exists because the
 * distinction is genuinely useful to an admin — `CategoryTableColumns` already
 * renders "own (total)" explicitly — and because deriving it is the only way to
 * show it without a third counter to keep in step.
 */
export interface CategoryCountsDocument {
  /** === the category's document id. */
  id: string;
  /** Listings filed DIRECTLY under this category, by type. */
  own: ListingTypeCounts;
  /**
   * Own + every descendant's, by type. Equals `own` on a leaf.
   *
   * 🛑 INCLUDES `own` — see the invariant above. Never `own + total`.
   */
  total: ListingTypeCounts;
  /**
   * Multi-item LOTS, counted separately from singles.
   *
   * 🛑 This separation is what makes a count mean one thing, and it is why the
   * filing rule in `deriveTaxonomy` only has to refuse a lot at a LEAF rather
   * than also refusing a single at a non-leaf. A lot and a single are never
   * summed into one number, so "12 listings here" is unambiguous wherever they
   * are filed. (Measured: 58 of 70 live products file at a non-leaf, so the
   * symmetric rule the plan first specified would have rejected most of the
   * catalogue — see the `isLot` docstring on `ProductDocument`.)
   *
   * Scalars rather than a per-type map: a lot is not type-specific in any way
   * a buyer or a seller filters on, and there is no reader for "lots of
   * collector drops".
   */
  lots: { own: number; total: number };
  updatedAt: Date;
}

/** Sum a counts map — what a category page renders as "N listings". */
export function sumCounts(counts: ListingTypeCounts | undefined): number {
  if (!counts) return 0;
  let n = 0;
  for (const v of Object.values(counts)) n += v ?? 0;
  return n;
}

/**
 * The display count for a category, preferring the live document.
 *
 * 🛑 `undefined` means "no counts document yet", NOT zero — so the caller falls
 * back to `metrics`. Returning 0 here would render a confident zero on every
 * category until the first mutation, which is Root Cause #72's lesson (a count
 * that failed must never be indistinguishable from a count of nothing).
 */
export function liveTotalFor(
  doc: Pick<CategoryCountsDocument, "total" | "lots"> | null | undefined,
): number | undefined {
  if (!doc) return undefined;
  return sumCounts(doc.total) + (doc.lots?.total ?? 0);
}

/** Filed directly here, lots included. The "N here" half of "N here, M below". */
export function ownTotalFor(
  doc: Pick<CategoryCountsDocument, "own" | "lots"> | null | undefined,
): number | undefined {
  if (!doc) return undefined;
  return sumCounts(doc.own) + (doc.lots?.own ?? 0);
}

/**
 * How many sit under this row's DESCENDANTS and not directly on it — `total − own`.
 *
 * 🛑 DERIVED, never stored, and that is the point: a third stored counter would
 * be a mirror of a subtraction, and a mirror drifts the moment one half is
 * written without the other (Root Cause #42). It is also the function that
 * makes the invariant un-missable — anyone reaching for "own plus children"
 * finds this instead of writing `own + total`, which double-counts every item
 * filed directly on the row.
 *
 * Clamped at 0. A negative value is real and means the counters drifted (an
 * increment lost between the leaf write and an ancestor's), and surfacing
 * "−3 in subcategories" to a visitor is worse than showing none — the nightly
 * reconciler's `countsWritten` is where that drift is meant to be seen.
 */
export function descendantTotalFor(
  doc: Pick<CategoryCountsDocument, "own" | "total" | "lots"> | null | undefined,
): number | undefined {
  if (!doc) return undefined;
  const total = liveTotalFor(doc) ?? 0;
  const own = ownTotalFor(doc) ?? 0;
  return Math.max(0, total - own);
}

/** The per-type descendant split, same derivation and the same clamp. */
export function descendantCountsFor(
  doc: Pick<CategoryCountsDocument, "own" | "total"> | null | undefined,
): ListingTypeCounts | undefined {
  if (!doc) return undefined;
  const out: ListingTypeCounts = {};
  for (const k of Object.keys(doc.total ?? {}) as Array<keyof ListingTypeCounts>) {
    const d = (doc.total[k] ?? 0) - (doc.own?.[k] ?? 0);
    if (d > 0) out[k] = d;
  }
  return out;
}
