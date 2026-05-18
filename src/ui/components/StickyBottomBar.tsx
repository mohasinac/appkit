"use client";

/**
 * StickyBottomBar — fixed-bottom action bar that sits above the mobile
 * BottomNavLayout (when present) and below any modals.
 *
 * Reads `--bottom-nav-height` written by `BottomNavLayout` (4rem when the
 * navbar is rendered below `lg`, 0px otherwise). Falls back to 0px when the
 * variable is unset so the bar still pins to the viewport bottom on routes
 * that don't render a bottom nav.
 *
 * z-index sits above the navbar (`z-40`) but below modal overlays.
 */

import React from "react";

export interface StickyBottomBarProps {
  children: React.ReactNode;
  /** Optional extra className appended to the bar wrapper. */
  className?: string;
  /** Hide on `lg` and up. Defaults to `true` — matches BottomNavLayout's responsive scope. */
  mobileOnly?: boolean;
  /** Test id passthrough. */
  "data-testid"?: string;
}

const BAR_STYLE: React.CSSProperties = {
  bottom: "var(--bottom-nav-height, 0px)",
  zIndex: 45,
};

export function StickyBottomBar({
  children,
  className,
  mobileOnly = true,
  "data-testid": testId,
}: StickyBottomBarProps): React.JSX.Element {
  return (
    <div
      // eslint-disable-next-line lir/no-inline-static-style
      style={BAR_STYLE}
      data-testid={testId}
      className={[
        "fixed left-0 right-0",
        mobileOnly ? "lg:hidden" : "",
        "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md",
        "border-t border-zinc-200 dark:border-slate-800",
        "shadow-2xl pb-safe",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
