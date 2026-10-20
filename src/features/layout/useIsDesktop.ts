"use client";

import { useEffect, useState } from "react";

/**
 * The line at which the layout stops being a phone.
 *
 * 64rem is Tailwind's `lg` — deliberately the same breakpoint `BottomNavbar`
 * disappears at, so every decision that depends on "is there a tab bar at the
 * bottom of this screen" flips at one place.
 */
export const DESKTOP_QUERY = "(min-width: 64rem)";

/**
 * `true` at `lg` and up.
 *
 * ── 🛑 WHY A HOOK AND NOT A `lg:` CLASS ────────────────────────────────────
 *
 * Three callers need the breakpoint as a VALUE, not as styling:
 *
 *   - `BottomChrome` must know which CSS variable to publish — a media query
 *     can move the box but cannot tell a `ResizeObserver` which end of the
 *     screen it landed at.
 *   - `SideActionDock` and `BottomActions` are the two halves of one control
 *     and must never both be mounted: two toolbars reading the same context,
 *     both `fixed`, both dispatching the same callbacks. Hiding one with
 *     `display:none` would still mount it, still run its observers, and still
 *     let a stray `:focus` land inside an invisible bar.
 *
 * And the class form is actively unsafe here. Both Tailwind configs set
 * `important: true`, so a `lg:` override and its unprefixed base tie on
 * specificity AND on `!important` — a media query adds no specificity — and
 * the winner is decided by EMISSION ORDER in the built CSS, which is invisible
 * from the call site. That is exactly how `BottomChrome` ended up anchored to
 * both edges at once and published an 801px phantom bar (see its header).
 *
 * SSR renders the mobile branch, because that is the branch that is correct
 * when nothing is known: a phone that briefly gets the dock has lost its only
 * CTA, while a desktop that briefly gets the bar has a bar.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}
