/**
 * G3b — the incremental leaf→root counter.
 *
 * 🛑 MAINTAINED FROM THE REPOSITORY, NOT A FIRESTORE TRIGGER, and this is the
 * decisive constraint rather than a preference. `FieldValue.increment` is
 * atomic but **not idempotent**, and a Firestore trigger is delivered
 * at-least-once — so a redelivered trigger double-counts permanently and
 * invisibly, which is the worst failure available here (a wrong number is just
 * a number; nothing errors). From `ProductRepository` a retry is the caller's
 * and the increments are one batch.
 *
 * It walks the STORED chain, which is what makes it duplicate-free and acyclic
 * by construction rather than by care:
 *
 *   - `product.categorySlugs` is already `[leaf, …ancestors, root]`, derived by
 *     `deriveTaxonomy` on create and update. Each ancestor appears exactly
 *     once, so incrementing every element once cannot double-count.
 *   - It comes from `buildCategoryTree`'s DFS over a forest, so it is acyclic
 *     by construction and bounded at 5 (tiers 0–4).
 *
 * 🛑 Do NOT walk parent-by-parent at write time. That is N reads per mutation
 * and it reintroduces the cycle question the stored chain already answers.
 */

import { increment, serverTimestamp, type FieldSentinel } from "../../../contracts/field-ops";
import { normalizeError } from "../../../errors/normalize";
import { CATEGORY_COUNTS_COLLECTION } from "../schemas/category-counts";
import type { ListingType } from "../../products/types";

/** The only product fields this module reads. */
export interface CountableProductRow {
  /** I3 — the ASSIGNED categories. Absent on every product written before I1. */
  categoryIds?: string[] | null;
  categorySlugs?: string[] | null;
  category?: string | null;
  brandSlug?: string | null;
  listingType?: ListingType | string | null;
  isLot?: boolean;
}

/**
 * One product's contribution to the counters, or `null` when it contributes
 * nothing.
 *
 * `countsNow` is the caller's availability verdict — this module deliberately
 * does NOT compute it, so there is exactly one implementation of "is this row
 * available" in the codebase (`isListingRowAvailable`) and no chance of a
 * second, disagreeing copy. Root Cause #73 is what four partial copies of that
 * predicate cost.
 */
export interface CountDelta {
  /**
   * The ASSIGNED categories — where `own` moves. One entry per assignment.
   *
   * 🛑 I3: this was a single `leaf`. A product can now be filed under several
   * categories (at most one per root), and it is genuinely "here" in each of
   * them — so `own` bumps at every one, not just the default.
   *
   * `owns[0]` is the DEFAULT assignment, because the closure is ordered
   * default-chain-first and this is read from its head.
   */
  owns: string[];
  /**
   * The whole chain — where `total` moves. INCLUDES the leaf.
   *
   * 🛑 `total` therefore includes `own` and the two must never be summed; see
   * the invariant on `CategoryCountsDocument`. The leaf ends up with own=1 and
   * total=1 for one listing, which is one count in each of two fields
   * answering two different questions — not the same item counted twice.
   */
  chain: string[];
  /**
   * The brand row, counted as a FLAT dimension: own AND total both move,
   * because a brand has no category children of its own beyond what points at
   * it — so `own === total` by construction and `descendantTotalFor` is 0.
   *
   * 🛑 This existed in `countersReconcile` and NOT here until the own/children
   * review. Without it the incremental path never touched a brand, so every
   * brand's counter stayed stale until the nightly pass and then "drifted" in
   * the log every single night — an audit signal permanently stuck on,
   * which is the same as no signal at all.
   */
  brand: string | null;
  listingType: ListingType;
  isLot: boolean;
}

const DEFAULT_LISTING_TYPE: ListingType = "standard";

/**
 * Read a product's countable identity.
 *
 * Mirrors `countersReconcile.tallyProduct`'s own field selection exactly —
 * `categorySlugs[0]` first, then the `@deprecated` scalar `category` — so the
 * incremental and the nightly values can agree. Two different leaf selections
 * would drift silently and the reconciler would "correct" a count that was
 * right.
 */
