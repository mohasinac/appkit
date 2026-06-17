"use client";

import { TrendingUp, ShoppingBag, Users, Package, Clock, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardStats } from "../types";
import { Div, Grid, Row, Stack, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultCurrency } from "../../../core/baseline-resolver";

const __P = {
  p5: "p-5",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

// Brand gradient stop colors (mirrors SiteLogo wordmark gradient)
const BRAND_FROM = "var(--appkit-color-primary-700)";
const BRAND_MID  = "var(--appkit-color-cobalt)";
const BRAND_TO   = "var(--appkit-color-secondary-400)";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  gradient: string;       // CSS gradient string for the top strip + icon bg
  iconColor: string;      // icon fill color
}

function StatCard({ label, value, sub, icon: Icon, gradient, iconColor }: StatCardProps) {
  return (
    // audit-variant-ok: stat card — static shadow-sm + hover-shadow-md transition combo; Div.shadow accepts only one value
    <Div className={`relative border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] ${__O.hidden} hover:shadow-md transition-shadow`} rounded="xl" shadow="sm">
      {/* 3-px gradient top accent */}
      <Div
        className="absolute top-0 left-0 right-0 h-[3px]"
        // audit-inline-style-ok: runtime theme gradient
        style={{ background: gradient }}
        aria-hidden="true"
      />

      <Row paddingX="x-5" paddingY="b-md-lg" padding="t-lg" align="start" justify="between" gap="3">
        {/* Text block */}
        <Div className={`min-w-0 flex-1 ${__O.hidden}`}>
          <Text className="text-[11px] tracking-widest text-[var(--appkit-color-text-muted)] truncate" weight="semibold" transform="uppercase">
            {label}
          </Text>
          <Text className="mt-2 text-[var(--appkit-color-text)] tabular-nums leading-tight break-words" size="xl" weight="bold">
            {value}
          </Text>
          {sub && (
            <Text className="mt-1.5 text-[var(--appkit-color-text-muted)]" size="xs">{sub}</Text>
          )}
        </Div>

        {/* Icon pill */}
        <Row
          className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="lg"
          // audit-inline-style-ok: runtime theme gradient
          style={{ background: gradient, opacity: 0.92 }}
        >
          <Icon className="w-5 h-5 text-white drop-shadow-sm" />
        </Row>
      </Row>
    </Div>
  );
}

function SkeletonCard() {
  return (
    <Div className={`relative border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] ${__O.hidden} ${__P.p5} animate-pulse`} rounded="xl">
      <Div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--appkit-color-border)]" />
      <Row align="start" justify="between" gap="3" padding="t-2xs">
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

  // Brand gradient (left→right, matches logo wordmark)
  const brandGrad   = `linear-gradient(135deg, ${BRAND_FROM} 0%, ${BRAND_MID} 55%, ${BRAND_TO} 100%)`;
  const blueGrad    = `linear-gradient(135deg, ${BRAND_FROM} 0%, ${BRAND_MID} 100%)`;
  const greenGrad   = `linear-gradient(135deg, ${BRAND_MID} 0%, ${BRAND_TO} 100%)`;
  const amberGrad   = "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)";
  const roseGrad    = "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)";

  return (
    <Grid cols="statTiles">
      <StatCard
        label={labels.totalOrders ?? "Total Orders"}
        value={stats.totalOrders ?? 0}
        icon={ShoppingBag}
        gradient={brandGrad}
        iconColor="#fff"
      />
      <StatCard
        label={labels.totalRevenue ?? "Total Revenue"}
        value={formatCurrency(stats.totalRevenue ?? 0, currency)}
        icon={TrendingUp}
        gradient={greenGrad}
        iconColor="#fff"
      />
      <StatCard
        label={labels.totalUsers ?? "Total Users"}
        value={stats.totalUsers ?? 0}
        icon={Users}
        gradient={blueGrad}
        iconColor="#fff"
      />
      <StatCard
        label={labels.totalProducts ?? "Total Products"}
        value={stats.totalProducts ?? 0}
        icon={Package}
        gradient={brandGrad}
        iconColor="#fff"
      />
      {stats.pendingOrders !== undefined && (
        <StatCard
          label={labels.pendingOrders ?? "Pending Orders"}
          value={stats.pendingOrders}
          icon={Clock}
          gradient={amberGrad}
          iconColor="#fff"
        />
      )}
      {stats.pendingReviews !== undefined && (
        <StatCard
          label={labels.pendingReviews ?? "Pending Reviews"}
          value={stats.pendingReviews}
          icon={Star}
          gradient={roseGrad}
          iconColor="#fff"
        />
      )}
    </Grid>
  );
}
