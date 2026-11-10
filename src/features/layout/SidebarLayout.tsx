"use client";

import React, { forwardRef } from "react";
import { Aside, Section } from "../../ui/components/Semantic";
import type { SectionBackgroundConfig } from "../../ui/components/Semantic";
import { Div } from "../../ui/components/Div";
import { useHandMode } from "../../_internal/client/hand-mode";

const __O = {
  yAuto: "overflow-y-auto",
} as const;

export interface SidebarLayoutProps {
  isOpen: boolean;
  ariaLabel: string;
  onClose: () => void;
  /** Content pinned inside a fixed (non-scrolling) header strip */
  header: React.ReactNode;
  /** Scrollable body content */
  children: React.ReactNode;
  id?: string;
  /** Optional color/gradient/image background for the sidebar panel — same shape as <Section background={…}>. */
  background?: SectionBackgroundConfig;
  /**
   * Confine the drawer to mobile breakpoints (`lg:hidden` on the panel AND the
   * backdrop).
   *
   * 🛑 Owner decision, restated 2026-11-11: *"i said no side drawer on the
   * main site why do we still use it?"*. The standing decision is **desktop
   * sidebar removed everywhere, public pages included; mobile keeps a drawer
   * for the long tail** — so the drawer is not deleted, it is confined.
   *
   * ⚠ This panel is ALWAYS in the DOM — when closed it is merely translated
   * off-screen (`translate-x-full`), not unmounted. So "it is closed on
   * desktop" was never the same as "it cannot open on desktop": a drawer
   * opened at a mobile width stayed open across a resize, and the hamburger
   * that opens it rendered at every breakpoint. Hiding the trigger alone would
   * have left both of those paths live.
   *
   * Dashboard navigation deliberately does NOT pass this — a dashboard's own
   * nav is a desktop affordance and is a different surface from the public
   * secondary drawer.
   */
  mobileOnly?: boolean;
}

/**
 * SidebarLayout — generic slide-out sidebar shell.
 *
 * Renders:
 *  - Backdrop overlay when open (closes on click)
 *  - Aside container with transform animation (right-side slide)
 *  - Fixed header slot (no-scroll, pinned at top)
 *  - Scrollable body slot (fills remaining height)
 *
 * Uses `forwardRef` so the parent can attach a swipe-detection ref
 * to the rendered `aside` element.
 */
export const SidebarLayout = forwardRef<HTMLElement, SidebarLayoutProps>(
  function SidebarLayout(
    { isOpen, ariaLabel, onClose, header, children, id = "secondary-sidebar", background, mobileOnly = false },
    ref,
  ) {
    const { hand } = useHandMode();
    const edgeClass = hand === "left" ? "left-0" : "right-0";
    const borderClass = hand === "left" ? "border-r" : "border-l";
    const closedTransform = hand === "left" ? "-translate-x-full" : "translate-x-full";
    /*
     * Applied to the panel AND the backdrop. Omitting it from the backdrop
     * would leave a full-screen click-catching overlay on desktop with no
     * visible panel attached to it — a page that silently swallows every
     * click, which is worse than the drawer it was meant to hide.
     */
    const mobileOnlyCls = mobileOnly ? " lg:hidden" : "";
    return (
      <>
        {/* Backdrop overlay */}
        {isOpen && (
          <Div surface="overlay-xs"
            className={`fixed inset-0 backdrop-blur-[2px] z-[var(--appkit-z-overlay)] transition-opacity duration-300${mobileOnlyCls}`}
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        <Aside border="default"
          ref={ref as React.RefObject<HTMLElement>}
          id={id}
          aria-label={ariaLabel}
          /*
           * 🛑 `z-[var(--appkit-z-sidebar)]`, not raw `z-50`. The sticky
           * title bar wrapper (AppLayoutShell.tsx) ALSO hardcoded raw
           * `z-50` — an accidental tie the project's own token scale
           * (`--appkit-z-title-bar: 42` < `--appkit-z-sidebar: 50`)
           * already exists to prevent. Under the tie, this panel's own
           * header strip visually collided with the title bar instead of
           * sitting cleanly above it. Found live, 2026-11-01.
           */
          className={`fixed inset-y-0 ${edgeClass} w-80 bg-[var(--appkit-color-surface)] ${borderClass} border-[var(--appkit-color-border-subtle)] shadow-2xl transform duration-300 ease-in-out z-[var(--appkit-z-sidebar)] ${isOpen ? "translate-x-0" : closedTransform} flex flex-col${mobileOnlyCls}`}
        >
          <Section tone="plain" background={background} className="flex flex-col flex-1 min-h-0">
            {/* Fixed (non-scrolling) header strip */}
            <Div border="default" className="flex-shrink-0 py-[var(--appkit-space-5)] border-b border-[var(--appkit-color-border-subtle)]" padding="x-lg" surface="muted">
              {header}
            </Div>

            {/* Scrollable body */}
            <Div className={`flex-1 ${__O.yAuto} scrollbar-thin`} padding="inlineLg">
              {children}
            </Div>
          </Section>
        </Aside>
      </>
    );
  },
);

SidebarLayout.displayName = "SidebarLayout";
