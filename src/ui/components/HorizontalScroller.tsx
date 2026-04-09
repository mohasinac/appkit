"use client";

import {
  useRef,
  useEffect,
  useCallback,
  type RefObject,
  type ReactNode,
} from "react";

export interface PerViewConfig {
  base?: number;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  "2xl"?: number;
}

export interface HorizontalScrollerProps<T = unknown> {
  children?: ReactNode;
  className?: string;
  gap?: number;
  snapToItems?: boolean;
  showArrows?: boolean;
  arrowSize?: "sm" | "md" | "lg";
  showScrollbar?: boolean;
  showFadeEdges?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: () => void;
  items?: T[];
  renderItem?: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  perView?: number | PerViewConfig;
  rows?: number;
  autoScroll?: boolean;
  autoScrollInterval?: number;
  minItemWidth?: number;
  pauseOnHover?: boolean;
  itemClassName?: string;
}

export function HorizontalScroller<T = unknown>({
  children,
  className = "",
  gap = 16,
  snapToItems,
  showArrows,
  arrowSize = "md",
  showScrollbar,
  showFadeEdges,
  scrollContainerRef: externalRef,
  onScroll,
  items,
  renderItem,
  keyExtractor,
  perView,
  rows = 1,
  autoScroll,
  autoScrollInterval = 3500,
  minItemWidth,
  itemClassName = "",
}: HorizontalScrollerProps<T>) {
  void perView;
  void rows;

  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (externalRef ??
    internalRef) as RefObject<HTMLDivElement>;
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  const scrollBy = useCallback(
    (direction: 1 | -1) => {
      const el = containerRef.current;
      if (!el) return;
      const width = el.clientWidth;
      el.scrollBy({ left: direction * width * 0.8, behavior: "smooth" });
    },
    [containerRef],
  );

  useEffect(() => {
    if (!autoScroll) return;
    autoScrollTimer.current = setInterval(
      () => scrollBy(1),
      autoScrollInterval,
    );
    return () => clearInterval(autoScrollTimer.current);
  }, [autoScroll, autoScrollInterval, scrollBy]);

  const itemsMode = items != null && renderItem != null;

  const arrowCls = {
    sm: "w-7 h-7 text-sm",
    md: "w-9 h-9 text-base",
    lg: "w-11 h-11 text-lg",
  }[arrowSize];

  const scrollerCls = [
    "flex h-full overflow-x-auto scroll-smooth",
    snapToItems ? "snap-x snap-mandatory" : "",
    showScrollbar ? "" : "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    "pb-1",
  ]
    .filter(Boolean)
    .join(" ");

  const content = itemsMode
    ? items.map((item, i) => (
        <div
          key={keyExtractor ? keyExtractor(item, i) : i}
          className={[
            snapToItems ? "snap-start flex-none" : "flex-none",
            itemClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          style={minItemWidth ? { minWidth: minItemWidth } : undefined}
        >
          {renderItem(item, i)}
        </div>
      ))
    : children;

  if (showArrows) {
    return (
      <div className={`relative ${className}`}>
        {showFadeEdges && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />
          </>
        )}
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Previous"
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 ${arrowCls} rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors`}
        >
          {"<"}
        </button>
        <div
          ref={containerRef}
          onScroll={onScroll}
          className={scrollerCls}
          style={{ gap: `${gap}px`, paddingLeft: 36, paddingRight: 36 }}
        >
          {content}
        </div>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Next"
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 ${arrowCls} rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors`}
        >
          {">"}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {showFadeEdges && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />
        </>
      )}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className={scrollerCls}
        style={{ gap: `${gap}px` }}
      >
        {content}
      </div>
    </div>
  );
}
