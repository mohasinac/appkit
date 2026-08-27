"use client";

import type { MouseEvent } from "react";
import { IconButton, Icon } from "../../../ui";
import { ICON_BUTTON_ICON_SIZE } from "../../../ui/components/IconButton";

/** The heart renders a <button>, so handlers get the real element type. */
type HeartMouseEvent = MouseEvent<HTMLButtonElement>;

/**
 * Where the heart sits, which decides its box — never passed as a raw size.
 *
 * - `card`   — the only affordance in its corner of a product card. 44px, the
 *              minimum comfortable tap target.
 * - `inline` — sits in a row beside a title or price. 40px.
 * - `detail` — a product detail page's standalone control. 48px.
 */
const PLACEMENT_SIZE = {
  inline: "md",
  card: "touch",
  detail: "lg",
} as const;

export type WishlistHeartPlacement = keyof typeof PLACEMENT_SIZE;

export interface WishlistHeartButtonProps {
  inWishlist: boolean;
  isLoading?: boolean;
  onToggle: (e: HeartMouseEvent) => void | Promise<void>;
  addLabel: string;
  removeLabel: string;
  /** See PLACEMENT_SIZE. */
  size?: WishlistHeartPlacement;
  /**
   * `overlay` floats above product imagery and needs its own backdrop;
   * `plain` sits on an ordinary surface.
   */
  variant?: "overlay" | "plain";
  className?: string;
}

/**
 * The ONE wishlist heart.
 *
 * WHY: there were seven render sites using THREE different glyph technologies —
 * an inline `<svg>` (product grid card), lucide `<Heart>` at two different sizes
 * (auction card list vs grid), and the text characters `♥`/`♡` (product list
 * row, both pre-order card layouts, and baked into the detail page's label
 * strings). Text glyphs cannot be sized by `w-*`/`h-*` at all and fall back to a
 * platform font, which is literally the "the wishlist icon is very small"
 * report. The auction card's lucide heart was 14px inside a `md` Button whose
 * min-height is ~44px, so the largest tap target carried the smallest glyph.
 *
 * Built on `IconButton`, not `Button`: `.appkit-button--sm` sets
 * `min-height: 36px` and, under `important: true`, beats a caller's `h-8`, so
 * the product card's heart rendered as a 32x36 ellipse under `rounded-full`.
 * `IconButton` boxes are true squares.
 *
 * 🛑 It owns NO auth modal. `useAuthGate` is the single gate (Rule #7) and the
 * caller wraps `onToggle` in `requireAuth`. The predecessor this replaces kept
 * its own `LoginRequiredModal` and would have raced the gate's.
 */
export function WishlistHeartButton({
  inWishlist,
  isLoading = false,
  onToggle,
  addLabel,
  removeLabel,
  size = "inline",
  variant = "plain",
  className = "",
}: WishlistHeartButtonProps) {
  const label = inWishlist ? removeLabel : addLabel;
  const box = PLACEMENT_SIZE[size];

  return (
    <IconButton
      type="button"
      aria-label={label}
      title={label}
      size={box}
      variant="ghost"
      rounded="full"
      disabled={isLoading}
      aria-pressed={inWishlist}
      onClick={(e) => void onToggle(e)}
      className={[
        "transition-colors duration-150",
        variant === "overlay"
          ? "bg-[var(--appkit-color-surface-elevated)]/90 shadow-sm backdrop-blur-sm"
          : "",
        isLoading ? "opacity-50" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      icon={
        <Icon
          name="wishlist"
          size={ICON_BUTTON_ICON_SIZE[box]}
          filled={inWishlist}
          tone={inWishlist ? "error" : "muted"}
        />
      }
    />
  );
}
