import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import type { DashboardStats } from "../types";

export interface AdminDashboardViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  stats?: DashboardStats;
  isLoading?: boolean;
  renderStats?: (stats: DashboardStats, isLoading: boolean) => React.ReactNode;
  renderQuickActions?: () => React.ReactNode;
  renderRecentActivity?: () => React.ReactNode;
  renderAlerts?: () => React.ReactNode;
  renderCharts?: () => React.ReactNode;
}

export function AdminDashboardView({
  labels = {},
  stats = {},
  isLoading = false,
  renderStats,
  renderQuickActions,
  renderRecentActivity,
  renderAlerts,
  renderCharts,
  ...rest
}: AdminDashboardViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[
        renderAlerts?.(),
        renderStats ? renderStats(stats as DashboardStats, isLoading) : null,
        renderQuickActions?.(),
        renderCharts?.(),
        renderRecentActivity?.(),
      ]}
    />
  );
}
