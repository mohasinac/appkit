// appkit/src/react/hooks/useContainerGrid.ts
import { useRef, useState, useEffect } from "react";

export interface UseContainerGridOptions {
  /** Minimum width of each grid item in pixels */
  minItemWidth: number;
  /** Gap between items in pixels (default: 16) */
  gap?: number;
  /** Minimum column count (default: 1) */
  minCols?: number;
  /** Maximum column count (default: Infinity) */
  maxCols?: number;
}

export interface UseContainerGridResult {
  /** Attach to the grid container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Current computed column count */
  cols: number;
}

/**
 * `useContainerGrid` — compute the number of columns that fit in a container
 * using a `ResizeObserver`. Drives fluid skeleton loader card counts.
 *
 * **Formula**: `cols = clamp(minCols, floor((width + gap) / (minItemWidth + gap)), maxCols)`
 *
 * Pair with the `fluid-grid-*` CSS utilities in `tailwind.config.js` so the
 * skeleton count always matches the visible grid columns.
 *
 * @example
 * ```tsx
 * const { containerRef, cols } = useContainerGrid({ minItemWidth: 220 });
 *
 * return (
 *   <ul ref={containerRef as React.RefObject<HTMLUListElement>} className="fluid-grid-card gap-4">
 *     {isLoading
 *       ? Array.from({ length: cols * 2 }).map((_, i) => <li key={i}><Skeleton /></li>)
 *       : items.map((item) => <li key={item.id}><ProductCard product={item} /></li>)}
 *   </ul>
 * );
 * ```
 */
export function useContainerGrid({
  minItemWidth,
  gap = 16,
  minCols = 1,
  maxCols = Infinity,
}: UseContainerGridOptions): UseContainerGridResult {
  const containerRef = useRef<HTMLElement>(null);
  const [cols, setCols] = useState(minCols);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = (width: number) => {
      const raw = Math.floor((width + gap) / (minItemWidth + gap));
      const clamped = Math.min(
        maxCols === Infinity ? raw : maxCols,
        Math.max(minCols, raw),
      );
      setCols(clamped);
    };

    const ro = new ResizeObserver(([entry]) => {
      if (entry) compute(entry.contentRect.width);
    });
    ro.observe(el);
    compute(el.getBoundingClientRect().width);

    return () => ro.disconnect();
  }, [minItemWidth, gap, minCols, maxCols]);

  return { containerRef, cols };
}
