"use client";

import { TrendingUp, ShoppingBag, Users, Package, Clock, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardStats } from "../types";
import { Div, Grid, Row, Stack, Text } from "../../../ui";
import { DynamicBgDiv } from "../../../ui/components/DynamicBgDiv";
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
}

function StatCard({ label, value, sub, icon: Icon, gradient }: StatCardProps) {
  return (
    <Div className={`relative border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] ${__O.hidden}`} rounded="xl" shadow="sm-hover-md">
      {/* 3-px gradient top accent */}
      <DynamicBgDiv
        background={gradient}
        className="absolute top-0 left-0 right-0 h-[3px]"
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
        <DynamicBgDiv
          background={gradient}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg opacity-[0.92]"
        >
          <Icon className="w-5 h-5 text-white drop-shadow-sm" />
        </DynamicBgDiv>
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
  const amberGrad   = "var(--appkit-gradient-warning-stat)";
  const roseGrad    = "var(--appkit-gradient-danger-stat)";

  return (
    <Grid cols="statTiles">
      <StatCard
        label={labels.totalOrders ?? "Total Orders"}
        value={stats.totalOrders ?? 0}
        icon={ShoppingBag}
        gradient={brandGrad}
      />
      <StatCard
        label={labels.totalRevenue ?? "Total Revenue"}
        value={formatCurrency(stats.totalRevenue ?? 0, currency)}
        icon={TrendingUp}
        gradient={greenGrad}
      />
      <StatCard
        label={labels.totalUsers ?? "Total Users"}
        value={stats.totalUsers ?? 0}
        icon={Users}
        gradient={blueGrad}
      />
      <StatCard
        label={labels.totalProducts ?? "Total Products"}
        value={stats.totalProducts ?? 0}
        icon={Package}
        gradient={brandGrad}
      />
      {stats.pendingOrders !== undefined && (
        <StatCard
          label={labels.pendingOrders ?? "Pending Orders"}
          value={stats.pendingOrders}
          icon={Clock}
          gradient={amberGrad}
          />
      )}
      {stats.pendingReviews !== undefined && (
        <StatCard
          label={labels.pendingReviews ?? "Pending Reviews"}
          value={stats.pendingReviews}
          icon={Star}
          gradient={roseGrad}
          />
      )}
    </Grid>
  );
}
