"use client"
import { useEffect, useState } from "react";

/**
 * useVisualViewportInset Hook
 *
 * Tracks the height of the viewport obscured by the on-screen keyboard (or any
 * other browser chrome that shrinks `window.visualViewport` without shrinking
 * the layout viewport — the classic iOS Safari case). Writes the result to
 * `document.documentElement` as `--keyboard-inset-height`, mirroring the
 * `--header-height` / `--bottom-nav-height` pattern already used elsewhere in
 * appkit (AppLayoutShell, BottomNavLayout) so any fixed/sticky element can
 * react via pure CSS `calc()` without its own listener.
 *
 * No-ops (returns `false`, writes `0px`) when `window.visualViewport` is
 * unsupported — older browsers keep today's fixed-to-layout-viewport behavior.
 *
 * @returns isKeyboardOpen - true once the obscured height crosses a small
 *   threshold, for components that need to branch (e.g. hide a tab bar)
 *   rather than just offset via the CSS variable.
 *
 * @example
 * ```tsx
 * const isKeyboardOpen = useVisualViewportInset();
 * // other elements just read: bottom: calc(var(--keyboard-inset-height, 0px) + ...)
 * ```
 */
const KEYBOARD_OPEN_THRESHOLD_PX = 60;

export function useVisualViewportInset(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const root = document.documentElement;
    let rafId: number | null = null;

    const apply = () => {
      rafId = null;
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      root.style.setProperty("--keyboard-inset-height", `${inset}px`);
      setIsKeyboardOpen(inset > KEYBOARD_OPEN_THRESHOLD_PX);
    };

    const schedule = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(apply);
    };

    schedule();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      root.style.setProperty("--keyboard-inset-height", "0px");
    };
  }, []);

  return isKeyboardOpen;
}
