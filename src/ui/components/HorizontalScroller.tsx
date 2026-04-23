"use client"
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

  const normalizedItems = Array.isArray(items) ? items : [];
  const itemsMode = Array.isArray(items) && renderItem != null;

  const scrollerCls = [
    "appkit-hscroller__track",
    snapToItems ? "appkit-hscroller__track--snap" : "",
    !showScrollbar ? "appkit-hscroller__track--no-scrollbar" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = itemsMode
    ? normalizedItems.map((item, i) => (
        <div
          key={keyExtractor ? keyExtractor(item, i) : i}
          className={[
            "appkit-hscroller__item",
            snapToItems ? "appkit-hscroller__item--snap" : "",
            itemClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          style={minItemWidth ? { minWidth: minItemWidth } : undefined}
         data-section="horizontalscroller-div-510">
          {renderItem(item, i)}
        </div>
      ))
    : children;

  if (showArrows) {
    return (
      <div
        className={["appkit-hscroller appkit-hscroller--with-arrows", className]
          .filter(Boolean)
          .join(" ")}
       data-section="horizontalscroller-div-511">
        {showFadeEdges && (
          <>
            <div className="appkit-hscroller__fade appkit-hscroller__fade--left" />
            <div className="appkit-hscroller__fade appkit-hscroller__fade--right" />
          </>
        )}
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Previous"
          className={`appkit-hscroller__arrow appkit-hscroller__arrow--prev appkit-hscroller__arrow--${arrowSize}`}
        >
          {"<"}
        </button>
        <div
          ref={containerRef}
          onScroll={onScroll}
          className={scrollerCls}
          style={{ gap: `${gap}px`, paddingLeft: 36, paddingRight: 36 }}
         data-section="horizontalscroller-div-512">
          {content}
        </div>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Next"
          className={`appkit-hscroller__arrow appkit-hscroller__arrow--next appkit-hscroller__arrow--${arrowSize}`}
        >
          {">"}
        </button>
      </div>
    );
  }

  return (
    <div className={["appkit-hscroller", className].filter(Boolean).join(" ")} data-section="horizontalscroller-div-513">
      {showFadeEdges && (
        <>
          <div className="appkit-hscroller__fade appkit-hscroller__fade--left" />
          <div className="appkit-hscroller__fade appkit-hscroller__fade--right" />
        </>
      )}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className={scrollerCls}
        style={{ gap: `${gap}px` }}
       data-section="horizontalscroller-div-514">
        {content}
      </div>
    </div>
  );
}
