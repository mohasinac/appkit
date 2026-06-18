import React from "react";
import { Span } from "./Typography";

/**
 * Progress / IndeterminateProgress — deterministic and animated loading bars.
 *
 * Extracted from src/components/ui/Progress.tsx for @mohasinac/ui.
 * Theme values inlined; styled-jsx replaced with plain <style> element.
 */

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
    sm: "appkit-progress__track--sm",
    md: "appkit-progress__track--md",
    lg: "appkit-progress__track--lg",
  };

  const variantClasses: Record<
    NonNullable<ProgressProps["variant"]>,
    string
  > = {
    primary: "appkit-progress__bar--primary",
    success: "appkit-progress__bar--success",
    warning: "appkit-progress__bar--warning",
    error: "appkit-progress__bar--error",
  };

  return (
    <div className={`appkit-progress ${className}`} data-section="progress-div-569">
      {(label || showValue) && (
        <div className="appkit-progress__meta" data-section="progress-div-570">
          {label && <Span className="appkit-progress__label">{label}</Span>}
          {showValue && (
            <Span className="appkit-progress__value">
              {Math.round(percentage)}%
            </Span>
          )}
        </div>
      )}

      <div
        className={`appkit-progress__track ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
       data-section="progress-div-571">
        <div
          className={`appkit-progress__bar ${variantClasses[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// --- IndeterminateProgress -------------------------------------------------

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
    sm: "appkit-progress__track--sm",
    md: "appkit-progress__track--md",
    lg: "appkit-progress__track--lg",
  };

  const variantClasses: Record<
    NonNullable<IndeterminateProgressProps["variant"]>,
    string
  > = {
    primary: "appkit-progress__bar--primary",
    success: "appkit-progress__bar--success",
    warning: "appkit-progress__bar--warning",
    error: "appkit-progress__bar--error",
  };

  return (
    <div className={`appkit-progress ${className}`} data-section="progress-div-572">
      {label && (
        <Span className="appkit-progress__label appkit-progress__label--block">
          {label}
        </Span>
      )}

      <div
        className={`appkit-progress__track appkit-progress__track--indeterminate ${sizeClasses[size]}`}
        role="progressbar"
        aria-label={label || "Loading..."}
       data-section="progress-div-573">
        <div
          className={`appkit-progress__bar appkit-progress__bar--indeterminate ${variantClasses[variant]}`}
          style={{ width: "40%" }}
        />
      </div>
    </div>
  );
}
