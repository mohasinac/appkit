import { useRef, useState, useCallback, useEffect, RefObject } from "react";

export interface UsePullToRefreshOptions {
  /** Distance in px the user must pull before onRefresh triggers (default: 80) */
  threshold?: number;
}

export interface UsePullToRefreshReturn {
  /** Attach to the scrollable container element */
  containerRef: RefObject<HTMLDivElement | null>;
  /** `true` while the user is actively pulling */
  isPulling: boolean;
  /** Pull progress from 0 (not started) to 1 (threshold reached) */
  progress: number;
}

/**
 * usePullToRefresh Hook
 *
 * Attaches touch event listeners to `containerRef`.
 * When the user overscrolls from the very top and pulls down past `threshold`,
 * `onRefresh` is called. Progress (0–1) can be used to render a loading indicator.
 *
 * @param onRefresh - Async function called when pull threshold is reached
 * @param options   - Configuration: `threshold` in px (default 80)
 *
 * @example
 * ```tsx
 * const { containerRef, isPulling, progress } = usePullToRefresh(async () => {
 *   await refetchOrders();
 * });
 *
 * return (
 *   <div ref={containerRef} className="overflow-y-auto">
 *     {isPulling && <PullIndicator progress={progress} />}
 *     {…}
 *   </div>
 * );
 * ```
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: UsePullToRefreshOptions = {},
): UsePullToRefreshReturn {
  const { threshold = 80 } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [progress, setProgress] = useState(0);

  const startYRef = useRef<number | null>(null);
  const thresholdReachedRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    thresholdReachedRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setProgress(0);
        setIsPulling(false);
        return;
      }
      const prog = Math.min(delta / threshold, 1);
      setProgress(prog);
      setIsPulling(true);
      thresholdReachedRef.current = prog >= 1;
    },
    [threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    setIsPulling(false);
    setProgress(0);
    startYRef.current = null;
    if (thresholdReachedRef.current) {
      thresholdReachedRef.current = false;
      await onRefreshRef.current();
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, isPulling, progress };
}
