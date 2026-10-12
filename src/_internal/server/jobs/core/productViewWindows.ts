/*
 * WHY: visit data was collected and thrown away. `PageViewTracker` is mounted
 *      on ~30 public surfaces and writes one `pageViews` bucket per entity per
 *      day — and NOTHING joined those buckets to a product, so no seller could
 *      see how many people looked at their listing. Meanwhile `viewCount` was
 *      `canFilter`/`canSort` in the products Sieve config with no writer on any
 *      document, so a `?sort=viewCount` returned ZERO rows (Root Cause #100).
 *
 * WHAT: a nightly recompute of each product's trailing 7- and 30-day view
 *       counts onto `views7d` / `views30d`.
 *
 * EXPORTS: runProductViewWindows
 *
 * ── 🛑 WHY THIS IS A SEPARATE PASS FROM `pageViewRollup` ───────────────────
 *
 * They cannot share a read. `pageViewRollup` ACCUMULATES: it folds only buckets
 * it has not seen, because the ones it has are then deleted by the prune, so a
 * recompute-from-scratch would make its total walk backwards. A trailing window
 * is the opposite shape — it must re-read the last 30 days EVERY run, because
 * yesterday's 30-day window is not today's. Mixing them would break
 * `throughDate`'s invariant, which is the one thing making that job
 * re-runnable.
 *
 * ── 🛑 IT ENUMERATES PRODUCTS, NOT BUCKETS ────────────────────────────────
 *
 * Root Cause #102's lesson, which cost 19 of 65 category rows: a reconciler
 * that walks the EVENTS can only ever add. A product that stops being viewed
 * must have its figure fall to 0, and that product has no bucket in the window
 * at all — so the pass is driven by the product list and a missing bucket means
 * zero rather than "leave it alone".
 *
 * ── 🛑 ABSENT STILL MEANS "NOT ROLLED UP", NOT ZERO ───────────────────────
 *
 * The first run writes every product including the ones at 0, so after it
 * absence is unambiguous. Before it, a reader must distinguish the two — which
 * is why the renderers check `typeof x === "number"` and not truthiness.
 *
 * @tag domain:analytics
 * @tag layer:job
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:pageViewRollup scheduled function
 * @tag sideEffects:writes products.views7d / products.views30d
 */

import { pageViewsRepository } from "../../../../features/analytics/repository/page-views.repository";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import type { JobContext } from "../runtime/types";

/** The longer of the two windows, so one read serves both. */
const WINDOW_DAYS = 30;
const SHORT_WINDOW_DAYS = 7;

/**
 * 🛑 A bound, because `listInRange` has none.
 *
 * One bucket per product per day: 95 products over 30 days is ~2,850 documents
 * today, which is fine, and 5,000 products would be 150,000 — well past what a
 * 540s function should read in one pass. Saturating this is reported rather
 * than silently truncating the windows, because a truncated window is a wrong
 * number that looks exactly like a right one.
 */
const MAX_BUCKETS = 20_000;

/** Matches `countersReconcile`'s scan page, and stays under the 500-op batch. */
const PAGE_SIZE = 200;

function dayKey(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function runProductViewWindows(ctx: JobContext): Promise<void> {
  /*
   * Through YESTERDAY, not today. Today's bucket is still being written to, so
   * including it makes the figure move during the day for no reason a reader
   * could explain — and the rollup beside this one draws the same line for the
   * same reason.
   */
  const through = dayKey(-1);
  const from = dayKey(-WINDOW_DAYS);
  const shortFrom = dayKey(-SHORT_WINDOW_DAYS);

  /*
   * No `.catch(() => [])`. An empty range is a legitimate zero, so a swallowed
   * failure would write a confident "nobody looked at this" across the whole
   * catalogue — and that is indistinguishable from the truth. Let it throw.
   */
  const buckets = await pageViewsRepository.listInRange(from, through, "product");
  if (buckets.length >= MAX_BUCKETS) {
    /*
     * Refuse rather than write. A partial window is a wrong number with a
     * confident shape, and the whole point of this pass is that the figure can
     * be trusted. The prune keeps the collection bounded, so this firing is a
     * signal that the window or the catalogue has outgrown one query.
     */
    ctx.logger.error("productViewWindows: bucket cap hit, refusing to write", {
      buckets: buckets.length,
      cap: MAX_BUCKETS,
      from,
      through,
    });
    return;
  }

  const views30 = new Map<string, number>();
  const views7 = new Map<string, number>();
  for (const b of buckets) {
    const n = Number(b.count) || 0;
    if (!Number.isFinite(n) || n <= 0) continue;
    views30.set(b.entityId, (views30.get(b.entityId) ?? 0) + n);
    // One pass, two windows: the 7-day figure is the tail of the same read.
    if (b.date >= shortFrom) views7.set(b.entityId, (views7.get(b.entityId) ?? 0) + n);
  }

  /*
   * 🛑 Driven by the PRODUCT list. A product with no bucket in the window gets
   * 0 written, which is the half a bucket-driven pass cannot do — see the
   * header.
   */
  let scanned = 0;
  let written = 0;
  /*
   * `ctx.db` with `orderBy("__name__")` + `startAfter`, which is exactly what
   * `countersReconcile` does over this same collection. Bounded reads,
   * unbounded total coverage — and no new repository method, because the one I
   * first reached for did not exist.
   */
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = ctx.db
      .collection(PRODUCT_COLLECTION)
      .orderBy("__name__")
      .limit(PAGE_SIZE);
    if (cursor) q = q.startAfter(cursor);
    const page = await q.get();
    if (page.empty) break;

    /*
     * One batch per page. `batchUpdateEach` caps at Firestore's 500 operations
     * and PAGE_SIZE is 200, so a page can never exceed it.
     */
    const batch = ctx.db.batch();
    let inBatch = 0;
    for (const doc of page.docs) {
      scanned += 1;
      const data = doc.data() as { views7d?: number; views30d?: number };
      const next7 = views7.get(doc.id) ?? 0;
      const next30 = views30.get(doc.id) ?? 0;
      // Skip a no-op. `countersReconcile` does the same: a product already at
      // these figures costs no write rather than a wasted one.
      if (data.views7d === next7 && data.views30d === next30) continue;
      batch.update(doc.ref, { views7d: next7, views30d: next30 });
      inBatch += 1;
    }
    if (inBatch > 0) {
      await batch.commit();
      written += inBatch;
    }

    cursor = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
  }

  ctx.logger.info("productViewWindows: complete", {
    from,
    through,
    buckets: buckets.length,
    productsScanned: scanned,
    productsWritten: written,
    /*
     * Reported because on a quiet day a non-zero `written` with a zero
     * `buckets` would mean the pass is zeroing the whole catalogue — which is
     * correct if nobody visited, and a signal if the tracker has stopped
     * recording. Neither is visible from a success line alone.
     */
    productsWithViews: views30.size,
  });
}
