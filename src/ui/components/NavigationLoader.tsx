"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef<number | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingUrl = useRef<string | null>(null);
  const visibleRef = useRef(false);
  const activeRef = useRef(false);

  const currentUrl = `${pathname ?? ""}?${searchParams?.toString() ?? ""}`;

  const prevUrl = useRef<string>(currentUrl);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // Hide once the route URL (path + query/hash) has settled in React.
  useEffect(() => {
    if (currentUrl !== prevUrl.current) {
      prevUrl.current = currentUrl;
      activeRef.current = false;
      visibleRef.current = false;
      setVisible(false);
      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
      startTime.current = null;
      pendingUrl.current = null;
    }
  }, [currentUrl]);

  useEffect(() => {
    function showOverlay(nextKey?: string) {
      if (activeRef.current || visibleRef.current) return;
      if (showTimer.current) return;
      activeRef.current = true;
      if (nextKey && pendingUrl.current === nextKey) return;
      pendingUrl.current = nextKey ?? pendingUrl.current;
      // Defer to next macrotask to avoid updates during router insertion effects.
      showTimer.current = setTimeout(() => {
        showTimer.current = null;
        visibleRef.current = true;
        startTime.current = performance.now();
        setElapsed(0);
        if (tickTimer.current) clearInterval(tickTimer.current);
        tickTimer.current = setInterval(() => {
          setElapsed(Math.floor((performance.now() - startTime.current!) / 100) / 10);
        }, 100);
        setVisible(true);
        if (safetyTimer.current) clearTimeout(safetyTimer.current);
        safetyTimer.current = setTimeout(() => {
          activeRef.current = false;
          visibleRef.current = false;
          setVisible(false);
          if (tickTimer.current) clearInterval(tickTimer.current);
          startTime.current = null;
          pendingUrl.current = null;
        }, timeoutMs);
      }, 0);
    }

    function shouldShowForNextUrl(next: string | URL | null | undefined): boolean {
      // No target URL means history state mutation only, not navigation.
      if (!next) return false;
      try {
        const href = typeof next === "string" ? next : next.toString();
        const nextUrl = new URL(href, window.location.href);
        const nextKey = `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`;
        const liveUrl = new URL(window.location.href);
        const liveKey = `${liveUrl.pathname}?${liveUrl.searchParams.toString()}`;
        if (nextKey === liveKey) return false;
        if (pendingUrl.current && nextKey === pendingUrl.current) return false;
        return true;
      } catch {
        return true;
      }
    }

    const origPush = history.pushState.bind(history);
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      const next = args[2];
      if (shouldShowForNextUrl(next)) {
        try {
          const href = typeof next === "string" ? next : next?.toString() ?? "";
          const nextUrl = new URL(href, window.location.href);
          showOverlay(`${nextUrl.pathname}?${nextUrl.searchParams.toString()}`);
        } catch {
          showOverlay();
        }
      }
      return origPush(...args);
    };

    function onPopState() {
      showOverlay();
    }

    window.addEventListener("popstate", onPopState);

    return () => {
      history.pushState = origPush;
      window.removeEventListener("popstate", onPopState);
      if (showTimer.current) clearTimeout(showTimer.current);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
      activeRef.current = false;
      visibleRef.current = false;
      startTime.current = null;
      pendingUrl.current = null;
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
      <span className="appkit-nav-loader__timer" aria-hidden="true">
        {elapsed.toFixed(1)}s
      </span>
    </div>
  );
}
