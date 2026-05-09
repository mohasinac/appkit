"use client";
import React from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, RotateCcw } from "lucide-react";
import { SortDropdown } from "./SortDropdown";

export interface ListingToolbarSortOption {
  value: string;
  label: string;
}

export interface ListingToolbarProps {
  /** Filter button */
  filterCount?: number;
  onFiltersClick?: () => void;

  /** Search */
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearchCommit?: () => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;

  /** Sort */
  sortValue?: string;
  sortOptions?: readonly ListingToolbarSortOption[];
  onSortChange?: (value: string) => void;

  /** Grid / list view toggle */
  view?: "grid" | "list";
  onViewChange?: (view: "grid" | "list") => void;
  hideViewToggle?: boolean;

  /** Reset all toolbar state to defaults — shown as icon button when provided */
  onResetAll?: () => void;
  /** Controls whether the reset icon is shown */
  hasActiveState?: boolean;

  /** Any extra action buttons placed after the view toggle */
  extra?: React.ReactNode;

  className?: string;
}

/**
 * Responsive two-row listing toolbar.
 * Mobile: search on its own row; filters/sort/view on second row.
 * Tablet+: single row.
 */
export function ListingToolbar({
  filterCount = 0,
  onFiltersClick,
  searchValue = "",
  searchPlaceholder = "Search…",
  onSearchChange,
  onSearchCommit,
  onSearchKeyDown,
  sortValue,
  sortOptions,
  onSortChange,
  view = "grid",
  onViewChange,
  hideViewToggle = false,
  onResetAll,
  hasActiveState = false,
  extra,
  className = "",
}: ListingToolbarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onSearchKeyDown) {
      onSearchKeyDown(e);
    } else if (e.key === "Enter") {
      onSearchCommit?.();
    }
  };

  return (
    <div
      className={`sticky top-[var(--header-height,0px)] z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2 px-3 sm:py-2.5 sm:px-4 ${className}`}
    >
      {/* ── Mobile: two rows; sm+: single row ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">

        {/* Row 1 (mobile) / main row (desktop): Search — full width on mobile */}
        {onSearchChange && (
          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900 min-w-0">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            <button
              type="button"
              onClick={onSearchCommit}
              className="flex shrink-0 items-center justify-center px-2.5 py-2 text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Row 2 (mobile) / right side (desktop): Filters + Sort + View + Extra */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Filters button */}
          {onFiltersClick && (
            <button
              type="button"
              onClick={onFiltersClick}
              className="relative flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-slate-600 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {filterCount}
                </span>
              )}
            </button>
          )}

          {/* Sort dropdown */}
          {sortOptions && sortValue !== undefined && onSortChange && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="hidden md:inline whitespace-nowrap text-xs">Sort</span>
              <SortDropdown
                value={sortValue}
                onChange={onSortChange}
                options={sortOptions as any}
              />
            </div>
          )}

          {/* Grid / list toggle */}
          {!hideViewToggle && onViewChange && (
            <div className="flex items-center rounded-lg border border-zinc-300 dark:border-slate-600 overflow-hidden">
              <button
                type="button"
                onClick={() => onViewChange("grid")}
                aria-label="Grid view"
                className={`p-1.5 sm:p-2 transition-colors ${
                  view === "grid"
                    ? "bg-primary text-white"
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-slate-800 dark:text-zinc-400"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewChange("list")}
                aria-label="List view"
                className={`p-1.5 sm:p-2 transition-colors ${
                  view === "list"
                    ? "bg-primary text-white"
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-slate-800 dark:text-zinc-400"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Reset all — instant, icon only */}
          {onResetAll && hasActiveState && (
            <button
              type="button"
              onClick={onResetAll}
              aria-label="Reset all filters"
              title="Reset all"
              className="flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 dark:border-slate-600 p-1.5 sm:p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-slate-800 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {/* Extra actions (e.g. Select button) */}
          {extra}
        </div>
      </div>
    </div>
  );
}
