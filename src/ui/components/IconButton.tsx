import React from "react";
import { twMerge } from "tailwind-merge";
import { ROUNDED_MAP, type RoundedKey } from "./surface-tokens";
import type { IconSizeKey } from "../icons/icon-registry";

const BASE = "appkit-icon-button";

const SIZES = {
  sm: "appkit-icon-button--sm",
  md: "appkit-icon-button--md",
  /** 44px — minimum comfortable tap target. See the CSS for when to use it. */
  touch: "appkit-icon-button--touch",
  lg: "appkit-icon-button--lg",
} as const;

/**
 * The glyph size each box wants. Callers should let the button decide rather
 * than passing a size to the icon by hand — a mismatched pair (a 14px glyph in
 * a 44px box) is the whole "the icon is very small" report.
 */
export const ICON_BUTTON_ICON_SIZE = {
  sm: "sm",
  md: "md",
  touch: "lg",
  lg: "lg",
} as const satisfies Record<keyof typeof SIZES, IconSizeKey>;

const VARIANTS = {
  ghost: "appkit-icon-button--ghost",
  outline: "appkit-icon-button--outline",
  primary: "appkit-icon-button--primary",
  danger: "appkit-icon-button--danger",
  /** Theme-independent white-on-translucent-black — for controls floating over a fixed-dark surface (lightbox, video player). */
  scrim: "appkit-icon-button--scrim",
} as const;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — text alternative for screen readers. Also shown as tooltip. */
  "aria-label": string;
  /** Icon element to display (usually a Lucide icon). Falls back to children. */
  icon?: React.ReactNode;
  size?: keyof typeof SIZES;
  variant?: keyof typeof VARIANTS;
  /** Border radius — replaces consumer `rounded-*` className. */
  rounded?: RoundedKey;
}

/**
 * Icon-only button. `aria-label` is required — will throw in development if omitted.
 *
 * @example
 * ```tsx
 * <Tooltip label="Add to wishlist">
 * <IconButton aria-label="Add to wishlist" icon={<HeartIcon />} onClick={handleWishlist} />
 * </Tooltip>
 * ```
 */
export function IconButton({
  size = "md",
  variant = "ghost",
  rounded,
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
      className={twMerge(BASE, SIZES[size], VARIANTS[variant], rounded ? ROUNDED_MAP[rounded] : "", className)}
      {...props}
    >
      {icon ?? children}
    </button>
  );
}
