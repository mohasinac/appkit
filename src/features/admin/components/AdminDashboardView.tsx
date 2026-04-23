"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { Alert } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { DashboardStats } from "../types";
import { DashboardStatsGrid } from "./DashboardStats";

interface AdminDashboardApiResponse {
  users?: {
    total?: number;
    newThisMonth?: number;
  };
  products?: {
    total?: number;
  };
  orders?: {
    total?: number;
  };
}

export interface AdminDashboardViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  endpoint?: string;
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
  endpoint = ADMIN_ENDPOINTS.DASHBOARD,
  stats = {},
  isLoading = false,
  renderStats,
  renderQuickActions,
  renderRecentActivity,
  renderAlerts,
  renderCharts,
  ...rest
}: AdminDashboardViewProps) {
  const shouldFetch = Object.keys(stats).length === 0;
  const query = useQuery<AdminDashboardApiResponse>({
    queryKey: ["admin-dashboard", endpoint],
    queryFn: () => apiClient.get<AdminDashboardApiResponse>(endpoint),
    enabled: shouldFetch,
    staleTime: 60_000,
  });

  const resolvedStats: DashboardStats = shouldFetch
    ? {
      totalOrders: query.data?.orders?.total ?? 0,
      totalUsers: query.data?.users?.total ?? 0,
      totalProducts: query.data?.products?.total ?? 0,
      newUsersToday: query.data?.users?.newThisMonth ?? 0,
    }
    : stats;
  const busy = isLoading || query.isLoading;

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? "Dashboard"}
      sections={[
        query.error ? (
          <Alert variant="error" title="Could not load dashboard">
            {query.error instanceof Error ? query.error.message : "Unknown error"}
          </Alert>
        ) : null,
        renderAlerts?.(),
        renderStats
          ? renderStats(resolvedStats, busy)
          : <DashboardStatsGrid stats={resolvedStats} isLoading={busy} />,
        renderQuickActions?.(),
        renderCharts?.(),
        renderRecentActivity?.(),
      ]}
    />
  );
}
