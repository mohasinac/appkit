import React from "react";

/**
 * Spinner — generic loading indicator.
 *
 * Extracted from src/components/ui/Spinner.tsx for @mohasinac/ui.
 * No app-specific imports; pure Tailwind CSS.
 */

export interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "white" | "current";
  className?: string;
  label?: string;
}

export function Spinner({
  size = "md",
  variant = "primary",
  className = "",
  label = "Loading...",
}: SpinnerProps) {
  const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-[3px]",
    xl: "w-16 h-16 border-4",
  };

  const variantClasses: Record<NonNullable<SpinnerProps["variant"]>, string> = {
    primary:
      "border-primary-600 border-t-transparent dark:border-secondary-500 dark:border-t-transparent",
    white: "border-white border-t-transparent",
    current: "border-current border-t-transparent",
  };

  return (
    <div
      className={`inline-flex items-center gap-3 ${className}`}
      role="status"
      aria-label={label}
    >
      <div
        className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full animate-spin force-spin`}
      />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
