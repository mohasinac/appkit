import React from "react";
"use client";

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
  className?: string;
}

const columnsClass: Record<2 | 3 | 4, string> = {
  2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3",
  4: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
};

export function StatsGrid({ stats, columns = 3, className }: StatsGridProps) {
  return (
    <div className={classNames(columnsClass[columns], className)}>
      {stats.map((stat, i) => (
        <div
          key={`${stat.label}-${i}`}
          className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </Text>
              <Text className="mt-1 text-3xl font-bold">{stat.value}</Text>
            </div>
            {stat.icon && (
              <div
                className={classNames(
                  stat.colorClass ?? "text-zinc-400 dark:text-zinc-500",
                )}
              >
                {stat.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
