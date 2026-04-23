"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Div, Heading } from "../../../ui";
import { Alert } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { AdminAnalyticsData, AnalyticsTopProduct } from "../types";
import { AdminStatCard } from "./analytics/AdminStatCard";
import {
  AdminRevenueChart,
  AdminOrdersChart,
} from "./analytics/AdminAnalyticsCharts";
import { AdminTopProductsTable } from "./analytics/AdminTopProductsTable";

export interface AdminAnalyticsViewLabels {
  title?: string;
  subtitle?: string;
  totalRevenue?: string;
  totalOrders?: string;
  revenueThisMonth?: string;
  ordersThisMonth?: string;
  revenueByMonth?: string;
  ordersByMonth?: string;
  topProducts?: string;
  orders?: string;
  view?: string;
}

export interface AdminAnalyticsViewProps {
  data?: AdminAnalyticsData;
  labels?: AdminAnalyticsViewLabels;
  formatRevenue?: (amount: number) => string;
  renderProductLink?: (product: AnalyticsTopProduct) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderDateRange?: () => React.ReactNode;
  renderSummaryCards?: () => React.ReactNode;
  renderCharts?: () => React.ReactNode;
  renderTable?: () => React.ReactNode;
  endpoint?: string;
  isLoading?: boolean;
  className?: string;
}

export function AdminAnalyticsView({
  data,
  labels = {},
  formatRevenue = (n) => String(n),
  renderProductLink,
  renderHeader,
  renderDateRange,
  renderSummaryCards,
  renderCharts,
  renderTable,
  endpoint = ADMIN_ENDPOINTS.ANALYTICS,
  isLoading = false,
  className = "",
}: AdminAnalyticsViewProps) {
  const shouldFetch = !data;
  const query = useQuery<AdminAnalyticsData>({
    queryKey: ["admin-analytics", endpoint],
    queryFn: () => apiClient.get<AdminAnalyticsData>(endpoint),
    enabled: shouldFetch,
    staleTime: 60_000,
  });

  const resolvedData = data ?? query.data;
  const busy = isLoading || query.isLoading;
  const summary = resolvedData?.summary;
  const ordersByMonth = resolvedData?.ordersByMonth ?? [];
  const topProducts = resolvedData?.topProducts ?? [];

  return (
    <Div className={className}>
      {renderHeader ? (
        renderHeader()
      ) : labels.title ? (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      ) : null}

      {query.error ? (
        <Alert variant="error" title="Could not load analytics">
          {query.error instanceof Error ? query.error.message : "Unknown error"}
        </Alert>
      ) : null}

      {renderDateRange?.()}

      {renderSummaryCards ? (
        renderSummaryCards()
      ) : busy ? (
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Div
              key={index}
              className="h-28 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 animate-pulse"
            />
          ))}
        </Div>
      ) : summary ? (
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            label={labels.totalRevenue ?? "Total Revenue"}
            value={formatRevenue(summary.totalRevenue)}
          />
          <AdminStatCard
            label={labels.totalOrders ?? "Total Orders"}
            value={String(summary.totalOrders)}
          />
          <AdminStatCard
            label={labels.revenueThisMonth ?? "Revenue This Month"}
            value={formatRevenue(summary.revenueThisMonth)}
          />
          <AdminStatCard
            label={labels.ordersThisMonth ?? "Orders This Month"}
            value={String(summary.newOrdersThisMonth)}
          />
        </Div>
      ) : null}

      {renderCharts ? (
        renderCharts()
      ) : ordersByMonth.length > 0 ? (
        <Div className="space-y-6">
          <AdminRevenueChart
            data={ordersByMonth}
            labels={{ title: labels.revenueByMonth }}
          />
          <AdminOrdersChart
            data={ordersByMonth}
            labels={{ title: labels.ordersByMonth }}
          />
        </Div>
      ) : null}

      {renderTable ? (
        renderTable()
      ) : topProducts.length > 0 ? (
        <AdminTopProductsTable
          products={topProducts}
          labels={{
            title: labels.topProducts,
            orders: labels.orders,
            view: labels.view,
          }}
          formatRevenue={formatRevenue}
          renderProductLink={renderProductLink}
        />
      ) : null}
    </Div>
  );
}
