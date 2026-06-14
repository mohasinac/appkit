"use client";

import type { ReactNode } from "react";

/**
 * Show / Hide — primitives for breakpoint-conditional rendering.
 *
 * Both render the same tree on the server and let CSS handle visibility,
 * so they're hydration-safe. Use these instead of authoring `sm:hidden` /
 * `md:block` className strings at the call site — the variant catalogue
 * forbids raw responsive prefixes in feature views.
 */
export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

interface ResponsiveProps {
  children: ReactNode;
  /** Show / hide when the viewport is **at or above** this breakpoint. */
  above?: Breakpoint;
  /** Show / hide when the viewport is **below** this breakpoint. */
  below?: Breakpoint;
  /** Render as `<span>` instead of `<div>` for inline contexts. */
  inline?: boolean;
}

/**
 * Mapping of breakpoint → Tailwind utility for the lower-bound visibility class.
 *
 * `hidden` flips to `block` (or `inline-block`) at the breakpoint when used as
 * `<breakpoint>:block`, and vice versa.
 */
const SHOW_ABOVE_BLOCK: Record<Breakpoint, string> = {
  sm: "hidden sm:block",
  md: "hidden md:block",
  lg: "hidden lg:block",
  xl: "hidden xl:block",
  "2xl": "hidden 2xl:block",
};
const SHOW_ABOVE_INLINE: Record<Breakpoint, string> = {
  sm: "hidden sm:inline",
  md: "hidden md:inline",
  lg: "hidden lg:inline",
  xl: "hidden xl:inline",
  "2xl": "hidden 2xl:inline",
};
const SHOW_BELOW_BLOCK: Record<Breakpoint, string> = {
  sm: "block sm:hidden",
  md: "block md:hidden",
  lg: "block lg:hidden",
  xl: "block xl:hidden",
  "2xl": "block 2xl:hidden",
};
const SHOW_BELOW_INLINE: Record<Breakpoint, string> = {
  sm: "inline sm:hidden",
  md: "inline md:hidden",
  lg: "inline lg:hidden",
  xl: "inline xl:hidden",
  "2xl": "inline 2xl:hidden",
};

function buildShowClass(
  above: Breakpoint | undefined,
  below: Breakpoint | undefined,
  inline: boolean,
): string {
  if (above && !below) return inline ? SHOW_ABOVE_INLINE[above] : SHOW_ABOVE_BLOCK[above];
  if (below && !above) return inline ? SHOW_BELOW_INLINE[below] : SHOW_BELOW_BLOCK[below];
  if (above && below) {
    // Window: show between [above, below).
    const display = inline ? "inline" : "block";
    return `hidden ${above}:${display} ${below}:hidden`;
  }
  return inline ? "inline" : "block";
}

function buildHideClass(
  above: Breakpoint | undefined,
  below: Breakpoint | undefined,
  inline: boolean,
): string {
  if (above && !below) return inline ? SHOW_BELOW_INLINE[above] : SHOW_BELOW_BLOCK[above];
  if (below && !above) return inline ? SHOW_ABOVE_INLINE[below] : SHOW_ABOVE_BLOCK[below];
  if (above && below) {
    const display = inline ? "inline" : "block";
    return `${display} ${above}:hidden ${below}:${display}`;
  }
  return "hidden";
}

export interface ShowProps extends ResponsiveProps {}
export interface HideProps extends ResponsiveProps {}

export function Show({ children, above, below, inline = false }: ShowProps) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      // audit-variant-ok: Show is the catalogued primitive for responsive
      // conditional render. above/below come from typed enums.
      className={buildShowClass(above, below, inline)}
    >
      {children}
    </Tag>
  );
}

export function Hide({ children, above, below, inline = false }: HideProps) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      // audit-variant-ok: Hide is the catalogued primitive for responsive
      // conditional render. above/below come from typed enums.
      className={buildHideClass(above, below, inline)}
    >
      {children}
    </Tag>
  );
}
