"use client";

import React from "react";
import { Span } from "./Typography";

/**
 * Progress / IndeterminateProgress — deterministic and animated loading bars.
 *
 * Extracted from src/components/ui/Progress.tsx for @mohasinac/ui.
 * Theme values inlined; styled-jsx replaced with plain <style> element.
 */

// Inlined from THEME_CONSTANTS
const TEXT_PRIMARY = "text-zinc-900 dark:text-zinc-50";
const TEXT_SECONDARY = "text-zinc-500 dark:text-zinc-400";
const BG_SECONDARY = "bg-zinc-50 dark:bg-slate-900";
const FLEX_BETWEEN = "flex items-center justify-between";
const INDETERMINATE_CSS = `
@keyframes lir-progress-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.lir-progress-indeterminate {
  animation: lir-progress-indeterminate 1.5s ease-in-out infinite;
}
`;

export interface ProgressProps {
  value: number;
  max?: number;
  variant?: "primary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  variant = "primary",
  size = "md",
  label,
  showValue = false,
  className = "",
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses: Record<NonNullable<ProgressProps["size"]>, string> = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const variantClasses: Record<
    NonNullable<ProgressProps["variant"]>,
    string
  > = {
    primary: "bg-primary",
    success: "bg-green-600 dark:bg-green-500",
    warning: "bg-yellow-600 dark:bg-yellow-500",
    error: "bg-red-600 dark:bg-red-500",
  };

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className={`${FLEX_BETWEEN} mb-2`}>
          {label && (
            <Span className={`text-sm font-medium ${TEXT_PRIMARY}`}>
              {label}
            </Span>
          )}
          {showValue && (
            <Span className={`text-sm font-medium ${TEXT_SECONDARY}`}>
              {Math.round(percentage)}%
            </Span>
          )}
        </div>
      )}

      <div
        className={`w-full ${sizeClasses[size]} rounded-full overflow-hidden ${BG_SECONDARY}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        <div
          className={`h-full ${variantClasses[variant]} transition-all duration-300 ease-in-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ─── IndeterminateProgress ─────────────────────────────────────────────────

export interface IndeterminateProgressProps {
  variant?: "primary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function IndeterminateProgress({
  variant = "primary",
  size = "md",
  label,
  className = "",
}: IndeterminateProgressProps) {
  const sizeClasses: Record<
    NonNullable<IndeterminateProgressProps["size"]>,
    string
  > = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const variantClasses: Record<
    NonNullable<IndeterminateProgressProps["variant"]>,
    string
  > = {
    primary: "bg-primary",
    success: "bg-green-600 dark:bg-green-500",
    warning: "bg-yellow-600 dark:bg-yellow-500",
    error: "bg-red-600 dark:bg-red-500",
  };

  return (
    <div className={className}>
      <style dangerouslySetInnerHTML={{ __html: INDETERMINATE_CSS }} />
      {label && (
        <Span className={`block text-sm font-medium mb-2 ${TEXT_PRIMARY}`}>
          {label}
        </Span>
      )}

      <div
        className={`w-full ${sizeClasses[size]} rounded-full overflow-hidden ${BG_SECONDARY} relative`}
        role="progressbar"
        aria-label={label || "Loading..."}
      >
        <div
          className={`absolute inset-0 ${variantClasses[variant]} lir-progress-indeterminate rounded-full`}
          style={{ width: "40%" }}
        />
      </div>
    </div>
  );
}
