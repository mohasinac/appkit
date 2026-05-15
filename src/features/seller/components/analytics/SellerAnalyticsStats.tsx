"use client";
import React from "react";
import { TrendingUp, ShoppingBag, Package, CheckCircle } from "lucide-react";
import { Div } from "../../../../ui";
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

const GREEN_GRAD  = "linear-gradient(135deg,var(--appkit-color-cobalt,#3570fc) 0%,var(--appkit-color-secondary-400,#84e122) 100%)";
const BRAND_GRAD  = "linear-gradient(135deg,var(--appkit-color-primary-700,#1343de) 0%,var(--appkit-color-cobalt,#3570fc) 55%,var(--appkit-color-secondary-400,#84e122) 100%)";
const AMBER_GRAD  = "linear-gradient(135deg,var(--appkit-color-amber-500,#f59e0b) 0%,var(--appkit-color-amber-600,#d97706) 100%)";
const BLUE_GRAD   = "linear-gradient(135deg,var(--appkit-color-primary-700,#1343de) 0%,var(--appkit-color-cobalt,#3570fc) 100%)";

interface StatCardProps {
  label: string;
  value: string;
  gradient: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ label, value, gradient, Icon }: StatCardProps) {
  return (
    <Div className="relative rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: gradient }} aria-hidden="true" />
      <Div className="px-5 pb-5 pt-6 flex items-start justify-between gap-3">
        <Div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--appkit-color-text-muted)]">
            {label}
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--appkit-color-text)] tabular-nums leading-none">
            {value}
          </div>
        </Div>
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
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
    <Div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 ${className}`}>
      <StatCard
        label={labels.totalRevenue ?? "Total Revenue"}
        value={formatRevenue(summary.totalRevenue)}
        gradient={GREEN_GRAD}
        Icon={TrendingUp}
      />
      <StatCard
        label={labels.totalOrders ?? "Total Orders"}
        value={String(summary.totalOrders)}
        gradient={BRAND_GRAD}
        Icon={ShoppingBag}
      />
      <StatCard
        label={labels.totalProducts ?? "Total Products"}
        value={String(summary.totalProducts)}
        gradient={AMBER_GRAD}
        Icon={Package}
      />
      <StatCard
        label={labels.publishedProducts ?? "Published"}
        value={String(summary.publishedProducts)}
        gradient={BLUE_GRAD}
        Icon={CheckCircle}
      />
    </Div>
  );
}
