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
  /** Infinite-loop mode: circular slot rendering with scroll teleport — no array cloning */
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
  // Prevents re-entrant teleports during the instantaneous scrollLeft reset
  const isJumping = useRef(false);
  // Prevents re-running the initial scroll-to-real-start on every itemWidth update
  const loopInitialized = useRef(false);

  const normalizedItems = Array.isArray(items) ? items : [];
  const itemsMode = Array.isArray(items) && renderItem != null;
  const itemCount = normalizedItems.length;

  // Number of clone slots on each side — fixed size, computed once from perView hint.
  // Using Math.min so tiny lists don't double-render more slots than they have items.
  const loopCloneCount =
    loop && itemsMode && itemCount > 0
      ? Math.min(itemCount, typeof perView === "number" ? perView : 3)
      : 0;

  // On first paint after itemWidth resolves, scroll to the first *real* item
  // (skipping the left clone slots that provide backward-wrap buffer).
  useEffect(() => {
    if (!loop || loopCloneCount === 0 || itemWidth === undefined) return;
    const el = containerRef.current;
    if (!el || loopInitialized.current) return;
    loopInitialized.current = true;
    el.style.scrollBehavior = "auto";
    el.scrollLeft = loopCloneCount * (itemWidth + gap);
    requestAnimationFrame(() => {
      el.style.scrollBehavior = "";
    });
  }, [loop, loopCloneCount, itemWidth, gap, containerRef]);

  // Circular teleporter: when scroll enters a clone zone, jump by exactly one
  // full cycle so the viewport content is unchanged but we're back in real territory.
  const handleScrollLoop = useCallback(() => {
    if (!loop || loopCloneCount === 0 || itemWidth === undefined) return;
    const el = containerRef.current;
    if (!el || isJumping.current) return;
    const stride = itemWidth + gap;
    const cycleWidth = itemCount * stride;
    // scrollLeft where real items start and end
    const realStart = loopCloneCount * stride;
    const realEnd = realStart + cycleWidth;

    if (el.scrollLeft < realStart - stride * 0.5) {
      // Entered left clone zone — jump forward one cycle
      isJumping.current = true;
      el.style.scrollBehavior = "auto";
      el.scrollLeft += cycleWidth;
      requestAnimationFrame(() => {
        isJumping.current = false;
        el.style.scrollBehavior = "";
      });
    } else if (el.scrollLeft > realEnd - el.clientWidth + stride * 0.5) {
      // Entered right clone zone — jump backward one cycle
      isJumping.current = true;
      el.style.scrollBehavior = "auto";
      el.scrollLeft -= cycleWidth;
      requestAnimationFrame(() => {
        isJumping.current = false;
        el.style.scrollBehavior = "";
      });
    }
  }, [loop, loopCloneCount, itemWidth, gap, itemCount, containerRef]);

  const scrollBy = useCallback(
    (direction: 1 | -1) => {
      const el = containerRef.current;
      if (!el) return;
      const width = el.clientWidth;
      el.scrollBy({ left: direction * width * 0.8, behavior: "smooth" });
    },
    [containerRef],
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
      // Always advance; handleScrollLoop teleports when clone zone is reached
      el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
    }, autoScrollInterval);
    return () => clearInterval(autoScrollTimer.current);
  }, [autoScroll, isPaused, autoScrollInterval, containerRef]);

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
      // Grid mode: group items into slides of (rows × colCount) cards
      (() => {
        const cols = colCount > 0 ? colCount : 3;
        const cardsPerSlide = rows * cols;
        const slideCount = Math.ceil(normalizedItems.length / cardsPerSlide);
        return Array.from({ length: slideCount }, (_, slideIndex) => {
          const slideItems = normalizedItems.slice(
            slideIndex * cardsPerSlide,
            (slideIndex + 1) * cardsPerSlide,
          );
          return (
            <div
              key={`slide-${slideIndex}`}
              className="appkit-hscroller__slide"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: `${gap}px`,
                width: "100%",
                flexShrink: 0,
              }}
            >
              {slideItems.map((item, idx) => (
                <div
                  key={keyExtractor ? keyExtractor(item, slideIndex * cardsPerSlide + idx) : slideIndex * cardsPerSlide + idx}
                  className={[
                    "appkit-hscroller__item",
                    snapToItems ? "appkit-hscroller__item--snap" : "",
                    itemClassName,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={minItemWidth ? { minWidth: minItemWidth } : undefined}
                >
                  {renderItem(item, slideIndex * cardsPerSlide + idx)}
                </div>
              ))}
            </div>
          );
        });
      })()
    ) : loop && itemCount > 0 ? (
      // Circular loop: fixed (itemCount + 2×loopCloneCount) DOM slots.
      // Each slot maps to a real item via modulo — no array cloning, no list growth.
      // Left slots  [0 .. loopCloneCount-1]              → tail of real list (left buffer)
      // Real slots  [loopCloneCount .. loopCloneCount+n-1] → items[0..n-1]
      // Right slots [loopCloneCount+n .. end]             → head of real list (right buffer)
      Array.from(
        { length: itemCount + 2 * loopCloneCount },
        (_, i) => {
          const realIndex =
            ((i - loopCloneCount) % itemCount + itemCount) % itemCount;
          const item = normalizedItems[realIndex];
          const isClone =
            i < loopCloneCount || i >= loopCloneCount + itemCount;
          return (
            <div
              key={`loop-slot-${i}`}
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
              aria-hidden={isClone ? true : undefined}
            >
              {renderItem(item, realIndex)}
            </div>
          );
        },
      )
    ) : (
      // Normal single row (no loop)
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
      }
    : {};

  const combinedOnScroll = () => {
    if (loop) handleScrollLoop();
    if (!loop) updateExtents();
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
