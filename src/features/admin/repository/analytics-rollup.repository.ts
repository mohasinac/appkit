/**
 * Analytics Rollup Repository
 *
 * Singleton `analytics/dashboardRollup` doc — a pre-computed aggregate that
 * replaces an unbounded `orderRepository.findByStatus("delivered")` scan on
 * every admin dashboard page load. Written daily by the `revenueRollup`
 * scheduled Firebase Function (`appkit/src/_internal/server/jobs/core/revenueRollup.ts`),
 * read by `GET /api/admin/dashboard`.
 */

import { BaseRepository } from "../../../providers/db-firebase";

export interface AnalyticsRollupDocument {
  id: string;
  totalRevenue: number;
  deliveredOrderCount: number;
  computedAt: Date;
}

/**
 * Lifetime page-view totals, so `pageViewPrune` can delete day-buckets without
 * the long-run numbers going with them.
 *
 * `byEntityType` and not per-entity: a per-entity map would grow with the
 * catalogue and reintroduce, in one document, exactly the unbounded growth the
 * prune exists to stop — and a singleton has a 1 MiB ceiling it would eventually
 * hit with no warning.
 */
export interface PageViewRollupDocument {
  id: string;
  /** Every counted view since the rollup began. */
  totalViews: number;
  /** Totals per entity type — a closed union, so this map cannot grow. */
  byEntityType: Record<string, number>;
  /** The last day-bucket folded in, so a re-run cannot double-count. */
  throughDate: string;
  computedAt: Date;
}

const ANALYTICS_COLLECTION = "analytics";
const DASHBOARD_ROLLUP_ID = "dashboardRollup";
const PAGE_VIEW_ROLLUP_ID = "pageViewRollup";

export class AnalyticsRollupRepository extends BaseRepository<AnalyticsRollupDocument> {
  constructor() {
    super(ANALYTICS_COLLECTION);
  }

  async getDashboardRollup(): Promise<AnalyticsRollupDocument | null> {
    return this.findById(DASHBOARD_ROLLUP_ID);
  }

  async setDashboardRollup(data: { totalRevenue: number; deliveredOrderCount: number }): Promise<void> {
    const existing = await this.findById(DASHBOARD_ROLLUP_ID);
    const payload = { ...data, computedAt: new Date() };
    if (existing) {
      await this.update(DASHBOARD_ROLLUP_ID, payload);
    } else {
      await this.createWithId(DASHBOARD_ROLLUP_ID, payload);
    }
  }


}

export const analyticsRollupRepository = new AnalyticsRollupRepository();

/**
 * The page-view rollup — same `analytics` collection, different document shape,
 * so a different repository.
 *
 * 🛑 Deliberately NOT a second pair of methods on `AnalyticsRollupRepository`.
 * `BaseRepository<T>` types `findById` as returning `T`, so two shapes behind
 * one class means every read is either a lie or a cast — and `as unknown as X`
 * at a data boundary is the zero-runtime-effect silence Root Cause #70 records.
 * Two singletons with different fields are two types.
 */
export class PageViewRollupRepository extends BaseRepository<PageViewRollupDocument> {
  constructor() {
    super(ANALYTICS_COLLECTION);
  }

  async get(): Promise<PageViewRollupDocument | null> {
    return this.findById(PAGE_VIEW_ROLLUP_ID);
  }

  async set(
    data: Pick<PageViewRollupDocument, "totalViews" | "byEntityType" | "throughDate">,
  ): Promise<void> {
    const existing = await this.findById(PAGE_VIEW_ROLLUP_ID);
    const payload = { ...data, computedAt: new Date() };
    if (existing) {
      await this.update(PAGE_VIEW_ROLLUP_ID, payload);
    } else {
      await this.createWithId(PAGE_VIEW_ROLLUP_ID, payload);
    }
  }
}

export const pageViewRollupRepository = new PageViewRollupRepository();
