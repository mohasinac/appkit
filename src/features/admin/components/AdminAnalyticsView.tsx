import React from "react";
import { Div, Heading } from "../../../ui";
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
  isLoading = false,
  className = "",
}: AdminAnalyticsViewProps) {
  const summary = data?.summary;
  const ordersByMonth = data?.ordersByMonth ?? [];
  const topProducts = data?.topProducts ?? [];

  return (
    <Div className={className}>
      {renderHeader ? (
        renderHeader()
      ) : labels.title ? (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      ) : null}

      {renderDateRange?.()}

      {renderSummaryCards ? (
        renderSummaryCards()
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
