// appkit/src/ui/components/TabStrip.tsx
"use client";
import { useEffect } from "react";
import { useVisibleItems } from "../../react/hooks/useVisibleItems";
import { FLUID_GRID_MIN_WIDTHS } from "../../tokens";

export interface TabStripTab {
  key: string;
  label: string;
  badge?: number;
  disabled?: boolean;
}

export interface TabStripProps {
  tabs: TabStripTab[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Minimum width per tab in pixels (default: FLUID_GRID_MIN_WIDTHS.tabItem = 100) */
  minTabWidth?: number;
  className?: string;
}

/**
 * `TabStrip` — a horizontally scrollable tab bar that shows as many tabs as
 * fit the container width. Arrow buttons appear automatically when tabs overflow.
 * The active tab is always scrolled into the visible window.
 *
 * @example
 * ```tsx
 * <TabStrip
 *   tabs={[
 *     { key: "all", label: "All" },
 *     { key: "active", label: "Active", badge: 3 },
 *     { key: "archived", label: "Archived", disabled: true },
 *   ]}
 *   activeKey={activeTab}
 *   onChange={setActiveTab}
 * />
 * ```
 */
export function TabStrip({
  tabs,
  activeKey,
  onChange,
  minTabWidth = FLUID_GRID_MIN_WIDTHS.tabItem,
  className,
}: TabStripProps) {
  const {
    containerRef,
    visibleCount,
    hasOverflow,
    scrollLeft,
    scrollRight,
    setScrollOffset,
    scrollOffset,
    canScrollLeft,
    canScrollRight,
  } = useVisibleItems({
    total: tabs.length,
    minItemWidth: minTabWidth,
    gap: 0,
  });

  // Keep active tab scrolled into the visible window
  useEffect(() => {
    const idx = tabs.findIndex((t) => t.key === activeKey);
    if (idx < 0) return;
    if (idx < scrollOffset) {
      setScrollOffset(idx);
    } else if (idx >= scrollOffset + visibleCount) {
      setScrollOffset(idx - visibleCount + 1);
    }
  }, [activeKey, scrollOffset, visibleCount, tabs, setScrollOffset]);

  const visible = tabs.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      role="tablist"
      className={[
        "flex items-end border-b border-zinc-200 dark:border-zinc-700",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {hasOverflow && (
        <button
          type="button"
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          aria-label="Previous tabs"
          className="flex-none h-12 w-9 flex items-center justify-center text-zinc-500 disabled:opacity-30 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          ‹
        </button>
      )}

      {visible.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === activeKey}
          aria-disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.key)}
          style={{ minWidth: `${minTabWidth}px` }}
          className={[
            "flex-1 h-12 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
            tab.key === activeKey
              ? "border-primary-500 text-primary-600 dark:text-primary-400"
              : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            tab.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
          ]
            .join(" ")
            .trim()}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
              {tab.badge > 99 ? "99+" : tab.badge}
            </span>
          )}
        </button>
      ))}

      {hasOverflow && (
        <button
          type="button"
          onClick={scrollRight}
          disabled={!canScrollRight}
          aria-label="Next tabs"
          className="flex-none h-12 w-9 flex items-center justify-center text-zinc-500 disabled:opacity-30 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          ›
        </button>
      )}
    </div>
  );
}
