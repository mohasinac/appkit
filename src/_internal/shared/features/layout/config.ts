/**
 * Layout feature — shared config constants.
 *
 * Pixel widths, breakpoint values, default classNames. All sections read from
 * here so the responsive contract is single-sourced.
 */

import type { DashboardVariant, LayoutBreakpoint } from "./types";

/** Drawer (slide-out) width tokens — Tailwind classnames. */
export const SIDE_DRAWER_WIDTH: Record<"sm" | "md" | "lg", string> = {
  sm: "w-72",
  md: "w-80",
  lg: "w-96",
};

/** Persistent dashboard sidebar rail width (collapsed/expanded). */
export const DASHBOARD_SIDEBAR_WIDTH = {
  expanded: "lg:w-64",
  compact: "lg:w-16",
};

/** Per-variant accent token map. Drives DashboardSidebar active-item styling. */
export const DASHBOARD_ACCENT_CLASSES: Record<DashboardVariant, {
  activeBg: string;
  activeText: string;
  hoverBg: string;
}> = {
  admin: {
    activeBg: "bg-zinc-100 dark:bg-slate-800",
    activeText: "text-zinc-900 dark:text-zinc-100",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-slate-800/60",
  },
  store: {
    activeBg: "bg-warning-surface dark:bg-warning-surface",
    activeText: "text-warning dark:text-warning",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-slate-800/60",
  },
  user: {
    activeBg: "bg-primary-50 dark:bg-primary-900/25",
    activeText: "text-primary-700 dark:text-primary-300",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-slate-800",
  },
};

/** hideAt → Tailwind class. `md:hidden` etc. */
export function hideAtClass(bp: LayoutBreakpoint | undefined): string {
  if (!bp) return "";
  return `${bp}:hidden`;
}

/** showAt → Tailwind class. `md:block` etc. */
export function showAtClass(bp: LayoutBreakpoint | undefined, display = "block"): string {
  if (!bp) return "";
  return `hidden ${bp}:${display}`;
}

/** Default bottom-nav padding to reserve space (mobile only). */
export const BOTTOM_NAV_CONTENT_PADDING = "pb-16 md:pb-0";

/** Sticky-header CSS custom property — written by AppLayoutShell / AppShellServer. */
export const HEADER_HEIGHT_CSS_VAR = "--header-height";

/**
 * Desktop breakpoint for dashboard drawer behaviour. Mirrors Tailwind's `md` (768px).
 * Exported so DashboardLayoutClient can call `window.matchMedia(DASHBOARD_DESKTOP_MEDIA_QUERY)`
 * without re-hardcoding the value across every layout consumer.
 */
export const DASHBOARD_DESKTOP_BREAKPOINT_PX = 768;
export const DASHBOARD_DESKTOP_MEDIA_QUERY = `(min-width: ${DASHBOARD_DESKTOP_BREAKPOINT_PX}px)`;
