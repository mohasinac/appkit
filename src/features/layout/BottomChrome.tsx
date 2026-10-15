"use client";

import React, { useEffect, useRef, useState } from "react";
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
 *     panels are `absolute bottom-full` on mobile / `top-full` on desktop —
 *     deliberately outside the flow (they are transient tap-to-open overlays,
 *     not persistent bands, so they are excluded from the published height) —
 *     and clipping would erase them.
 *
 * ── The tier CHANGES ENDS at `lg` ──────────────────────────────────────────
 *
 * Below `lg` it is the bottom edge, as described above. At `lg` and up it hangs
 * from under the sticky header instead, and publishes its height as
 * `--top-chrome-height` rather than `--bottom-chrome-height`.
 *
 * A full-width action bar welded to the bottom of a desktop window is a mobile
 * pattern on a screen that has neither a thumb zone nor a tab bar to stack
 * above — it reads as a browser download bar, and it is the furthest point on
 * screen from the content it acts on. Under the header it sits where the eye
 * already is and where the page's own chrome lives.
 *
 * Consumers therefore read whichever end they care about, and the two are
 * mutually exclusive by construction (see `write()`).
 */

/**
 * The breakpoint at which the tier moves from the bottom edge to under the
 * header. 64rem is Tailwind's `lg` — the same line `BottomNavbar` disappears
 * at, so the tier changes ends exactly when the thing it was stacking above
 * stops existing.
 */
const DESKTOP_QUERY = "(min-width: 64rem)";

export function BottomChrome({ children }: BottomChromeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Matched in JS as well as in CSS because the MEASUREMENT has to know which
  // variable to publish — a media query alone can move the box but cannot tell
  // the ResizeObserver which end of the screen it ended up at.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el) return;

    /*
     * 🛑 EXACTLY ONE of the two variables carries the height; the other is
     * pinned to 0. They are not interchangeable and must never both be live:
     * `--bottom-chrome-height` is clearance at the BOTTOM of the viewport
     * (BackToTop floats above it, the footer reserves it) and
     * `--top-chrome-height` is clearance at the TOP (content is pushed down by
     * it). Publishing a real height to both would make every consumer reserve
     * the bar twice — a gap the size of the bar at the end of every page on
     * desktop, which is exactly the "looks ugly" symptom one tier up.
     */
    const write = () => {
      const h = `${el.offsetHeight}px`;
      root.style.setProperty("--top-chrome-height", isDesktop ? h : "0px");
      root.style.setProperty("--bottom-chrome-height", isDesktop ? "0px" : h);
    };
    const observer = new ResizeObserver(write);
    observer.observe(el);
    write();
    return () => {
      observer.disconnect();
      root.style.setProperty("--bottom-chrome-height", "0px");
      root.style.setProperty("--top-chrome-height", "0px");
    };
  }, [isDesktop]);

  return (
    <Div
      ref={ref}
      layout="flex-col"
      // `pointer-events-none` so an empty tier never eats clicks meant for the
      // page underneath; every child re-enables with `pointer-events-auto`.
      //
      // Desktop pins the tier directly beneath the sticky header rather than to
      // the bottom edge. A full-width bar welded to the bottom of a 1440px
      // window is a mobile pattern borrowed onto a screen that has no thumb
      // zone and no tab bar to sit above — on desktop the action row belongs
      // with the page chrome, where the eye already is. `--header-height` is
      // published by AppLayoutShell and already accounts for the announcement
      // banner, so this needs no second measurement.
      //
      // 🛑 The child's `flex-col` ORDER is reversed on desktop: at the bottom
      // edge the portalled slot must stack above the CTA row, and once the tier
      // hangs from the top the same visual ordering is the other way round.
      className={[
        "fixed left-0 right-0 z-[var(--appkit-z-bottom-nav)] pointer-events-none",
        "bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem))]",
        "lg:bottom-auto lg:top-[var(--header-height,0px)] lg:flex-col-reverse",
      ].join(" ")}
    >
      {/* Portalled bars render first so they stack ABOVE the CTA row, which is
          the ordering the old `--bulk` pagination modifier hardcoded. */}
      <Div id={BOTTOM_CHROME_SLOT_ID} className="contents" />
      {children}
    </Div>
  );
}
