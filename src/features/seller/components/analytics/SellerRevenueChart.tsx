"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Div, Heading, Text } from "../../../../ui";
import type { SellerAnalyticsMonthEntry } from "../../types";

// recharts exports generic components (<DataPointType>) that don't satisfy
// next/dynamic's ComponentType<P> constraint — cast each to ComponentType<any>.
const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart as React.ComponentType<any>),
  { ssr: false },
);
const Bar = dynamic(
  () => import("recharts").then((m) => m.Bar as React.ComponentType<any>),
  { ssr: false },
);
const XAxis = dynamic(
  () => import("recharts").then((m) => m.XAxis as React.ComponentType<any>),
  { ssr: false },
);
const YAxis = dynamic(
  () => import("recharts").then((m) => m.YAxis as React.ComponentType<any>),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid as React.ComponentType<any>),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("recharts").then((m) => m.Tooltip as React.ComponentType<any>),
  { ssr: false },
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer as React.ComponentType<any>),
  { ssr: false },
);

export interface SellerRevenueChartLabels {
  title?: string;
  noData?: string;
  revenueLabel?: string;
}

export interface SellerRevenueChartProps {
  data: SellerAnalyticsMonthEntry[];
  labels?: SellerRevenueChartLabels;
  formatRevenue?: (amount: number) => string;
  className?: string;
}

export function SellerRevenueChart({
  data,
  labels = {},
  formatRevenue = (amount) => String(amount),
  className = "",
}: SellerRevenueChartProps) {
  const hasRevenue = data.some((item) => item.revenue > 0);

  return (
    <Div
      className={`border border-neutral-200 dark:border-neutral-800 sm:p-6 ${className}`} rounded="xl" padding="md" surface="default"
    >
      {labels.title && (
        <Heading level={3} className="mb-4" size="base" weight="semibold">
          {labels.title}
        </Heading>
      )}

      {hasRevenue ? (
        <Div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number | string) =>
                  formatRevenue(Number(value))
                }
              />
              <Tooltip
                formatter={(value: any) => [
                  formatRevenue(Number(value)),
                  labels.revenueLabel ?? "Revenue",
                ]}
              />
              <Bar dataKey="revenue" fill="var(--appkit-color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Div>
      ) : (
        <Text className="py-8" color="muted" size="sm" align="center">
          {labels.noData ?? "No data available"}
        </Text>
      )}
    </Div>
  );
}
