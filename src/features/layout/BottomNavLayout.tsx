"use client";
import React, { useEffect } from "react";
import { Nav, Ul } from "../../ui";
import { useVisualViewportInset } from "../../react/hooks/useVisualViewportInset";

export interface BottomNavLayoutProps {
  ariaLabel: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

/**
 * BottomNavLayout — generic fixed-bottom navigation shell.
 *
 * Provides the `nav + ul` container with correct z-index, background, height,
 * and safe-area inset. Pass `li`-wrapped items as children.
 *
 * Mirrors `AppLayoutShell`'s `--header-height` contract: while mounted, writes
 * `--bottom-nav-height: 4rem` to `:root` (sub-`lg` only — the nav itself is
 * `lg:hidden`). Sticky CTAs read `var(--bottom-nav-height, 0px)` to position
 * themselves above the navbar so they don't get clipped.
 *
 * Hand mode: the item strip carries `appkit-hand-mirror`, so slot order
 * reverses in left-hand mode (CSS-only via `[data-hand]` — applies on the
 * first paint, no flash). This deliberately covers BOTH bottom bars: the
 * public `BottomNavbar` and `DashboardLayoutClient`'s `dashboard-bottom-navbar`
 * both render through here, and they must behave identically.
 */
export function BottomNavLayout({
  ariaLabel,
  children,
  id = "bottom-navbar",
  className,
}: BottomNavLayoutProps) {
  const isKeyboardOpen = useVisualViewportInset();

  useEffect(() => {
    const root = document.documentElement;
    const mql = typeof window !== "undefined" ? window.matchMedia("(max-width: 1023.98px)") : null;
    const sync = () => {
      // Only expose the var when the navbar is actually rendered (below lg
      // and the on-screen keyboard isn't covering it — the bar hides itself
      // in that case, see className below).
      // Includes the safe-area inset since the nav's own padding-bottom
      // (env(safe-area-inset-bottom) below) adds to its real rendered
      // height — omitting it here would under-report the reserved space to
      // every sibling that reads this var (BottomActions, ListingLayout's
      // mobile pagination bar, SideDrawer/Drawer footers, etc.).
      root.style.setProperty(
        "--bottom-nav-height",
        mql && mql.matches && !isKeyboardOpen ? "calc(4rem + env(safe-area-inset-bottom, 0px))" : "0px",
      );
    };
    sync();
    mql?.addEventListener("change", sync);
    return () => {
      mql?.removeEventListener("change", sync);
      root.style.setProperty("--bottom-nav-height", "0px");
    };
  }, [isKeyboardOpen]);

  return (
    <Nav
      id={id}
      aria-label={ariaLabel}
      aria-hidden={isKeyboardOpen}
      className={`fixed bottom-0 left-0 right-0 lg:hidden z-[var(--appkit-z-bottom-nav)] bg-[color-mix(in_srgb,var(--appkit-color-bg)_90%,transparent)] backdrop-blur-md border-t border-[var(--appkit-color-border)] shadow-2xl pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-200 ease-out ${isKeyboardOpen ? "translate-y-full pointer-events-none" : "translate-y-0"}${className ? ` ${className}` : ""}`}
    >
      <Ul className="appkit-hand-mirror flex items-stretch h-16">{children}</Ul>
    </Nav>
  );
}
