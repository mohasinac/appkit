"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Div, Heading } from "../../../../ui";
import type { AnalyticsMonthEntry } from "../../types";

const __P = {
  p4: "p-4",
  p6: "p-6",
} as const;

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

// Shared chart card wrapper
function ChartCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Div
      className={`relative rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden shadow-sm ${className}`}
    >
      {/* brand gradient top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background:
            "linear-gradient(to right, var(--appkit-color-primary-700,#1343de) 0%, var(--appkit-color-cobalt,#3570fc) 55%, var(--appkit-color-secondary-400,#84e122) 100%)",
        }}
        aria-hidden="true"
      />
      <Div className={`${__P.p4} sm:${__P.p6} pt-5 sm:pt-7`}>
        {title && (
          <Heading level={3} className="text-sm font-semibold text-[var(--appkit-color-text)] mb-4">
            {title}
          </Heading>
        )}
        {children}
      </Div>
    </Div>
  );
}

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
    <ChartCard title={labels.title} className={className}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#1343de" />
              <stop offset="55%"  stopColor="#3570fc" />
              <stop offset="100%" stopColor="#84e122" />
            </linearGradient>
            <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3570fc" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3570fc" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="var(--appkit-color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--appkit-color-text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--appkit-color-text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "var(--appkit-color-surface)",
              border: "1px solid var(--appkit-color-border)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            cursor={{ stroke: "var(--appkit-color-border)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="url(#revenueGrad)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#revenueAreaGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#3570fc" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
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
    <ChartCard title={labels.title} className={className}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={20}>
          <defs>
            <linearGradient id="ordersBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3570fc" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#84e122" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="var(--appkit-color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--appkit-color-text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--appkit-color-text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "var(--appkit-color-surface)",
              border: "1px solid var(--appkit-color-border)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            cursor={{ fill: "var(--appkit-color-border)", opacity: 0.3 }}
          />
          <Bar
            dataKey="orders"
            fill="url(#ordersBarGrad)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
