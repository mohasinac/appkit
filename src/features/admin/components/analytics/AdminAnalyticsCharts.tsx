"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Div, Heading } from "../../../../ui";
import type { AnalyticsMonthEntry } from "../../types";

// recharts exports generic components (<DataPointType>) that don't satisfy
// next/dynamic's ComponentType<P> constraint — cast each to ComponentType<any>.
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer as React.ComponentType<any>),
  { ssr: false },
);
const AreaChart = dynamic(
  () => import("recharts").then((m) => m.AreaChart as React.ComponentType<any>),
  { ssr: false },
);
const Area = dynamic(
  () => import("recharts").then((m) => m.Area as React.ComponentType<any>),
  { ssr: false },
);
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

export interface AdminRevenueChartProps {
  data: AnalyticsMonthEntry[];
  labels?: { title?: string };
  className?: string;
}

export function AdminRevenueChart({
  data,
  labels = {},
  className = "",
}: AdminRevenueChartProps) {
  return (
    <Div
      className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 ${className}`}
    >
      {labels.title && (
        <Heading level={3} className="text-base font-semibold mb-4">
          {labels.title}
        </Heading>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--appkit-color-primary)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--appkit-color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--appkit-color-primary)"
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Div>
  );
}

export interface AdminOrdersChartProps {
  data: AnalyticsMonthEntry[];
  labels?: { title?: string };
  className?: string;
}

export function AdminOrdersChart({
  data,
  labels = {},
  className = "",
}: AdminOrdersChartProps) {
  return (
    <Div
      className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 ${className}`}
    >
      {labels.title && (
        <Heading level={3} className="text-base font-semibold mb-4">
          {labels.title}
        </Heading>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="orders" fill="var(--appkit-color-secondary)" />
        </BarChart>
      </ResponsiveContainer>
    </Div>
  );
}
