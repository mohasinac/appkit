// appkit/src/ui/components/TabStrip.tsx
"use client";
import "client-only";
import React, { useEffect } from "react";
import { Span } from "./Typography";
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
      className={["appkit-tab-strip", className ?? ""].join(" ").trim()}
    >
      {hasOverflow && (
        <button
          type="button"
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          aria-label="Previous tabs"
          className="appkit-tab-strip__arrow"
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
            "appkit-tab-strip__tab",
            tab.key === activeKey
              ? "appkit-tab-strip__tab--active"
              : "appkit-tab-strip__tab--inactive",
            tab.disabled
              ? "appkit-tab-strip__tab--disabled"
              : "appkit-tab-strip__tab--enabled",
          ]
            .join(" ")
            .trim()}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <Span className="appkit-tab-strip__badge">
              {tab.badge > 99 ? "99+" : tab.badge}
            </Span>
          )}
        </button>
      ))}

      {hasOverflow && (
        <button
          type="button"
          onClick={scrollRight}
          disabled={!canScrollRight}
          aria-label="Next tabs"
          className="appkit-tab-strip__arrow"
        >
          ›
        </button>
      )}
    </div>
  );
}
