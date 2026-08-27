import React from "react";
import { twMerge } from "tailwind-merge";
import {
  ICONS,
  ICON_SIZE,
  resolveIcon,
  type IconKey,
  type IconSizeKey,
} from "../icons/icon-registry";

/**
 * Ink colour. Deliberately a small enum of THEME-INVERTING tokens rather than
 * open className — a glyph that does not follow the theme is the same defect as
 * a hardcoded `zinc-50` hover background, one property over.
 */
const TONES = {
  current: "",
  default: "text-[var(--appkit-color-text)]",
  muted: "text-[var(--appkit-color-text-muted)]",
  faint: "text-[var(--appkit-color-text-faint)]",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
  /** White ink, for a glyph on a solid brand/status fill or a dark scrim. */
  "on-solid": "text-white",
} as const;

export type IconTone = keyof typeof TONES;

export interface IconProps
  extends Omit<React.SVGProps<SVGSVGElement>, "ref" | "name"> {
  /** Registry key — a typo is a compile error, not a silent blank. */
  name: IconKey;
  /** Role-based size. See ICON_SIZE for which to pick. */
  size?: IconSizeKey;
  tone?: IconTone;
  /**
   * Filled rather than outlined — the wishlist heart's "saved" state, a
   * rating star, etc. Lucide glyphs are stroked outlines by default.
   */
  filled?: boolean;
  /**
   * Give the glyph an accessible name. OMIT for decorative icons that sit
   * beside a visible text label — the default is `aria-hidden`, because a
   * screen reader announcing "heart, Add to wishlist" is worse than silence.
   */
  label?: string;
}

/**
 * The single way to render an icon.
 *
 * 105 files imported `lucide-react` directly and each picked its own size, so
 * "an icon" was whatever that file happened to choose. `icon-registry.ts` was
 * built to be the indirection and had no consumer; this is it.
 *
 * Safe in a Server Component: `lucide-react` is plain CJS with no `"use client"`
 * banner, and this file adds no hooks. Do NOT add state here without also
 * checking every RSC call site (Root Cause #76).
 */
export function Icon({
  name,
  size = "md",
  tone = "current",
  filled = false,
  label,
  className = "",
  ...rest
}: IconProps) {
  const Glyph = resolveIcon(name);
  // `resolveIcon` returns undefined for an unknown key on purpose — render
  // nothing and leave the label intact rather than drawing a broken-image box.
  if (!Glyph) return null;

  return (
    <Glyph
      className={twMerge(ICON_SIZE[size], TONES[tone], "shrink-0", className)}
      fill={filled ? "currentColor" : "none"}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      {...rest}
    />
  );
}

export { ICONS, ICON_SIZE };
export type { IconKey, IconSizeKey };