export function describeCountable(row: CountableProductRow): CountDelta | null {
  const chainRaw = Array.isArray(row.categorySlugs) ? row.categorySlugs : [];

  /*
   * I3 — the ASSIGNED list is what `own` keys on, and it is read from
   * `categoryIds` with the old single-leaf selection as the fallback.
   *
   * 🛑 The fallback is not legacy tidiness, it is required: `categoryIds` was
   * added in I1, so every product written before it has only `categorySlugs`,
   * and the nightly reconciler reads the same two fields in the same order. Two
   * different selections would drift silently and the reconciler would
   * "correct" a count that was right.
   */
  const ownsRaw = Array.isArray(row.categoryIds) && row.categoryIds.length > 0
    ? row.categoryIds
    : [chainRaw[0] || row.category || ""];

  const ownSeen = new Set<string>();
  const owns: string[] = [];
  for (const id of ownsRaw) {
    if (!id || ownSeen.has(id)) continue;
    ownSeen.add(id);
    owns.push(id);
  }
  if (owns.length === 0) return null;

  /*
   * Dedupe the chain. The one real duplicate risk the stored closure does NOT
   * remove is a product filed under two leaves that share an ancestor — the
   * shared ancestor would otherwise be incremented twice for one listing.
   *
   * 🛑 Under the one-per-root rule that cannot happen, and the dedupe stays
   * anyway: the rule is enforced at ONE write path, while this runs on every
   * row that reaches Firestore — including a seeded row and an admin
   * `.passthrough()` write, neither of which passes through it. A belt, and the
   * cheaper of the two places to be wrong.
   */
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const id of [...owns, ...chainRaw]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    chain.push(id);
  }

  /*
   * 🛑 Never count the brand twice. If a row's leaf id were also its brand id,
   * the brand bump below would land on a category already bumped by the chain.
   * It cannot happen with today's `category-` / `brand-` prefixes, which is
   * exactly why it is worth guarding rather than trusting: the prefixes are a
   * convention and this is an arithmetic invariant.
   */
  const brandSlug = row.brandSlug || null;
  const brand = brandSlug && !seen.has(brandSlug) ? brandSlug : null;

  return {
    owns,
    chain,
    brand,
    listingType: (row.listingType as ListingType) || DEFAULT_LISTING_TYPE,
    isLot: row.isLot === true,
  };
}

/**
 * Whether a mutation can possibly have changed the counters.
 *
 * 🛑 THE BUG THIS EXISTS TO PREVENT, and the plan called it in advance: a guard
 * that asks only "did the taxonomy change?" MISSES EVERY STATUS TRANSITION.
 * `draft → published` changes no `categorySlugs` at all, so the count would
 * never move — silently, on a page that looks correct. Same for
 * `published → archived`, a sell-out, and a soft delete.
 *
 * So the comparison is over (chain, leaf, listingType, isLot, countsNow), and
 * the availability verdict is a first-class input rather than an afterthought.
 */
export function countsChanged(
  before: { delta: CountDelta | null; countsNow: boolean },
  after: { delta: CountDelta | null; countsNow: boolean },
): boolean {
  const b = before.countsNow ? before.delta : null;
  const a = after.countsNow ? after.delta : null;
  if (!b && !a) return false;
  if (!b || !a) return true;
  return (
    b.owns.length !== a.owns.length ||
    b.owns.some((id, i) => id !== a.owns[i]) ||
    b.brand !== a.brand ||
    b.listingType !== a.listingType ||
    b.isLot !== a.isLot ||
    b.chain.length !== a.chain.length ||
    b.chain.some((id, i) => id !== a.chain[i])
  );
}

/** A single field path → increment, keyed so the batch can merge them. */
export type CountPatch = Map<string, Map<string, number>>;

function bump(patch: CountPatch, categoryId: string, field: string, by: number): void {
  let doc = patch.get(categoryId);
  if (!doc) {
    doc = new Map();
    patch.set(categoryId, doc);
  }
  doc.set(field, (doc.get(field) ?? 0) + by);
}

