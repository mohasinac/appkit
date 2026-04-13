import React from "react";
"use client";

import { Divider } from "./Divider";
import { Span } from "./Typography";
import { classNames } from "../style.helper";

export interface SummaryLine {
  label: string;
  value: string;
  muted?: boolean;
}

export interface SummaryCardProps {
  lines: SummaryLine[];
  total: { label: string; value: string };
  action?: React.ReactNode;
  className?: string;
}

export function SummaryCard({
  lines,
  total,
  action,
  className,
}: SummaryCardProps) {
  return (
    <div
      className={classNames(
        "space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <Span className="text-zinc-500 dark:text-zinc-400">{line.label}</Span>
            <Span
              className={
                line.muted
                  ? "text-zinc-500 dark:text-zinc-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }
            >
              {line.value}
            </Span>
          </div>
        ))}
      </div>

      <Divider />

      <div className="flex items-center justify-between">
        <Span className="font-bold text-zinc-900 dark:text-zinc-100">
          {total.label}
        </Span>
        <Span className="text-lg font-bold text-primary">{total.value}</Span>
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}
