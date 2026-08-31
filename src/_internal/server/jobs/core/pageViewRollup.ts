/*
 * WHY: `pageViewPrune` deletes day-buckets past the retention window. Without a
 *      rollup that would also delete the only record that those views ever
 *      happened — the admin's lifetime total would silently walk backwards as
 *      the prune caught up with it.
 *
 * WHAT: Fold each new day-bucket into a singleton total before the prune can
 *       reach it. Modelled on `revenueRollup`: scan → one small doc → the API
 *       route reads a single document instead of the collection.
 *
 * EXPORTS: runPageViewRollup
 *
 * @tag domain:analytics
 * @tag layer:job
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:pageViewRollup scheduled function
 * @tag sideEffects:writes analytics/pageViewRollup
 */

import { pageViewsRepository } from "../../../../features/analytics/repository/page-views.repository";
import { pageViewRollupRepository } from "../../../../features/admin/repository/analytics-rollup.repository";
import type { JobContext } from "../runtime/types";

/** The earliest date this rollup will fold in on a cold start. */
const EPOCH_DATE = "2020-01-01";

function dayKey(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function runPageViewRollup(ctx: JobContext): Promise<void> {
  const existing = await pageViewRollupRepository.get();

  /*
   * 🛑 `throughDate` is what makes this job re-runnable.
   *
   * The rollup ACCUMULATES rather than recomputing — the day-buckets it has
   * already folded in get deleted by `pageViewPrune`, so a recompute-from-
   * scratch would produce a total that shrinks every time the prune runs. So it
   * must only ever read buckets it has not seen, and `throughDate` is the
   * boundary. Running this twice in one day is a no-op; running it after a
   * missed day still catches up.
   */
  const from = existing?.throughDate
    ? dayKey(0) === existing.throughDate
      ? null // already folded in today — nothing new to read
      : nextDay(existing.throughDate)
    : EPOCH_DATE;

  if (from === null) {
    ctx.logger.info("pageViewRollup: already current", {
      throughDate: existing?.throughDate ?? "",
    });
    return;
  }

  // Yesterday, not today: today's buckets are still being written to, and
  // folding a partial day in would make it uncountable tomorrow.
  const through = dayKey(-1);
  if (from > through) {
    ctx.logger.info("pageViewRollup: nothing to fold", { from, through });
    return;
  }

  /*
   * No `.catch(() => [])`. An empty range is a legitimate zero, so a swallowed
   * query failure would write a confident "no views" the dashboard cannot tell
   * from the real thing — and unlike `revenueRollup`, this one ACCUMULATES, so
   * a bad read would also advance `throughDate` past days it never counted and
   * lose them permanently. Let it throw; the runner records the failure and the
   * stale-but-correct singleton stays.
   */
  const buckets = await pageViewsRepository.listInRange(from, through);

  const byEntityType: Record<string, number> = { ...(existing?.byEntityType ?? {}) };
  let totalViews = existing?.totalViews ?? 0;

  for (const b of buckets) {
    const n = Number(b.count) || 0;
    totalViews += n;
    byEntityType[b.entityType] = (byEntityType[b.entityType] ?? 0) + n;
  }

  await pageViewRollupRepository.set({ totalViews, byEntityType, throughDate: through });

  ctx.logger.info("pageViewRollup: complete", {
    from,
    through,
    bucketsFolded: buckets.length,
    totalViews,
  });
}

function nextDay(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
