// appkit/src/react/hooks/useVisibleItems.ts
"use client";
import { useRef, useState, useEffect, useCallback } from "react";

export interface UseVisibleItemsOptions {
  /** Total number of items */
  total: number;
  /** Minimum width of each item in pixels */
  minItemWidth: number;
  /** Width reserved for each scroll arrow button (default: 36) */
  arrowWidth?: number;
  /** Gap between items in pixels (default: 8) */
  gap?: number;
}

export interface UseVisibleItemsResult {
  /** Attach to the scroll container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Number of items that fit in the current container width */
  visibleCount: number;
  /** Whether any items are hidden (arrows should be shown) */
  hasOverflow: boolean;
  /** Index of the first visible item */
  scrollOffset: number;
  setScrollOffset: React.Dispatch<React.SetStateAction<number>>;
  /** Scroll left by one page */
  scrollLeft: () => void;
  /** Scroll right by one page */
  scrollRight: () => void;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

/**
 * `useVisibleItems` — compute how many items fit in a container, handling
 * arrow button reservations. Powers `HorizontalScroller` and `TabStrip`.
 *
 * **Formula** (when overflow exists):
 * `visible = floor((containerWidth - 2 × (arrowWidth + gap) + gap) / (minItemWidth + gap))`
 *
 * When all items fit without arrows, no arrows are shown.
 */
export function useVisibleItems({
  total,
  minItemWidth,
  arrowWidth = 36,
  gap = 8,
}: UseVisibleItemsOptions): UseVisibleItemsResult {
  const containerRef = useRef<HTMLElement>(null);
  const [visibleCount, setVisibleCount] = useState(total);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = (width: number) => {
      // Check if all items fit without scrolling
      const totalItemsWidth = total * minItemWidth + Math.max(0, total - 1) * gap;
      if (totalItemsWidth <= width) {
        setVisibleCount(total);
        return;
      }
      // Reserve space for both arrows
      const usable = width - 2 * (arrowWidth + gap);
      const raw = Math.floor((usable + gap) / (minItemWidth + gap));
      setVisibleCount(Math.max(1, raw));
    };

    const ro = new ResizeObserver(([entry]) => {
      if (entry) compute(entry.contentRect.width);
    });
    ro.observe(el);
    compute(el.getBoundingClientRect().width);

    return () => ro.disconnect();
  }, [total, minItemWidth, arrowWidth, gap]);

  // Clamp scroll offset when visibleCount or total changes
  useEffect(() => {
    setScrollOffset((o) => Math.min(o, Math.max(0, total - visibleCount)));
  }, [visibleCount, total]);

  const hasOverflow = visibleCount < total;

  const scrollLeft = useCallback(
    () => setScrollOffset((o) => Math.max(0, o - visibleCount)),
    [visibleCount],
  );

  const scrollRight = useCallback(
    () =>
      setScrollOffset((o) =>
        Math.min(total - visibleCount, o + visibleCount),
      ),
    [visibleCount, total],
  );

  return {
    containerRef,
    visibleCount,
    hasOverflow,
    scrollOffset,
    setScrollOffset,
    scrollLeft,
    scrollRight,
    canScrollLeft: scrollOffset > 0,
    canScrollRight: scrollOffset + visibleCount < total,
  };
}
