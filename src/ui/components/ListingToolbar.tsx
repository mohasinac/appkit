"use client";
import React from "react";
import {
  CheckSquare,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  RotateCcw,
  Square,
} from "lucide-react";
import { SortDropdown } from "./SortDropdown";

export interface ListingToolbarSortOption {
  value: string;
  label: string;
}

export interface ListingToolbarLabels {
  search?: string;
  filters?: string;
  sort?: string;
  gridView?: string;
  listView?: string;
  resetAll?: string;
  selectAll?: (total: number) => string;
  deselectAll?: string;
  selected?: (count: number) => string;
  clearSelection?: string;
}

const DEFAULT_LABELS = {
  search: "Search",
  filters: "Filters",
  sort: "Sort",
  gridView: "Grid view",
  listView: "List view",
  resetAll: "Reset all",
  selectAll: (total: number) => `Select All (${total})`,
  deselectAll: "Deselect All",
  selected: (count: number) => `${count} selected`,
  clearSelection: "Clear",
} satisfies Required<ListingToolbarLabels>;

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

  /** Reset all toolbar state to defaults */
  onResetAll?: () => void;
  hasActiveState?: boolean;

  /**
   * Bulk-selection mode.
   * When `true`, the search row is replaced by Select All / Clear controls.
   */
  bulkMode?: boolean;
  bulkSelectedCount?: number;
  bulkTotalCount?: number;
  onBulkSelectAll?: () => void;
  onBulkClear?: () => void;

  /** Any extra action buttons placed after the view toggle */
  extra?: React.ReactNode;

  /** Overridable text labels for i18n */
  labels?: ListingToolbarLabels;

  className?: string;
}

const VIEW_BTN_BASE =
  "p-1.5 sm:p-2 transition-colors";
const VIEW_BTN_ACTIVE =
  "bg-[var(--appkit-color-primary,theme(colors.violet.600))] text-white";
const VIEW_BTN_INACTIVE =
  "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-slate-800 dark:text-zinc-400";

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
  bulkMode = false,
  bulkSelectedCount = 0,
  bulkTotalCount = 0,
  onBulkSelectAll,
  onBulkClear,
  extra,
  labels,
  className = "",
}: ListingToolbarProps) {
  const l = { ...DEFAULT_LABELS, ...labels };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onSearchKeyDown) {
      onSearchKeyDown(e);
    } else if (e.key === "Enter") {
      onSearchCommit?.();
    }
  };

  const allSelected = bulkTotalCount > 0 && bulkSelectedCount === bulkTotalCount;

  return (
    <div
      className={`sticky top-[var(--header-height,0px)] z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2 px-3 sm:py-2.5 sm:px-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">

        {/* Search row OR Bulk-select controls */}
        {bulkMode ? (
          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={onBulkSelectAll}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
            >
              {allSelected
                ? <CheckSquare className="h-4 w-4 text-[var(--appkit-color-primary,theme(colors.violet.600))]" />
                : <Square className="h-4 w-4" />
              }
              {allSelected ? l.deselectAll : l.selectAll(bulkTotalCount)}
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {l.selected(bulkSelectedCount)}
            </span>
            <button
              type="button"
              onClick={onBulkClear}
              className="text-xs text-zinc-400 hover:text-rose-500 dark:text-zinc-500 transition-colors"
            >
              {l.clearSelection}
            </button>
          </div>
        ) : onSearchChange ? (
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
              className="flex shrink-0 items-center justify-center px-2.5 py-2 text-zinc-400 hover:text-[var(--appkit-color-primary,theme(colors.violet.600))] transition-colors"
              aria-label={l.search}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {/* Filters + Sort + View + Reset + Extra */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {onFiltersClick && (
            <button
              type="button"
              onClick={onFiltersClick}
              className="relative flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-slate-600 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{l.filters}</span>
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--appkit-color-primary,theme(colors.violet.600))] text-[10px] font-bold text-white">
                  {filterCount}
                </span>
              )}
            </button>
          )}

          {sortOptions && sortValue !== undefined && onSortChange && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="hidden md:inline whitespace-nowrap text-xs">{l.sort}</span>
              <SortDropdown
                value={sortValue}
                onChange={onSortChange}
                options={sortOptions as any}
              />
            </div>
          )}

          {!hideViewToggle && onViewChange && (
            <div className="flex items-center rounded-lg border border-zinc-300 dark:border-slate-600 overflow-hidden">
              <button
                type="button"
                onClick={() => onViewChange("grid")}
                aria-label={l.gridView}
                className={`${VIEW_BTN_BASE} ${view === "grid" ? VIEW_BTN_ACTIVE : VIEW_BTN_INACTIVE}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewChange("list")}
                aria-label={l.listView}
                className={`${VIEW_BTN_BASE} ${view === "list" ? VIEW_BTN_ACTIVE : VIEW_BTN_INACTIVE}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}

          {onResetAll && hasActiveState && (
            <button
              type="button"
              onClick={onResetAll}
              aria-label={l.resetAll}
              title={l.resetAll}
              className="flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 dark:border-slate-600 p-1.5 sm:p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-slate-800 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {extra}
        </div>
      </div>
    </div>
  );
}
