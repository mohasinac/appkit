"use client";

/**
 * DashboardScaffold — admin / seller / user dashboard chrome.
 *
 * Responsive nav strategy (mobile-first):
 *   xs / sm — bottom nav bar  (visible <lg)
 *   md      — off-canvas drawer triggered by `slotMenuToggle`
 *   lg+     — sticky left sidebar (always visible)
 *
 * Drives nav rendering through `renderNav` so consumers can pipe in any
 * nav config (admin/store/user groups). The scaffold owns the responsive
 * placement; the consumer owns the items.
 */

import * as React from "react";
import { Div } from "../../../ui";

export interface DashboardScaffoldRenderContext {
  /** Whether the off-canvas drawer is open. */
  drawerOpen: boolean;
  /** Imperatively toggle the drawer (consumer-supplied trigger calls this). */
  toggleDrawer: () => void;
}

export interface DashboardScaffoldProps {
  children: React.ReactNode;
  /** Top breadcrumb / page-title strip. */
  slotPageHeader?: React.ReactNode;
  /** Navigation items — rendered into all three placements (sidebar, drawer, bottom). */
  renderNav?: (ctx: DashboardScaffoldRenderContext) => React.ReactNode;
  /** Compact bottom nav (mobile only). If omitted, falls back to renderNav. */
  renderBottomNav?: (ctx: DashboardScaffoldRenderContext) => React.ReactNode;
  /** Trigger element that toggles the off-canvas drawer (md only). */
  slotMenuToggle?: React.ReactNode;
  /** Initial drawer-open state. */
  initialDrawerOpen?: boolean;
  className?: string;
}

export function DashboardScaffold({
  children,
  slotPageHeader,
  renderNav,
  renderBottomNav,
  slotMenuToggle,
  initialDrawerOpen = false,
  className,
}: DashboardScaffoldProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(initialDrawerOpen);
  const toggleDrawer = React.useCallback(() => setDrawerOpen((v) => !v), []);
  const ctx: DashboardScaffoldRenderContext = { drawerOpen, toggleDrawer };

  const nav = renderNav ? renderNav(ctx) : null;
  const bottomNav = renderBottomNav ? renderBottomNav(ctx) : nav;

  return (
    <Div className={`appkit-dashboard-scaffold flex min-h-screen ${className ?? ""}`}>
      {nav ? (
        <aside
          className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-[var(--appkit-color-border)] lg:block"
          data-dashboard-slot="sidebar"
        >
          {nav}
        </aside>
      ) : null}

      {nav ? (
        <div
          className={`fixed inset-0 z-40 transition-transform md:block lg:hidden ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          data-dashboard-slot="drawer"
          aria-hidden={!drawerOpen}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          />
          <nav className="relative h-full w-64 overflow-y-auto bg-[var(--appkit-color-surface)] shadow-xl">
            {nav}
          </nav>
        </div>
      ) : null}

      <Div className="flex min-w-0 flex-1 flex-col">
        {(slotPageHeader || slotMenuToggle) && (
          <div
            className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-4 py-2"
            data-dashboard-slot="page-header"
          >
            {slotMenuToggle ? (
              <span className="lg:hidden" onClick={toggleDrawer} role="presentation">
                {slotMenuToggle}
              </span>
            ) : null}
            <Div className="min-w-0 flex-1">{slotPageHeader}</Div>
          </div>
        )}

        <main className="min-w-0 flex-1 pb-20 lg:pb-0" data-dashboard-slot="main">
          {children}
        </main>

        {bottomNav ? (
          <nav
            className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] lg:hidden"
            data-dashboard-slot="bottom-nav"
          >
            {bottomNav}
          </nav>
        ) : null}
      </Div>
    </Div>
  );
}
