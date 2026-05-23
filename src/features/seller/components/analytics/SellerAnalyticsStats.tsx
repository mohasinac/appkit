"use client";
import React from "react";
import { TrendingUp, ShoppingBag, Package, CheckCircle } from "lucide-react";
import { Div } from "../../../../ui";
import { AdminStatCard } from "../../../admin/components/analytics/AdminStatCard";
import type { SellerAnalyticsSummary } from "../../types";

/**
 * W1-32 — SellerAnalyticsStats now composes AdminStatCard (the only live
 * stat-card primitive after W1-30) instead of redefining its own inline
 * StatCard. Same gradient presets, same visual identity.
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
    <Div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 ${className}`}>
      <AdminStatCard
        label={labels.totalRevenue ?? "Total Revenue"}
        value={formatRevenue(summary.totalRevenue)}
        gradient="green"
        icon={<TrendingUp className="w-5 h-5 text-white" />}
      />
      <AdminStatCard
        label={labels.totalOrders ?? "Total Orders"}
        value={String(summary.totalOrders)}
        gradient="brand"
        icon={<ShoppingBag className="w-5 h-5 text-white" />}
      />
      <AdminStatCard
        label={labels.totalProducts ?? "Total Products"}
        value={String(summary.totalProducts)}
        gradient="amber"
        icon={<Package className="w-5 h-5 text-white" />}
      />
      <AdminStatCard
        label={labels.publishedProducts ?? "Published"}
        value={String(summary.publishedProducts)}
        gradient="blue"
        icon={<CheckCircle className="w-5 h-5 text-white" />}
      />
    </Div>
  );
}
