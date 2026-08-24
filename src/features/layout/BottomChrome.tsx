"use client";

import React, { useEffect, useRef } from "react";
import { Div } from "../../ui";
import { BOTTOM_CHROME_SLOT_ID } from "../../ui/components/bottom-chrome-slot";

export interface BottomChromeProps {
  children: React.ReactNode;
}

/**
 * BottomChrome — the middle tier of the bottom edge.
 *
 * The bottom edge is three tiers: the nav bar is the floor, `BackToTop` is the
 * ceiling, and *everything else* lives in here. This container is what makes
 * that middle tier a single thing with a single height:
 *
 *   --keyboard-inset-height   useVisualViewportInset  (the on-screen keyboard)
 *   --bottom-nav-height       BottomNavLayout         (the tab bar)
 *   --bottom-chrome-height    THIS COMPONENT          (CTA row, pagination, …)
 *      ↑ BackToTop floats above the sum of all three
 *
 * Because it is a flex column, its own `offsetHeight` IS the sum of whatever is
 * inside it — a bar changing height, revealing on scroll, entering bulk mode,
 * or being added years from now all just resize this box, and the one
 * ResizeObserver below picks every case up. Consumers read one variable and
 * never have to learn about individual bars. Publishing a separate var per bar
 * was the alternative, and it fails the moment someone adds bar number three
 * without also editing every consumer's `calc()`.
 *
 * Two constraints this container places on its children:
 *   - A child must hide by COLLAPSING, not by transforming. `translate-y-full`
 *     leaves layout height behind, so a hidden bar would still be reserved here
 *     on every page that has no CTA. See BottomActions' grid-rows collapse.
 *   - No `overflow: hidden` here, ever. BottomActions' bulk-picker and info
 *     panels are `absolute bottom-full` — deliberately outside the flow (they
 *     are transient tap-to-open overlays, not persistent bands, so they are
 *     excluded from the published height) — and clipping would erase them.
 */
export function BottomChrome({ children }: BottomChromeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el) return;
    const write = () =>
      root.style.setProperty("--bottom-chrome-height", `${el.offsetHeight}px`);
    const observer = new ResizeObserver(write);
    observer.observe(el);
    write();
    return () => {
      observer.disconnect();
      root.style.setProperty("--bottom-chrome-height", "0px");
    };
  }, []);

  return (
    <Div
      ref={ref}
      layout="flex-col"
      // `pointer-events-none` so an empty tier never eats clicks meant for the
      // page underneath; every child re-enables with `pointer-events-auto`.
      className="fixed left-0 right-0 bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem))] z-[var(--appkit-z-bottom-nav)] pointer-events-none"
    >
      {/* Portalled bars render first so they stack ABOVE the CTA row, which is
          the ordering the old `--bulk` pagination modifier hardcoded. */}
      <Div id={BOTTOM_CHROME_SLOT_ID} className="contents" />
      {children}
    </Div>
  );
}
