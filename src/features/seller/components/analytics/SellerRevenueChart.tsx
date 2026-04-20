"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Div, Heading, Text } from "../../../../ui";
import type { SellerAnalyticsMonthEntry } from "../../types";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
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
      className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 ${className}`}
    >
      {labels.title && (
        <Heading level={3} className="text-base font-semibold mb-4">
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
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
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
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Div>
      ) : (
        <Text className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-8">
          {labels.noData ?? "No data available"}
        </Text>
      )}
    </Div>
  );
}
