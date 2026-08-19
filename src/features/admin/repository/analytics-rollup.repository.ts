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

const ANALYTICS_COLLECTION = "analytics";
const DASHBOARD_ROLLUP_ID = "dashboardRollup";

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
