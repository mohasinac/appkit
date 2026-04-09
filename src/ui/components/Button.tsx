import React from "react";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

/**
 * Button — versatile button with multiple variants, sizes, and loading state.
 *
 * Extracted from src/components/ui/Button.tsx for @mohasinac/ui.
 * Theme values inlined from THEME_CONSTANTS.button and THEME_CONSTANTS.colors.button.
 */

// Inlined from THEME_CONSTANTS
const UI_BUTTON = {
  base: "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  active: "active:scale-95",
  variants: {
    primary:
      "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm focus:ring-primary-500/30 dark:bg-secondary-500 dark:text-white dark:hover:bg-secondary-400 dark:active:bg-secondary-600 dark:focus:ring-secondary-400/30",
    secondary:
      "bg-primary-700 text-white hover:bg-primary-600 active:bg-primary-800 shadow-md focus:ring-primary-500 dark:bg-secondary-700 dark:text-white dark:hover:bg-secondary-600 dark:active:bg-secondary-800 dark:focus:ring-secondary-500",
    outline:
      "border border-zinc-200 dark:border-slate-700 bg-white dark:bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-slate-800 focus:ring-zinc-400",
    ghost:
      "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 focus:ring-zinc-400",
    danger:
      "bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-sm shadow-red-600/10 focus:ring-red-500",
    warning:
      "bg-amber-500 text-white hover:bg-amber-400 active:bg-amber-600 shadow-sm shadow-amber-500/10 focus:ring-amber-500",
  },
  sizes: {
    sm: "px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm gap-1.5 min-h-[36px]",
    md: "px-3 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base gap-2 min-h-[44px]",
    lg: "px-4 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg gap-2.5 min-h-[44px]",
  },
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof UI_BUTTON.variants;
  size?: keyof typeof UI_BUTTON.sizes;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        UI_BUTTON.base,
        UI_BUTTON.active,
        UI_BUTTON.variants[variant],
        UI_BUTTON.sizes[size],
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && (
        <Loader2
          className="w-4 h-4 animate-spin flex-shrink-0"
          aria-hidden="true"
        />
      )}
      {isLoading ? <span className="opacity-70">{children}</span> : children}
    </button>
  );
}
