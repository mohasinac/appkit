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

/**
 * Per-variant accent token map — AdminSidebar/SellerSidebar/UserSidebar's
 * active-item styling (point 12, overhaul brief's per-portal wayfinding).
 *
 * Phase 4D (2026-11): until then this was DEAD — each of the three sidebars
 * hardcoded its own copy of these exact classes rather than reading from
 * here, so a future change to this map would silently stop matching what
 * actually renders. All three now reference it directly.
 */
export const DASHBOARD_ACCENT_CLASSES: Record<DashboardVariant, {
  activeBg: string;
  activeText: string;
  hoverBg: string;
}> = {
  admin: {
    activeBg: "bg-[var(--appkit-color-surface-elevated)]",
    activeText: "text-[var(--appkit-color-text)]",
    hoverBg: "hover:bg-[var(--appkit-color-surface)]",
  },
  store: {
    activeBg: "bg-warning-surface",
    activeText: "text-warning",
    hoverBg: "hover:bg-[var(--appkit-color-surface)]",
  },
  user: {
    /*
     * 🛑 NOT `bg-primary-*`/`text-primary-*`. The dark theme preset
     * rebrands `primary` to crimson red (tokens.css, "primary = Crimson
     * Red"), so the active-nav highlight on every user-portal sidebar item
     * read as an error/danger bar, not a brand accent — found live via
     * owner screenshot, 2026-11-02. Matching admin's neutral
     * `surface-elevated` would also have fixed the danger-color misread,
     * but would make admin and user visually indistinguishable, defeating
     * Phase 4D's own per-portal wayfinding goal (point 12) — store already
     * owns `warning`/amber for the same reason admin owns neutral. `info`
     * (teal/blue) is the third distinct, non-status-danger hue available.
     */
    activeBg: "bg-info-surface",
    activeText: "text-info",
    hoverBg: "hover:bg-[var(--appkit-color-surface)]",
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
export const DASHBOARD_DESKTOP_BREAKPOINT_PX = 1024;
export const DASHBOARD_DESKTOP_MEDIA_QUERY = `(min-width: ${DASHBOARD_DESKTOP_BREAKPOINT_PX}px)`;
