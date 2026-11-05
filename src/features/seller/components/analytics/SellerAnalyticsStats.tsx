"use client";
import React from "react";
import { TrendingUp, ShoppingBag, Package, CheckCircle } from "lucide-react";
import { Div } from "../../../../ui/components/Div";
import { AdminStatCard } from "../../../admin/components/analytics/AdminStatCard";
import type { SellerAnalyticsSummary } from "../../types";

/**
 * W1-32 — SellerAnalyticsStats now composes AdminStatCard (the only live
 * stat-card primitive after W1-30) instead of redefining its own inline
 * StatCard.
 *
 * 🛑 No per-card `gradient` prop (removed 2026-11-05, owner's direct
 * correction) — 4 differently-colored cards in one row read as a rainbow
 * strip, not a dashboard. `AdminStatCard` now has one restrained,
 * theme-safe icon treatment for every card; icons here inherit it via
 * `currentColor` rather than hardcoding `text-white` for a gradient
 * background that no longer exists.
 */

export interface SellerAnalyticsStatsLabels {
  totalRevenue?: string;
  totalOrders?: string;
  totalProducts?: string;
  publishedProducts?: string;
}

export interface SellerAnalyticsStatsProps {
  summary: SellerAnalyticsSummary;
  labels?: SellerAnalyticsStatsLabels;
  formatRevenue?: (amount: number) => string;
  className?: string;
}

export function SellerAnalyticsStats({
  summary,
  labels = {},
  formatRevenue = (amount) => String(amount),
  className = "",
}: SellerAnalyticsStatsProps) {
  return (
    <Div layout="grid" gap="4" className={`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      <AdminStatCard
        label={labels.totalRevenue ?? "Total Revenue"}
        value={formatRevenue(summary.totalRevenue)}
        icon={<TrendingUp className="w-5 h-5" />}
      />
      <AdminStatCard
        label={labels.totalOrders ?? "Total Orders"}
        value={String(summary.totalOrders)}
        icon={<ShoppingBag className="w-5 h-5" />}
      />
      <AdminStatCard
        label={labels.totalProducts ?? "Total Products"}
        value={String(summary.totalProducts)}
        icon={<Package className="w-5 h-5" />}
      />
      <AdminStatCard
        label={labels.publishedProducts ?? "Published"}
        value={String(summary.publishedProducts)}
        icon={<CheckCircle className="w-5 h-5" />}
      />
    </Div>
  );
}
