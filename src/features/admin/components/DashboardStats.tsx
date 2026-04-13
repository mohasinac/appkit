import type { DashboardStats } from "../types";
import { Div, Text, Grid } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "default" | "blue" | "green" | "amber" | "red";
}

function StatCard({ label, value, sub, color = "default" }: StatCardProps) {
  const colorClass = {
    default: "bg-white",
    blue: "bg-blue-50",
    green: "bg-green-50",
    amber: "bg-amber-50",
    red: "bg-red-50",
  }[color];
  return (
    <Div className={`rounded-xl border border-neutral-200 p-5 ${colorClass}`}>
      <Text className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </Text>
      <Text className="mt-2 text-2xl font-bold text-neutral-900">{value}</Text>
      {sub && <Text className="mt-1 text-xs text-neutral-500">{sub}</Text>}
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
        {Array.from({ length: 4 }).map((_, i) => (
          <Div
            key={i}
            className="animate-pulse rounded-xl border border-neutral-200 p-5"
          >
            <Div className="h-3 w-20 rounded bg-neutral-200" />
            <Div className="mt-2 h-8 w-24 rounded bg-neutral-200" />
          </Div>
        ))}
      </Grid>
    );
  }

  const currency = stats.currency ?? "INR";
  return (
    <Grid cols="statTiles">
      <StatCard
        label={labels.totalOrders ?? "Total Orders"}
        value={stats.totalOrders ?? 0}
      />
      <StatCard
        label={labels.totalRevenue ?? "Total Revenue"}
        value={formatCurrency(stats.totalRevenue ?? 0, currency)}
        color="green"
      />
      <StatCard
        label={labels.totalUsers ?? "Total Users"}
        value={stats.totalUsers ?? 0}
        color="blue"
      />
      <StatCard
        label={labels.totalProducts ?? "Total Products"}
        value={stats.totalProducts ?? 0}
      />
      {stats.pendingOrders !== undefined && (
        <StatCard
          label={labels.pendingOrders ?? "Pending Orders"}
          value={stats.pendingOrders}
          color="amber"
        />
      )}
      {stats.pendingReviews !== undefined && (
        <StatCard
          label={labels.pendingReviews ?? "Pending Reviews"}
          value={stats.pendingReviews}
          color="amber"
        />
      )}
    </Grid>
  );
}
