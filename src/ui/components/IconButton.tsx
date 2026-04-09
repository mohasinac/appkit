import React from "react";
import { twMerge } from "tailwind-merge";

const BASE =
  "inline-flex items-center justify-center flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const SIZES = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
} as const;

const VARIANTS = {
  ghost:
    "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 focus:ring-zinc-400",
  outline:
    "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:ring-zinc-400",
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 dark:bg-secondary-500 dark:hover:bg-secondary-400",
  danger:
    "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-500",
} as const;

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — text alternative for screen readers. Also shown as tooltip. */
  "aria-label": string;
  /** Icon element to display (usually a Lucide icon). Falls back to children. */
  icon?: React.ReactNode;
  size?: keyof typeof SIZES;
  variant?: keyof typeof VARIANTS;
}

/**
 * Icon-only button. `aria-label` is required — will throw in development if omitted.
 *
 * @example
 * ```tsx
 * <Tooltip label="Add to wishlist">
 *   <IconButton aria-label="Add to wishlist" icon={<HeartIcon />} onClick={handleWishlist} />
 * </Tooltip>
 * ```
 */
export function IconButton({
  size = "md",
  variant = "ghost",
  className = "",
  icon,
  children,
  ...props
}: IconButtonProps) {
  if (
    process.env.NODE_ENV !== "production" &&
    !props["aria-label"]
  ) {
    throw new Error(
      '[IconButton] Missing required "aria-label" prop. ' +
        "Add aria-label=\"...\" to the button or wrap with <Tooltip label=\"...\">.",
    );
  }

  return (
    <button
      type="button"
      className={twMerge(BASE, SIZES[size], VARIANTS[variant], className)}
      {...props}
    >
      {icon ?? children}
    </button>
  );
}
