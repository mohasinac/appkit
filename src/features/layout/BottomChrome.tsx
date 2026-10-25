"use client";

import React, { useEffect, useRef } from "react";
import { Div } from "../../ui/components/Div";
import { BOTTOM_CHROME_SLOT_ID } from "../../ui/components/bottom-chrome-slot";
import { useIsDesktop } from "./useIsDesktop";

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

export function BottomChrome({ children }: BottomChromeProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Matched in JS as well as in CSS because the MEASUREMENT has to know which
  // variable to publish — a media query alone can move the box but cannot tell
  // the ResizeObserver which end of the screen it ended up at. Shared with
  // SideActionDock/BottomActions so one line decides the whole layout flip.
  const isDesktop = useIsDesktop();

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
      // The portalled slot and the CTA row stack in opposite visual orders at
      // the two ends. That reversal is done by swapping the CHILDREN below, not
      // with `flex-col-reverse` — see the 🛑 above the JSX.
      //
      // ── 🛑 WHY THIS BRANCHES IN JS AND NOT ON `lg:` ────────────────────────
      //
      // It used to be one class string carrying both states:
      //
      //   bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem))]
      //   lg:bottom-auto lg:top-[var(--header-height,0px)] lg:flex-col-reverse
      //
      // On a 1440px viewport `lg:top-[…]` applied and **`lg:bottom-auto` and
      // `lg:flex-col-reverse` did not**. The element was therefore anchored to
      // BOTH edges at once, and a `position: fixed` box with `left/right/top/
      // bottom` all set stretches: measured on production it was **801px tall
      // with both of its children 0px tall** (900 viewport − 99 header − 0 nav).
      // `BottomChrome` publishes its own `offsetHeight`, so it reported 801px as
      // `--top-chrome-height`, and `<Main>` reserved all of it — an 801px blank
      // band under the navbar on every desktop page. Verified by removing the
      // `bottom-[calc…]` class in the live DOM: height 801 → 0.
      //
      // The mechanism is Root Cause #79's. Both configs set `important: true`,
      // so an arbitrary-value utility and a named one tie on specificity AND on
      // `!important`, a media query adds no specificity, and the winner is
      // decided by EMISSION ORDER in the built CSS — which no one can see from
      // the call site. All four classes are present in `dist/tailwind-utilities.css`;
      // this was never a purge problem, so no `@source inline(...)` fixes it.
      //
      // So: never express this as a `lg:` override of an arbitrary-value base.
      // The component already computes `isDesktop` (the measurement has to know
      // which variable to publish), so the conflicting class is simply never
      // emitted — exactly one anchor exists in the DOM at any time, and the
      // cascade has nothing to arbitrate.
      className={[
        "fixed left-0 right-0 z-[var(--appkit-z-bottom-nav)] pointer-events-none",
        isDesktop
          ? "top-[var(--header-height,0px)]"
          : "bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem))]",
      ].join(" ")}
    >
      {/*
        At the bottom edge the portalled bars must stack ABOVE the CTA row (the
        ordering the old `--bulk` pagination modifier hardcoded); hanging from
        the header, the same visual result is the other way round.
        🛑 The swap is done HERE, in the children, and NOT with
        `lg:flex-col-reverse`. Verified in the live DOM: applying
        `flex-col-reverse` to this element leaves `flex-direction: row`, because
        no appkit source had ever authored that class unprefixed, so Tailwind
        never generated it and the unknown utility is dropped in silence — the
        element then falls back to a flex ROW and the tier lays out sideways.
        That is Root Cause #67's class of bug, and it cost nothing to avoid:
        array order is not a styling concern and cannot be purged.
      */}
      {isDesktop
        ? [
            <React.Fragment key="children">{children}</React.Fragment>,
            <Div key="slot" id={BOTTOM_CHROME_SLOT_ID} className="contents" />,
          ]
        : [
            <Div key="slot" id={BOTTOM_CHROME_SLOT_ID} className="contents" />,
            <React.Fragment key="children">{children}</React.Fragment>,
          ]}
    </Div>
  );
}
