"use client";

import React from "react";
import type { ElementType } from "react";
import { Text } from "./Typography";

export interface DashboardStatsCardProps {
  label: string;
  value: number | string;
  icon?: ElementType;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: number };
  variant?: "dark";
  href?: string;
  className?: string;
}

export function DashboardStatsCard({
  label,
  value,
  icon: Icon,
  iconBg = "bg-zinc-100 dark:bg-slate-800",
  iconColor = "text-zinc-600 dark:text-zinc-400",
  trend,
  variant,
  href,
  className = "",
}: DashboardStatsCardProps) {
  const isDark = variant === "dark";

  const card = (
    <div
      className={[
        "flex items-center gap-4 rounded-xl p-4",
        isDark
          ? "bg-zinc-900 text-white"
          : "border border-zinc-200 bg-white dark:border-slate-700 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      {Icon ? (
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <Text className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {label}
        </Text>
        <Text className="truncate text-xl font-semibold">{value}</Text>
        {trend ? (
          <Text
            className={`text-xs font-medium ${trend.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </Text>
        ) : null}
      </div>
    </div>
  );

  return href ? <a href={href}>{card}</a> : card;
}