/**
 * Build the field-path increments for one product transition.
 *
 * `sign` is +1 for an addition and −1 for a removal; an update is expressed as
 * a removal of the old shape followed by an addition of the new, which is why
 * a move between leaves nets to −1 on the old chain and +1 on the new with no
 * node double-counted.
 */
export function buildCountPatch(
  deltas: Array<{ delta: CountDelta | null; sign: 1 | -1 }>,
): CountPatch {
  const patch: CountPatch = new Map();
  for (const { delta, sign } of deltas) {
    if (!delta) continue;
    const ownField = delta.isLot ? "lots.own" : `own.${delta.listingType}`;
    const totalField = delta.isLot ? "lots.total" : `total.${delta.listingType}`;
    /*
     * Every ASSIGNMENT gets `own`; the whole deduped closure gets `total`.
     *
     * 🛑 `own` at each one is the point of I3: a product assigned to both
     * category-dragoon-g and category-beyblade is genuinely filed in both, and
     * each page's "N here" must say so. `total` is still one bump per closure
     * entry, so a shared ancestor moves by 1 for the listing rather than by the
     * number of assignments that reach it.
     */
    for (const id of delta.owns) bump(patch, id, ownField, sign);
    for (const id of delta.chain) bump(patch, id, totalField, sign);
    // A brand is flat: own and total move together, so its descendant count
    // derives to 0 rather than to a negative number.
    if (delta.brand) {
      bump(patch, delta.brand, ownField, sign);
      bump(patch, delta.brand, totalField, sign);
    }
  }
  /*
   * Drop net-zero fields. A move WITHIN one leaf (a title edit on a row whose
   * chain did not change) cancels to nothing, and writing `increment(0)` would
   * still be a write — one per ancestor, on the hottest path in the app.
   */
  for (const [catId, fields] of patch) {
    for (const [field, by] of fields) if (by === 0) fields.delete(field);
    if (fields.size === 0) patch.delete(catId);
  }
  return patch;
}

/**
 * Apply a patch.
 *
 * `set(..., { merge: true })` rather than `update`, because the counts document
 * may not exist yet: `update` on a missing document throws, and a counter that
 * refuses to start is worse than one that starts at the first mutation. Merge
 * also leaves the OTHER listing types' keys untouched, which is what keeps the
 * map `Partial`.
 *
 * 🛑 Failure is swallowed deliberately, and this is the one place in this
 * codebase where that is right: a count is a display number, and failing a
 * seller's publish because an ancestor counter could not be bumped would trade
 * a cosmetic staleness for a lost listing. The nightly reconciler is the
 * backstop — its `drifted` count is how a missed increment becomes visible.
 */
export async function applyCountPatch(
  db: { collection(name: string): any },
  patch: CountPatch,
  onError?: (err: { message: string }) => void,
): Promise<void> {
  if (patch.size === 0) return;
  try {
    const col = db.collection(CATEGORY_COUNTS_COLLECTION);
    await Promise.all(
      Array.from(patch, ([categoryId, fields]) => {
        /*
         * `FieldSentinel` rather than `unknown`: every value here is either
         * the id string or a Firestore sentinel (`increment` / `serverTimestamp`),
         * and `Record<string, unknown>` would be a dodge that `audit-unknown-leakage`
         * correctly refuses — it says nothing about what may be written.
         */
        const payload: Record<string, FieldSentinel | string> = {
          id: categoryId,
          updatedAt: serverTimestamp(),
        };
        for (const [field, by] of fields) payload[field] = increment(by);
        return col.doc(categoryId).set(payload, { merge: true });
      }),
    );
  } catch (err) {
    // Typed before anything downstream touches it (Root Cause #31) — the
    // caller logs `.message`, and an `unknown` escaping a catch is how a
    // non-Error throw becomes "[object Object]" in a log line.
    onError?.(normalizeError(err));
  }
}
