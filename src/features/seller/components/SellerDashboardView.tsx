import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerDashboardViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  renderStats?: (isLoading: boolean) => React.ReactNode;
  renderQuickActions?: () => React.ReactNode;
  renderRecentListings?: () => React.ReactNode;
  renderRevenueChart?: () => React.ReactNode;
  renderTopProducts?: () => React.ReactNode;
  isLoading?: boolean;
}

export function SellerDashboardView({
  labels = {},
  renderStats,
  renderQuickActions,
  renderRecentListings,
  renderRevenueChart,
  renderTopProducts,
  isLoading = false,
  ...rest
}: SellerDashboardViewProps) {
  return (
    <StackedViewShell
      portal="seller"
      {...rest}
      title={labels.title}
      sections={[
        renderStats?.(isLoading),
        renderQuickActions?.(),
        renderRevenueChart?.(),
        renderTopProducts?.(),
        renderRecentListings?.(),
      ]}
    />
  );
}
