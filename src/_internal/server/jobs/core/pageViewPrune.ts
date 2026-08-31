/*
 * WHY: `pageViews` writes one document per entity per day and had NO prune.
 *      Twenty-seven scheduled functions existed — `cartPrune`,
 *      `notificationPrune`, `draftPrune`, `dailyDataCleanup` — and not one of
 *      them touched this collection, so it was the only unbounded writer in the
 *      system. Its size was capped by nothing except how many distinct pages
 *      the catalogue had, multiplied by how long the site had been running.
 *
 * WHAT: Delete day-buckets older than the retention window. Shaped after
 *       `notificationPrune`, which is the smallest correct prune in the repo.
 *
 * The daily rows are the raw material; `pageViewRollup` keeps the long-run
 * totals, so deleting the buckets loses granularity past the window and not the
 * history itself.
 *
 * EXPORTS: PAGE_VIEW_TTL_DAYS, runPageViewPrune
 *
 * @tag domain:analytics
 * @tag layer:job
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:pageViewPrune scheduled function
 * @tag sideEffects:deletes pageViews documents
 */

import { pageViewsRepository } from "../../../../features/analytics/repository/page-views.repository";
import type { JobContext } from "../runtime/types";
import { batchDelete } from "../handlers/_helpers";

/**
 * 90 days.
 *
 * Long enough for a quarter-over-quarter comparison in the admin report, which
 * is the longest range that screen offers, and short enough that the collection
 * reaches a steady state instead of growing forever.
 */
export const PAGE_VIEW_TTL_DAYS = 90;

export async function runPageViewPrune(ctx: JobContext): Promise<void> {
  ctx.logger.info(`Pruning page-view buckets older than ${PAGE_VIEW_TTL_DAYS} days`);
  const refs = await pageViewsRepository.getOlderThanRefs(PAGE_VIEW_TTL_DAYS);
  if (refs.length === 0) {
    ctx.logger.info("No stale page-view buckets found");
    return;
  }
  const deleted = await batchDelete(ctx, refs);
  ctx.logger.info("Page-view prune complete", { deleted });
}
