import type { ScheduleHandler } from "../runtime/types";
import { normalizeError } from "../../../../errors/normalize";
import { runCountersReconcile } from "../core/countersReconcile";
import { runSurfaceCountsRollup } from "../core/surfaceCountsRollup";

/*
 * 🛑 The surface-count rollup rides THIS job rather than taking a Scheduler
 * slot of its own.
 *
 * Two reasons, and the second is the one that matters:
 *
 * 1. Cost — every registered Scheduler job is billed (~$0.10/mo beyond the
 *    free 3), and the Firebase budget table in CLAUDE.md says to fold new
 *    periodic work into an existing cadence when it is a natural fit.
 * 2. Semantics — `countersReconcile` IS the nightly healer for incrementally
 *    maintained counters. `surfaceCounts` is incrementally maintained by
 *    `onProductWrite` under exactly the same "non-fatal, the nightly job will
 *    heal it" contract. Putting the healer somewhere else would mean two jobs
 *    owning one guarantee.
 *
 * Sequential, not `Promise.all`: both walk products, and running them together
 * doubles the peak read rate for no wall-clock benefit on a 540s budget.
 *
 * 🛑 Its failure must not fail the reconcile. The counters this job exists for
 * are the ones two Sieve SORTS order by; a surface count is a display decision
 * that degrades to "unknown", i.e. to showing the surface. Never let the
 * cosmetic half take down the load-bearing half.
 */
export const countersReconcileHandler: ScheduleHandler = async (ctx) => {
  const result = await runCountersReconcile(ctx);

  try {
    const surfaces = await runSurfaceCountsRollup(ctx);
    /*
     * Serialised to `"type=n"` pairs rather than logged as the maps
     * themselves: the logger's value type is `JsonValue`, and a
     * `Partial<Record<K, number>>` is not assignable to it (an optional
     * property can be `undefined`, which is not JSON). Flattening is also the
     * more readable log line.
     */
    ctx.logger.info("Surface counts rolled up", {
      listingTypes: Object.entries(surfaces.listingTypes)
        .map(([k, v]) => `${k}=${v}`)
        .join(" "),
      surfaces: Object.entries(surfaces.surfaces)
        .map(([k, v]) => `${k}=${v}`)
        .join(" "),
      // Named rather than counted — a surface left unmeasured stays visible,
      // and an operator needs to know WHICH, not how many.
      failed: surfaces.failed.join(",") || "none",
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Surface-count rollup failed (non-fatal)", err);
  }

  return result;
};
