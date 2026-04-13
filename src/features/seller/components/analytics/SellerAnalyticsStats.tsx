"use client";

import React from "react";
import { Div, Heading, Span, Text } from "../../../../ui";
import type { SellerAnalyticsSummary } from "../../types";

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

interface SellerAnalyticsStatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorClassName: string;
}

function SellerAnalyticsStatCard({
  label,
  value,
  icon,
  colorClassName,
}: SellerAnalyticsStatCardProps) {
  return (
    <Div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5">
      <Div className="flex items-start justify-between gap-3">
        <Div>
          <Text className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium uppercase tracking-wide">
            {label}
          </Text>
          <Heading level={3} className={`mt-1 text-2xl font-bold ${colorClassName}`}>
            {value}
          </Heading>
        </Div>
        <Span className="text-2xl sm:text-3xl" aria-hidden>
          {icon}
        </Span>
      </Div>
    </Div>
  );
}

export function SellerAnalyticsStats({
  summary,
  labels = {},
  formatRevenue = (amount) => String(amount),
  className = "",
}: SellerAnalyticsStatsProps) {
  return (
    <Div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4 ${className}`}>
      <SellerAnalyticsStatCard
        label={labels.totalRevenue ?? "Total Revenue"}
        value={formatRevenue(summary.totalRevenue)}
        icon="💰"
        colorClassName="text-emerald-600 dark:text-emerald-400"
      />
      <SellerAnalyticsStatCard
        label={labels.totalOrders ?? "Total Orders"}
        value={String(summary.totalOrders)}
        icon="📦"
        colorClassName="text-blue-600 dark:text-blue-400"
      />
      <SellerAnalyticsStatCard
        label={labels.totalProducts ?? "Total Products"}
        value={String(summary.totalProducts)}
        icon="🛍️"
        colorClassName="text-violet-600 dark:text-violet-400"
      />
      <SellerAnalyticsStatCard
        label={labels.publishedProducts ?? "Published Products"}
        value={String(summary.publishedProducts)}
        icon="✅"
        colorClassName="text-amber-600 dark:text-amber-400"
      />
    </Div>
  );
}
