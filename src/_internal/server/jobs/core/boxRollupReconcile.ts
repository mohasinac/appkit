/**
 * Recompute every storage box's `rollup` from its real placements.
 *
 * ── WHY A JOB AND NOT A TRIGGER ─────────────────────────────────────────────
 *
 * `rollup` exists so the boxes LIST can show "8 products · 23 units" without
 * one placements query per row. It is a cache, and this is its only writer.
 *
 * 🛑 DELIBERATELY NOT A FIRESTORE TRIGGER ON `inventoryPlacements`. A trigger
 * that watched placements and wrote back to `storageBoxes` would fire on every
 * single pick, move and receive — a 50-row receive is 50 placement writes and
 * would wake it 50 times to recompute the same two boxes. Worse, it is one
 * refactor away from Root Cause #92's shape: a trigger whose write-back lands
 * in a collection it also watches, which cost this project 1,017,548
 * invocations in 24 hours against a 2M/month free quota.
 *
 * A nightly pass is the right cadence BECAUSE THE CACHE IS ADVISORY. Every
 * surface that must be correct reads placements directly — the box detail page
 * does, and its own note says why — so a rollup up to a day stale costs a
 * slightly wrong number in a list, never a wrong decision.
 *
 * ── WHAT IT FIXES, AS OPPOSED TO MAINTAINS ──────────────────────────────────
 *
 * It is a REPAIR job, which is the lesson from Root Cause #102: a reconciler
 * must enumerate the ENTITIES, not the events, or it can only ever add. A box
 * whose last product was picked yesterday has no placements at all — so a pass
 * built from placements would never visit it, and it would keep advertising
 * the count it had when it was last full. Walking `storageBoxes` and treating
 * "no placements" as a real zero is the whole point.
 *
 * It also logs `drifted`. On a quiet day that number should be 0, and a
 * non-zero one is a real signal that something wrote placements without the
 * repository — which `audit-inventory-ledger-append-only` is supposed to make
 * impossible.
 *
 * @tag domain:inventory
 * @tag layer:job
 * @tag access:server
 */

import type { JobContext } from "../runtime/types";
import {
  INVENTORY_PLACEMENTS_COLLECTION,
  STORAGE_BOXES_COLLECTION,
  type InventoryPlacementDocument,
  type StorageBoxDocument,
} from "../../../../features/inventory/schemas/firestore";

export interface BoxRollupReconcileResult {
  boxesVisited: number;
  drifted: number;
  written: number;
}

/** Pages rather than `.limit(1000)` — see the note at the call. */
const BOX_PAGE = 200;

export async function runBoxRollupReconcile(
  ctx: JobContext,
): Promise<BoxRollupReconcileResult> {
  const db = ctx.db;
  let boxesVisited = 0;
  let drifted = 0;
  let written = 0;

  /*
   * 🛑 PAGINATED, NOT `.limit(N)`. A truncated reconcile is indistinguishable
   * from a complete one — it logs "reconciliation complete" having silently
   * ignored every box past the cap, which is exactly how the counters job
   * under-reported for weeks (Root Cause #102). Ordering by document id gives
   * a stable cursor with no index.
   */
  let cursor: string | null = null;

  for (;;) {
    let q = db
      .collection(STORAGE_BOXES_COLLECTION)
      .orderBy("__name__")
      .limit(BOX_PAGE);
    if (cursor) q = q.startAfter(cursor);

    const page = await q.get();
    if (page.empty) break;

    for (const doc of page.docs) {
      boxesVisited += 1;
      const box = doc.data() as StorageBoxDocument;

      /*
       * One query per box. Bounded and cheap — a box holds tens of products,
       * not thousands — and `.select()` fetches only the two fields the tally
       * needs rather than every placement's denormalised title and SKU.
       */
      const placements = await db
        .collection(INVENTORY_PLACEMENTS_COLLECTION)
        .where("boxId", "==", doc.id)
        .select("quantity")
        .get();

      let distinctProducts = 0;
      let totalUnits = 0;
      for (const p of placements.docs) {
        const qty = (p.data() as Pick<InventoryPlacementDocument, "quantity">)
          .quantity;
        /*
         * A zero- or negative-quantity placement should not exist — `pick`
         * deletes at zero — so it is counted as neither a product nor a unit
         * and reported, rather than quietly inflating `distinctProducts` with
         * a row representing nothing.
         */
        if (!(typeof qty === "number" && qty > 0)) continue;
        distinctProducts += 1;
        totalUnits += qty;
      }

      const prior = box.rollup;
      const changed =
        !prior ||
        prior.distinctProducts !== distinctProducts ||
        prior.totalUnits !== totalUnits;

      if (!changed) continue;
      drifted += 1;

      /*
       * A direct `update`, not `storageBoxesRepository.setRollup`. The job
       * owns thousands of these and a repository call per box would re-read
       * the document it already holds — and the repository's own note says
       * `setRollup` is for a caller that has a box id and nothing else.
       *
       * Only the three rollup fields plus `updatedAt` are written: a merge of
       * the whole document would resurrect any field a concurrent edit had
       * just cleared.
       */
      /*
       * `ctx.now`, not `new Date()`. Every box in one pass then carries the
       * SAME `computedAt`, so "as of" on a printed label means the pass rather
       * than the millisecond that box happened to be reached — and two boxes
       * reconciled by one run cannot appear to have been counted minutes
       * apart.
       */
      await doc.ref.update({
        rollup: { distinctProducts, totalUnits, computedAt: ctx.now },
        updatedAt: ctx.now,
      });
      written += 1;
    }

    if (page.size < BOX_PAGE) break;
    cursor = page.docs[page.docs.length - 1]!.id;
  }

  /*
   * `drifted` is the signal, not `boxesVisited`. Every placement write goes
   * through the repository, which keeps nothing cached — so on a quiet day
   * this should be the number of boxes whose contents actually changed since
   * the last pass. A number far larger than that, or one that never falls,
   * means something is writing placements outside the repository.
   */
  ctx.logger.info("boxRollupReconcile complete", {
    boxesVisited,
    drifted,
    written,
  });

  return { boxesVisited, drifted, written };
}
