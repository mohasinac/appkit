"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";
import type { DashboardStats } from "../types";

export interface AdminDashboardViewProps {
  labels?: {
    title?: string;
  };
  stats?: DashboardStats;
  isLoading?: boolean;
  renderStats?: (stats: DashboardStats, isLoading: boolean) => React.ReactNode;
  renderQuickActions?: () => React.ReactNode;
  renderRecentActivity?: () => React.ReactNode;
  renderAlerts?: () => React.ReactNode;
  renderCharts?: () => React.ReactNode;
  className?: string;
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
  className = "",
}: AdminDashboardViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {renderAlerts?.()}
      {renderStats?.(stats, isLoading)}
      {renderQuickActions?.()}
      {renderCharts?.()}
      {renderRecentActivity?.()}
    </Div>
  );
}
