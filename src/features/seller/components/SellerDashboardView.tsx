"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface SellerDashboardViewProps {
  labels?: { title?: string };
  renderStats?: (isLoading: boolean) => React.ReactNode;
  renderQuickActions?: () => React.ReactNode;
  renderRecentListings?: () => React.ReactNode;
  renderRevenueChart?: () => React.ReactNode;
  renderTopProducts?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SellerDashboardView({
  labels = {},
  renderStats,
  renderQuickActions,
  renderRecentListings,
  renderRevenueChart,
  renderTopProducts,
  isLoading = false,
  className = "",
}: SellerDashboardViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {renderStats?.(isLoading)}
      {renderQuickActions?.()}
      {renderRevenueChart?.()}
      {renderTopProducts?.()}
      {renderRecentListings?.()}
    </Div>
  );
}
