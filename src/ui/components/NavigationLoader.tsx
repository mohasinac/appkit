"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Spinner } from "./Spinner";

export interface NavigationLoaderProps {
  /**
   * Spinner variant shown during navigation.
   * @default "pokeball"
   */
  spinnerVariant?: "primary" | "white" | "current" | "pokeball";
  /** Label read by screen readers. @default "Loading page…" */
  label?: string;
  /**
   * Safety valve: hides the overlay if the route never settles.
   * @default 15000 (ms)
   */
  timeoutMs?: number;
  /** Additional className on the overlay div. */
  className?: string;
}

/**
 * NavigationLoader
 *
 * Renders a full-screen overlay with a spinner during any client-side
 * navigation (Link clicks, router.push, back/forward).
 *
 * Strategy:
 *  - Start: intercept `history.pushState` + `popstate`
 *  - End:   `usePathname()` changing means React has settled
 *
 * Mount once at the app shell level (e.g. inside LayoutShellClient).
 */
export function NavigationLoader({
  spinnerVariant = "pokeball",
  label = "Loading page…",
  timeoutMs = 15_000,
  className = "",
}: NavigationLoaderProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef(pathname);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hide once the new route's pathname has settled in React
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setVisible(false);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    }
  }, [pathname]);

  useEffect(() => {
    function showOverlay() {
      setVisible(true);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      safetyTimer.current = setTimeout(() => setVisible(false), timeoutMs);
    }

    const origPush = history.pushState.bind(history);
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      showOverlay();
      return origPush(...args);
    };

    window.addEventListener("popstate", showOverlay);

    return () => {
      history.pushState = origPush;
      window.removeEventListener("popstate", showOverlay);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    };
  }, [timeoutMs]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label={label}
      className={`appkit-nav-loader ${className}`}
    >
      <Spinner size="xl" variant={spinnerVariant} label={label} />
    </div>
  );
}
