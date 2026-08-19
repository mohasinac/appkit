/**
 * Core: daily revenue rollup.
 *
 * `GET /api/admin/dashboard` used to sum `totalPrice` over the FULL
 * `delivered`-status orders list on every request (`orderRepository.findByStatus`
 * has no bound) — a real, growing Firestore-read cost and a 10s-timeout risk
 * on Vercel Hobby (CLAUDE.md Rule #6) as order volume increases. This job
 * pre-computes the same aggregate once a day and writes it to the
 * `analytics/dashboardRollup` singleton doc; the API route now reads that
 * single doc instead of scanning the collection.
 */

import { orderRepository } from "../../../../repositories";
import { analyticsRollupRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";

export async function runRevenueRollup(ctx: JobContext): Promise<void> {
  const deliveredOrders = await orderRepository.findByStatus("delivered").catch(() => []);
  const totalRevenue = deliveredOrders.reduce(
    (sum, order) => sum + (Number((order as { totalPrice?: number }).totalPrice ?? 0) || 0),
    0,
  );

  await analyticsRollupRepository.setDashboardRollup({
    totalRevenue,
    deliveredOrderCount: deliveredOrders.length,
  });

  ctx.logger.info("revenueRollup: complete", { totalRevenue, deliveredOrderCount: deliveredOrders.length });
}
