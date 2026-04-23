import React from "react";
import type { ElementType } from "react";
import { Text } from "./Typography";

const UI_STATS_CARD = {
  base: "appkit-stats-card",
  dark: "appkit-stats-card--dark",
  iconWrap: "appkit-stats-card__icon-wrap",
  body: "appkit-stats-card__body",
  label: "appkit-stats-card__label",
  value: "appkit-stats-card__value",
  trend: "appkit-stats-card__trend",
  trendUp: "appkit-stats-card__trend--up",
  trendDown: "appkit-stats-card__trend--down",
} as const;

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
        UI_STATS_CARD.base,
        isDark ? UI_STATS_CARD.dark : "",
        className,
      ].join(" ")}
     data-section="dashboardstatscard-div-473">
      {Icon ? (
        <div className={[UI_STATS_CARD.iconWrap, iconBg].join(" ")} data-section="dashboardstatscard-div-474">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      ) : null}
      <div className={UI_STATS_CARD.body} data-section="dashboardstatscard-div-475">
        <Text className={UI_STATS_CARD.label}>{label}</Text>
        <Text className={UI_STATS_CARD.value}>{value}</Text>
        {trend ? (
          <Text
            className={[
              UI_STATS_CARD.trend,
              trend.value >= 0
                ? UI_STATS_CARD.trendUp
                : UI_STATS_CARD.trendDown,
            ].join(" ")}
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
