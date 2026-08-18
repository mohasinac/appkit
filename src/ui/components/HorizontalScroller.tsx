"use client"
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type RefObject,
  type KeyboardEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  /** When the scroller reaches the last item, snap instantly back to the first instead of stopping. */
  loop?: boolean;
}

const BREAKPOINTS: [keyof PerViewConfig, number][] = [
  ["2xl", 1536],
  ["xl", 1280],
  ["lg", 1024],
  ["md", 768],
  ["sm", 640],
  ["xs", 480],
  ["base", 0],
];

function resolvePerView(
  perView: number | PerViewConfig,
  containerWidth: number,
): number {
  if (typeof perView === "number") return perView;
  for (const [key, minWidth] of BREAKPOINTS) {
    if (containerWidth >= minWidth && perView[key] !== undefined) {
      return perView[key] as number;
    }
  }
  return 1;
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
  pauseOnHover = false,
  itemClassName = "",
  loop = false,
}: HorizontalScrollerProps<T>) {
  const [itemWidth, setItemWidth] = useState<number | undefined>(undefined);
  const [colCount, setColCount] = useState<number>(typeof perView === "number" ? perView : 3);
  const [isPaused, setIsPaused] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (externalRef ??
    internalRef) as RefObject<HTMLDivElement>;
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  // Tracks the pending "restore smooth scrolling" rAF so a fast reset (autoScroll
  // firing again, or a manual arrow click) can't leave a stale callback that fires
  // after — and clobbers — a newer scroll-behavior change.
  const instantScrollRaf = useRef<number | undefined>(undefined);

  const normalizedItems = Array.isArray(items) ? items : [];
  const itemsMode = Array.isArray(items) && renderItem != null;
  const itemCount = normalizedItems.length;

  const gridMode = itemsMode && rows > 1;
  const gridCols = colCount > 0 ? colCount : 3;
  const gridCardsPerSlide = rows * gridCols;
  const gridSlideCount = gridMode
    ? Math.ceil(itemCount / gridCardsPerSlide)
    : 0;

  // Instantly jumps to a scroll position — used to wrap the loop back to the start
  // (or to the end, for prev-at-start) instead of layering a teleport on top of an
  // in-flight smooth scroll, which is what produced the old flicker/oscillation.
  // Cancels any previously-scheduled "restore smooth scrolling" rAF first so a
  // rapid-fire reset (autoScroll ticking again, or an arrow click) can't leave a
  // stale callback that fires later and clobbers a newer scroll-behavior change.
  const instantScrollTo = useCallback((el: HTMLDivElement, left: number) => {
    if (instantScrollRaf.current !== undefined) {
      cancelAnimationFrame(instantScrollRaf.current);
    }
    el.style.scrollBehavior = "auto";
    el.scrollLeft = left;
    instantScrollRaf.current = requestAnimationFrame(() => {
      el.style.scrollBehavior = "";
      instantScrollRaf.current = undefined;
    });
  }, []);

  // Cancel any pending rAF on unmount so it never fires against a detached node.
  useEffect(() => {
    return () => {
      if (instantScrollRaf.current !== undefined) {
        cancelAnimationFrame(instantScrollRaf.current);
      }
    };
  }, []);

  const scrollBy = useCallback(
    (direction: 1 | -1) => {
      const el = containerRef.current;
      if (!el) return;
      const width = el.clientWidth;
      const maxScroll = el.scrollWidth - width;
      if (loop && direction === 1 && el.scrollLeft >= maxScroll - 1) {
        instantScrollTo(el, 0);
        return;
      }
      if (loop && direction === -1 && el.scrollLeft <= 1) {
        instantScrollTo(el, maxScroll);
        return;
      }
      el.scrollBy({ left: direction * width * 0.8, behavior: "smooth" });
    },
    [containerRef, loop, instantScrollTo],
  );

  const updateExtents = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // 1px tolerance for sub-pixel rounding
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 1) {
      setAtStart(true);
      setAtEnd(true);
      return;
    }
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= maxScroll - 1);
  }, [containerRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollBy(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollBy(-1);
      }
    },
    [scrollBy],
  );

  useEffect(() => {
    if (!autoScroll || isPaused) return;
    autoScrollTimer.current = setInterval(() => {
      const el = containerRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const atRealEnd = maxScroll <= 1 || el.scrollLeft >= maxScroll - 1;
      if (atRealEnd) {
        if (loop) instantScrollTo(el, 0);
        return;
      }
      el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
    }, autoScrollInterval);
    return () => clearInterval(autoScrollTimer.current);
  }, [autoScroll, isPaused, autoScrollInterval, loop, instantScrollTo, containerRef]);

  useEffect(() => {
    if (!perView) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const count = resolvePerView(perView, w);
      if (count > 0) {
        setColCount(count);
        setItemWidth((w - (count - 1) * gap) / count);
      }
      updateExtents();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [perView, gap, containerRef, updateExtents]);

  // Recompute extents when content size changes (itemWidth resolved, items count changes).
  useEffect(() => {
    updateExtents();
  }, [updateExtents, itemWidth, itemCount]);

  const content = itemsMode ? (
    rows > 1 ? (
      // Grid mode: group items into slides of (rows × colCount) cards.
      Array.from({ length: gridSlideCount }, (_, slideIndex) => {
        const slideItems = normalizedItems.slice(
          slideIndex * gridCardsPerSlide,
          (slideIndex + 1) * gridCardsPerSlide,
        );
        return (
          <div
            key={`slide-${slideIndex}`}
            className="appkit-hscroller__slide"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: `${gap}px`,
              width: "100%",
              flexShrink: 0,
            }}
          >
            {slideItems.map((item, idx) => (
              <div
                key={keyExtractor ? keyExtractor(item, slideIndex * gridCardsPerSlide + idx) : slideIndex * gridCardsPerSlide + idx}
                className={[
                  "appkit-hscroller__item",
                  snapToItems ? "appkit-hscroller__item--snap" : "",
                  itemClassName,
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={minItemWidth ? { minWidth: minItemWidth } : undefined}
              >
                {renderItem(item, slideIndex * gridCardsPerSlide + idx)}
              </div>
            ))}
          </div>
        );
      })
    ) : (
      normalizedItems.map((item, i) => (
        <div
          key={keyExtractor ? keyExtractor(item, i) : i}
          className={[
            "appkit-hscroller__item",
            snapToItems ? "appkit-hscroller__item--snap" : "",
            itemClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            itemWidth !== undefined
              ? { width: itemWidth, flexShrink: 0 }
              : minItemWidth
              ? { minWidth: minItemWidth }
              : undefined
          }
        >
          {renderItem(item, i)}
        </div>
      ))
    )
  ) : (
    children
  );

  const hoverHandlers = pauseOnHover
    ? {
        onMouseEnter: () => setIsPaused(true),
        onMouseLeave: () => setIsPaused(false),
        onTouchStart: () => setIsPaused(true),
        onTouchEnd: () => setIsPaused(false),
        onTouchCancel: () => setIsPaused(false),
      }
    : {};

  const combinedOnScroll = () => {
    updateExtents();
    onScroll?.();
  };

  if (showArrows) {
    const prevDisabled = !loop && atStart;
    const nextDisabled = !loop && atEnd;
    const arrowsHidden = !loop && atStart && atEnd; // no scrollable overflow
    return (
      <div
        className={["appkit-hscroller appkit-hscroller--with-arrows", className]
          .filter(Boolean)
          .join(" ")}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        {...hoverHandlers}
        data-section="horizontalscroller-div-511"
      >
        {showFadeEdges && (
          <>
            <div className="appkit-hscroller__fade appkit-hscroller__fade--left" />
            <div className="appkit-hscroller__fade appkit-hscroller__fade--right" />
          </>
        )}
        {!arrowsHidden && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Previous"
          aria-disabled={prevDisabled || undefined}
          disabled={prevDisabled}
          className={`appkit-hscroller__arrow appkit-hscroller__arrow--prev appkit-hscroller__arrow--${arrowSize}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        )}
        <div
          ref={containerRef}
          onScroll={combinedOnScroll}
          className={scrollerCls(snapToItems, showScrollbar)}
          style={{ gap: `${gap}px`, paddingLeft: 36, paddingRight: 36 }}
          data-section="horizontalscroller-div-512"
        >
          {content}
        </div>
        {!arrowsHidden && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Next"
          aria-disabled={nextDisabled || undefined}
          disabled={nextDisabled}
          className={`appkit-hscroller__arrow appkit-hscroller__arrow--next appkit-hscroller__arrow--${arrowSize}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={["appkit-hscroller", className].filter(Boolean).join(" ")}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...hoverHandlers}
      data-section="horizontalscroller-div-513"
    >
      {showFadeEdges && (
        <>
          <div className="appkit-hscroller__fade appkit-hscroller__fade--left" />
          <div className="appkit-hscroller__fade appkit-hscroller__fade--right" />
        </>
      )}
      <div
        ref={containerRef}
        onScroll={combinedOnScroll}
        className={scrollerCls(snapToItems, showScrollbar)}
        style={{ gap: `${gap}px` }}
        data-section="horizontalscroller-div-514"
      >
        {content}
      </div>
    </div>
  );
}

function scrollerCls(snapToItems?: boolean, showScrollbar?: boolean) {
  return [
    "appkit-hscroller__track",
    snapToItems ? "appkit-hscroller__track--snap" : "",
    !showScrollbar ? "appkit-hscroller__track--no-scrollbar" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
