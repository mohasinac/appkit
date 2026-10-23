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
import { CarouselNav } from "./CarouselNav";

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
  /**
   * "circle" (default) — small centered circular buttons.
   * "full-height" — a thin sliver spanning the whole track height, flush to
   * each edge. Easier to hit on tall / double-row grids (`rows > 1`).
   */
  arrowStyle?: "circle" | "full-height";
  showScrollbar?: boolean;
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
  /**
   * Render a `CarouselNav` position indicator below the rail.
   *
   * Opt-in rather than default: this is a visible layout change and the rail is
   * used on roughly every listing surface in the app. Pair it with
   * `showArrows={false}` — the in-flow nav carries its own arrows, so leaving
   * both on gives a surface two sets of controls that do the same thing.
   */
  showNav?: boolean;
  /** Names the nav group. Defaults to a generic label; pass the rail's subject. */
  navAriaLabel?: string;
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
  arrowStyle = "circle",
  showScrollbar,
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
  showNav = false,
  navAriaLabel,
}: HorizontalScrollerProps<T>) {
  const [itemWidth, setItemWidth] = useState<number | undefined>(undefined);
  const [colCount, setColCount] = useState<number>(typeof perView === "number" ? perView : 3);
  const [isPaused, setIsPaused] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  /*
   * Page position, for the optional `showNav` indicator.
   *
   * 🛑 Derived from scroll geometry, never stored as the source of truth: the
   * rail is a native scroller and a user can drag it to any offset, so an index
   * this component *decided* would disagree with where the content actually is
   * the first time someone swipes. One page = one viewport width, matching what
   * `scrollBy` already moves.
   */
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);

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
    const width = el.clientWidth;
    if (width > 0) {
      setPageCount(Math.max(1, Math.ceil(el.scrollWidth / width)));
      setPageIndex(Math.round(el.scrollLeft / width));
    }
    if (maxScroll <= 1) {
      setAtStart(true);
      setAtEnd(true);
      return;
    }
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= maxScroll - 1);
  }, [containerRef]);

  const goToPage = useCallback(
    (page: number) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTo({ left: page * el.clientWidth, behavior: "smooth" });
    },
    [containerRef],
  );

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
      /*
       * 🛑 Clamp the column count to how many items there actually ARE.
       *
       * `perView` says "four across at lg", and the width was divided by that
       * unconditionally — so a rail holding ONE item pinned it to 25% of the
       * row and left three empty columns. The nav also hides itself at
       * `pageCount <= 1`, so nothing filled or explained the gap: the live
       * "Events & Offers" section rendered one card against ~75% whitespace.
       *
       * Clamping makes a short rail lay its items out across the full width,
       * which is what every other grid in the app already does. A full rail is
       * unaffected — `min` is a no-op once itemCount >= perView.
       */
      const count = Math.min(resolvePerView(perView, w), Math.max(itemCount, 1));
      if (count > 0) {
        setColCount(count);
        setItemWidth((w - (count - 1) * gap) / count);
      }
      updateExtents();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [perView, gap, containerRef, updateExtents, itemCount]);

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

  // Pauses autoScroll for the duration of any user interaction — hover, touch,
  // keyboard focus (arrow-key nav), or an active wheel/drag scroll — so autoplay
  // never fights a scroll the user is in the middle of driving themselves.
  const interactionHandlers = pauseOnHover
    ? {
        onMouseEnter: () => setIsPaused(true),
        onMouseLeave: () => setIsPaused(false),
        onTouchStart: () => setIsPaused(true),
        onTouchEnd: () => setIsPaused(false),
        onTouchCancel: () => setIsPaused(false),
        onFocus: () => setIsPaused(true),
        onBlur: () => setIsPaused(false),
        onWheel: () => setIsPaused(true),
      }
    : {};

  const combinedOnScroll = () => {
    updateExtents();
    onScroll?.();
  };

  /*
   * The in-flow position indicator.
   *
   * 🛑 This is the fix for "no affordance on a phone", and it deliberately does
   * NOT un-hide the absolute arrows below 640px. Those are `display:none` there
   * for a documented reason — a 44px circle has nowhere to go over a
   * single-column card, and `--with-arrows` reserves 2 × 44px of wrapper gutter
   * to seat them, which on a narrow screen is width taken from the card itself.
   * An in-flow control needs no gutter and no breakpoint, so the affordance
   * exists at every width instead of appearing at one.
   *
   * No `progressMs`: a rail's autoScroll advances by 0.8 of a viewport rather
   * than one page, so a fill timed to the interval would not line up with the
   * segment it sits in. A position cue that is right beats a progress cue that
   * is approximately right.
   */
  const navNode =
    showNav && pageCount > 1 ? (
      <CarouselNav
        count={pageCount}
        index={pageIndex}
        onSelect={goToPage}
        onPrev={() => scrollBy(-1)}
        onNext={() => scrollBy(1)}
        tone="on-surface"
        atStart={atStart}
        atEnd={atEnd}
        loop={loop}
        paused={isPaused}
        ariaLabel={navAriaLabel ?? "Scroll position"}
        className="appkit-hscroller__nav"
      />
    ) : null;

  if (showArrows) {
    const prevDisabled = !loop && atStart;
    const nextDisabled = !loop && atEnd;
    const arrowsHidden = !loop && atStart && atEnd; // no scrollable overflow
    return (
      <div
        className={[
          "appkit-hscroller appkit-hscroller--with-arrows",
          `appkit-hscroller--arrow-${arrowSize}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        {...interactionHandlers}
        data-section="horizontalscroller-div-511"
      >
        {!arrowsHidden && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Previous"
          aria-disabled={prevDisabled || undefined}
          disabled={prevDisabled}
          className={`appkit-hscroller__arrow appkit-hscroller__arrow--prev appkit-hscroller__arrow--${arrowSize} ${arrowStyle === "full-height" ? "appkit-hscroller__arrow--full-height" : ""}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        )}
        <div
          ref={containerRef}
          onScroll={combinedOnScroll}
          className={scrollerCls(snapToItems, showScrollbar)}
          style={{ gap: `${gap}px` }}
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
          className={`appkit-hscroller__arrow appkit-hscroller__arrow--next appkit-hscroller__arrow--${arrowSize} ${arrowStyle === "full-height" ? "appkit-hscroller__arrow--full-height" : ""}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        )}
        {navNode}
      </div>
    );
  }

  return (
    <div
      className={["appkit-hscroller", className].filter(Boolean).join(" ")}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...interactionHandlers}
      data-section="horizontalscroller-div-513"
    >
      <div
        ref={containerRef}
        onScroll={combinedOnScroll}
        className={scrollerCls(snapToItems, showScrollbar)}
        style={{ gap: `${gap}px` }}
        data-section="horizontalscroller-div-514"
      >
        {content}
      </div>
      {navNode}
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
