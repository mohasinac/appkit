"use client"
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactElement,
  type ReactNode,
  type RefObject,
  cloneElement,
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
  itemClassName = "",
}: HorizontalScrollerProps<T>) {
  const [itemWidth, setItemWidth] = useState<number | undefined>(undefined);

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

  useEffect(() => {
    if (!perView) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const count = resolvePerView(perView, w);
      if (count > 0) {
        setItemWidth((w - (count - 1) * gap) / count);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [perView, gap, containerRef]);

  const normalizedItems = Array.isArray(items) ? items : [];
  const itemsMode = Array.isArray(items) && renderItem != null;

  const scrollerCls = [
    "appkit-hscroller__track",
    snapToItems ? "appkit-hscroller__track--snap" : "",
    !showScrollbar ? "appkit-hscroller__track--no-scrollbar" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = itemsMode ? (
    rows > 1 ? (
      // Grid mode: group items into slides with rows x cols
      // On mobile: 1 card centered, on larger screens: 2x3 grid
      normalizedItems.reduce<ReactNode[]>((slides, item, i) => {
        const cardsPerSlide = 6; // Always 6 cards per slide (2x3 grid)
        const slideIndex = Math.floor(i / cardsPerSlide);
        const itemInSlide = i % cardsPerSlide;
        const rowIndex = Math.floor(itemInSlide / 3);
        const colIndex = itemInSlide % 3;

        if (!slides[slideIndex]) {
          slides[slideIndex] = (
            <div
              key={`slide-${slideIndex}`}
              className="appkit-hscroller__slide grid grid-cols-1 sm:grid-cols-3 gap-4 place-items-center sm:place-items-start"
              style={{ gap: `${gap}px`, width: "100%", flexShrink: 0 }}
            >
              {Array.from({ length: 6 }, (_, idx) => (
                <div key={`placeholder-${idx}`} className="appkit-hscroller__item-placeholder w-full sm:w-auto" />
              ))}
            </div>
          );
        }

        // Replace placeholder with actual item
          const slideElement = slides[slideIndex] as ReactElement<{ children?: ReactNode[] }>;
          const gridIndex = rowIndex * 3 + colIndex;
          const childrenArr = (slideElement.props as { children?: ReactNode[] }).children ?? [];
          if (childrenArr[gridIndex]) {
            const newChildren = [...childrenArr];
            newChildren[gridIndex] = (
            <div
              key={keyExtractor ? keyExtractor(item, i) : i}
              className={[
                "appkit-hscroller__item",
                snapToItems ? "appkit-hscroller__item--snap" : "",
                itemClassName,
                "w-full sm:w-auto",
              ]
                .filter(Boolean)
                .join(" ")}
              style={minItemWidth ? { minWidth: minItemWidth } : undefined}
            >
              {renderItem(item, i)}
            </div>
          );
          slides[slideIndex] = cloneElement(slideElement as any, {
            children: newChildren,
          }) as ReactElement;
        }

        return slides;
      }, [])
    ) : (
      // Single row mode
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
  ) : children;

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
          <ChevronLeft className="w-4 h-4" />
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
          <ChevronRight className="w-4 h-4" />
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
