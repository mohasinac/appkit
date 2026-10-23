"use client";
import { normalizeError } from "../../errors/normalize";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Spinner } from "./Spinner";

/**
 * The route key this component settles on: path + query, NEVER the hash.
 *
 * It has to match what `usePathname()` + `useSearchParams()` can observe,
 * because those two hooks are the only thing that can hide the overlay. A hash
 * is invisible to both, so including it here would promise a settle signal
 * that can never arrive.
 */
function windowRouteKey(): string {
  const url = new URL(window.location.href);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

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
   *
   * 10s, matching the sync-function ceiling this app is written against — an
   * RSC payload that has not arrived by then is not arriving, so holding a
   * blocking overlay any longer only hides the page the user still has.
   *
   * @default 10000 (ms)
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
 * 🛑 It must never start for a navigation whose path+query cannot change,
 * because the end condition would then be unreachable and the overlay would
 * block the whole viewport until `timeoutMs`. An in-page anchor is exactly
 * that: clicking `#section` fires `popstate` (Chrome does, for the App
 * Router's hash entry) while `usePathname()` and `useSearchParams()` both stay
 * put — measured against production, 15s of stranded overlay on the way in AND
 * again on Back. Hence the `live === prev` gate in `onPopState`.
 *
 * Mount once at the app shell level (e.g. inside LayoutShellClient).
 */
export function NavigationLoader({
  spinnerVariant = "pokeball",
  label = "Loading page…",
  timeoutMs = 10_000,
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
  /** Last path+query seen on `window.location`. Null until the first effect. */
  const lastWindowKey = useRef<string | null>(null);

  const currentUrl = `${pathname ?? ""}?${searchParams?.toString() ?? ""}`;

  const prevUrl = useRef<string>(currentUrl);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  /** Drop the overlay and every timer behind it. Safe to call when hidden. */
  const hideNow = useCallback(() => {
    activeRef.current = false;
    visibleRef.current = false;
    setVisible(false);
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
    startTime.current = null;
    pendingUrl.current = null;
  }, []);

  // Hide once the route URL (path + query) has settled in React.
  useEffect(() => {
    if (currentUrl !== prevUrl.current) {
      prevUrl.current = currentUrl;
      lastWindowKey.current = windowRouteKey();
      hideNow();
    }
  }, [currentUrl, hideNow]);

  useEffect(() => {
    if (lastWindowKey.current === null) lastWindowKey.current = windowRouteKey();

    function showOverlay(nextKey?: string) {
      if (activeRef.current || visibleRef.current) return;
      if (showTimer.current) return;
      // Checked BEFORE claiming `activeRef`: returning with it already set
      // would leave the flag stuck true, and every later navigation would
      // early-return above — the loader would silently never show again.
      if (nextKey && pendingUrl.current === nextKey) return;
      activeRef.current = true;
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
        safetyTimer.current = setTimeout(hideNow, timeoutMs);
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
      } catch (_err) {
        void normalizeError(_err);
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
        } catch (_err) {
          void normalizeError(_err);
          showOverlay();
        }
      }
      const result = origPush(...args);
      lastWindowKey.current = windowRouteKey();
      return result;
    };

    function onPopState() {
      // `popstate` fires AFTER the URL has changed, so this is the destination.
      const live = windowRouteKey();
      const prev = lastWindowKey.current;
      lastWindowKey.current = live;
      // Same path+query means an in-page anchor or a second history entry for
      // the route we are already on. React will never re-render, so the hide
      // effect above can never fire — showing the overlay here strands it.
      if (live === prev) {
        hideNow();
        return;
      }
      showOverlay(live);
    }

    // Belt to the braces above: a hash change that reaches us some other way
    // is still, by definition, not a route change.
    function onHashChange() {
      lastWindowKey.current = windowRouteKey();
      hideNow();
    }

    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);

    return () => {
      history.pushState = origPush;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onHashChange);
      if (showTimer.current) clearTimeout(showTimer.current);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
      activeRef.current = false;
      visibleRef.current = false;
      startTime.current = null;
      pendingUrl.current = null;
    };
  }, [timeoutMs, hideNow]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label={label}
      className={`appkit-nav-loader ${className}`}
     data-section="navigationloader-div-566">
      <Spinner size="xl" variant={spinnerVariant} label={label} />
      <span className="appkit-nav-loader__timer" aria-hidden="true">
        {elapsed.toFixed(1)}s
      </span>
    </div>
  );
}
