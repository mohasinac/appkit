import React from "react";
import { twMerge } from "tailwind-merge";

const BASE = "appkit-icon-button";

const SIZES = {
  sm: "appkit-icon-button--sm",
  md: "appkit-icon-button--md",
  lg: "appkit-icon-button--lg",
} as const;

const VARIANTS = {
  ghost: "appkit-icon-button--ghost",
  outline: "appkit-icon-button--outline",
  primary: "appkit-icon-button--primary",
  danger: "appkit-icon-button--danger",
} as const;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
  if (process.env.NODE_ENV !== "production" && !props["aria-label"]) {
    throw new Error(
      '[IconButton] Missing required "aria-label" prop. ' +
        'Add aria-label="..." to the button or wrap with <Tooltip label="...">.',
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
