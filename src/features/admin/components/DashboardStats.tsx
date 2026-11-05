"use client";

import { TrendingUp, ShoppingBag, Users, Package, Clock, Star } from "lucide-react";
import type { DashboardStats } from "../types";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { AdminStatCard } from "./analytics/AdminStatCard";

/**
 * `DashboardStatsGrid` — `AdminDashboardView`'s internal default for
 * `renderStats` (used only when a caller omits the render prop; the one
 * real caller, `/admin`'s `AdminDashboardPageClient`, always overrides it
 * with `renderStats={() => null}` — the dashboard root's stats were
 * suppressed as part of this session's decluttering). Kept correct rather
 * than deleted, since a future caller that forgets to pass `renderStats`
 * would hit this path.
 *
 * 🛑 Previously defined its OWN local `StatCard` — a near-duplicate of
 * `AdminStatCard` with the same per-tile `gradient` rainbow treatment
 * `AdminStatCard` itself just had removed (owner's direct correction,
 * 2026-11-05: differently-colored stat tiles in one row read as a rainbow
 * strip, not a dashboard). Composes the real `AdminStatCard` now instead,
 * matching the W1-32 consolidation `SellerAnalyticsStats` already did —
 * one stat-card implementation, not two drifting copies.
 */

function SkeletonCard() {
  return (
    <Div className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] animate-pulse" padding="xl" rounded="xl">
      <Row align="start" justify="between" gap="3">
        <Stack className="flex-1" gap="sm">
          <Div className="h-2.5 w-20 bg-[var(--appkit-color-border)]" rounded="default" />
          <Div className="h-7 w-24 bg-[var(--appkit-color-border)]" rounded="default" />
        </Stack>
        <Div className="w-10 h-10 bg-[var(--appkit-color-border)]" rounded="lg" />
      </Row>
    </Div>
  );
}

interface DashboardStatsGridProps {
  stats: DashboardStats;
  isLoading?: boolean;
  labels?: Partial<Record<keyof DashboardStats | string, string>>;
}

export function DashboardStatsGrid({
  stats,
  isLoading,
  labels = {},
}: DashboardStatsGridProps) {
  if (isLoading) {
    return (
      <Grid cols="statTiles">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </Grid>
    );
  }

  const currency = stats.currency ?? getDefaultCurrency();

  return (
    <Grid cols="statTiles">
      <AdminStatCard
        label={labels.totalOrders ?? "Total Orders"}
        value={String(stats.totalOrders ?? 0)}
        icon={<ShoppingBag className="w-5 h-5" />}
      />
      <AdminStatCard
        label={labels.totalRevenue ?? "Total Revenue"}
        value={formatCurrency(stats.totalRevenue ?? 0, currency)}
        icon={<TrendingUp className="w-5 h-5" />}
      />
      <AdminStatCard
        label={labels.totalUsers ?? "Total Users"}
        value={String(stats.totalUsers ?? 0)}
        icon={<Users className="w-5 h-5" />}
      />
      <AdminStatCard
        label={labels.totalProducts ?? "Total Products"}
        value={String(stats.totalProducts ?? 0)}
        icon={<Package className="w-5 h-5" />}
      />
      {stats.pendingOrders !== undefined && (
        <AdminStatCard
          label={labels.pendingOrders ?? "Pending Orders"}
          value={String(stats.pendingOrders)}
          icon={<Clock className="w-5 h-5" />}
        />
      )}
      {stats.pendingReviews !== undefined && (
        <AdminStatCard
          label={labels.pendingReviews ?? "Pending Reviews"}
          value={String(stats.pendingReviews)}
          icon={<Star className="w-5 h-5" />}
        />
      )}
    </Grid>
  );
}
