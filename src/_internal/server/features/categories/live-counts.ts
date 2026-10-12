/**
 * G3b — read the live `categoryCounts` documents for a BOUNDED set of ids.
 *
 * 🛑 WHO THIS IS FOR, because it is not the category detail page.
 * `CategoryDetailPageView` already computes its own tab counts live
 * (`listing-tab-counts`), so its headline numbers were never stale. The stale
 * readers are the ones that render MANY categories and therefore cannot query
 * per category: the `/categories` grid, the homepage category tiles, the
 * admin table, the tree, and the child chips on a category page. All five read
 * `metrics.totalProductCount`, which only the nightly reconciler writes.
 *
 * 🛑 `db.getAll` — ONE round-trip for N ids, not N round-trips. That is what
 * reconciles this with the plan's own warning that `CategoryDetailPageView` is
 * already at Rule #6's ~3-sequential-round-trip ceiling and "a sidecar
 * collection would add an eighth": the existing seven reads are a
 * `Promise.all`, so an eighth PARALLEL read adds no latency. It does add N
 * document reads of quota, bounded by the page size the caller already
 * fetched.
 *
 * 🛑 A missing document is `undefined`, never 0. The caller must fall back to
 * `metrics` — rendering a confident zero for a category whose counter has not
 * been written yet is Root Cause #72's lesson (a count that is unknown must
 * never be indistinguishable from a count of nothing), and it would make this
 * change a regression on every category until its first mutation.
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import {
  CATEGORY_COUNTS_COLLECTION,
  liveTotalFor,
  type CategoryCountsDocument,
} from "../../../../features/categories/schemas/category-counts";

/** Hard ceiling on one batch — `getAll` is a single RPC but not a free one. */
const MAX_IDS = 200;

export interface LiveCountsResult {
  /** categoryId → the rolled-up total, when a counts document exists. */
  total: Map<string, number>;
  /** True when the id list was truncated, so the caller can stop claiming completeness. */
  truncated: boolean;
}

export async function getLiveCategoryCounts(
  db: { collection(name: string): { doc(id: string): unknown }; getAll(...refs: unknown[]): Promise<Array<{ exists: boolean; id: string; data(): unknown }>> },
  ids: readonly string[],
): Promise<LiveCountsResult> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const truncated = unique.length > MAX_IDS;
  const take = truncated ? unique.slice(0, MAX_IDS) : unique;
  const total = new Map<string, number>();
  if (take.length === 0) return { total, truncated };

  try {
    const col = db.collection(CATEGORY_COUNTS_COLLECTION);
    const snaps = await db.getAll(...take.map((id) => col.doc(id)));
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const v = liveTotalFor(snap.data() as CategoryCountsDocument);
      if (v !== undefined) total.set(snap.id, v);
    }
  } catch (err) {
    // Typed FIRST, on the catch's own line, because `audit-catch-normalize`
    // reads a short window after the clause and the explanation below is
    // longer than it.
    const e = normalizeError(err);
    /*
     * Fail OPEN with an empty map, so every caller falls back to `metrics` and
     * renders exactly as it does today. A count is a display number: throwing
     * here would take down a category page over a counter, which is the trade
     * `.catch(() => null)` normally gets wrong — the difference is that here
     * the fallback is a REAL alternative value, not an empty page.
     *
     * 🛑 But it is LOGGED, not swallowed. `void normalizeError(err)` as a
     * catch's only statement is as silent as `catch {}` while looking handled,
     * which is what `audit-silent-degrade` calls normalize theatre — and it
     * caught exactly that here. Silent to the visitor, loud to the operator.
     */
    serverLogger.warn("categoryCounts batch read failed — falling back to metrics", {
      ids: take.length,
      error: e.message,
    });
  }
  return { total, truncated };
}
