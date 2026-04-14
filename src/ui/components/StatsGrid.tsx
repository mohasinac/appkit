"use client";

import React from "react";

import { Div } from "./Div";
import { Text } from "./Typography";
import { classNames } from "../style.helper";

export interface StatItem {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  colorClass?: string;
}

export interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  /**
   * - `elevated` (default) — white card with border + shadow, for dashboards/homepages
   * - `flat` — no shadow, subtle border only, for dense admin tables
   */
  variant?: "elevated" | "flat";
  className?: string;
}

const columnsClass: Record<2 | 3 | 4, string> = {
  2: "appkit-stats-grid--2",
  3: "appkit-stats-grid--3",
  4: "appkit-stats-grid--4",
};

const variantClass = {
  elevated: "",
  flat: "appkit-stats-grid--flat",
} as const;

export function StatsGrid({
  stats,
  columns = 3,
  variant = "elevated",
  className,
}: StatsGridProps) {
  return (
    <Div
      className={classNames(
        "appkit-stats-grid",
        columnsClass[columns],
        variantClass[variant],
        className,
      )}
    >
      {stats.map((stat, i) => (
        <Div key={`${stat.label}-${i}`} className="appkit-stats-grid__item">
          <Div className="appkit-stats-grid__item-inner">
            <Div>
              <Text className="appkit-stats-grid__label">{stat.label}</Text>
              <Text className="appkit-stats-grid__value">{stat.value}</Text>
            </Div>
            {stat.icon && (
              <Div
                className={classNames(
                  "appkit-stats-grid__icon",
                  stat.colorClass ?? "text-zinc-400 dark:text-zinc-500",
                )}
              >
                {stat.icon}
              </Div>
            )}
          </Div>
        </Div>
      ))}
    </Div>
  );
}
