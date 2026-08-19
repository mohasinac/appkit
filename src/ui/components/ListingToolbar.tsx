"use client";
import React from "react";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Table2,
  RotateCcw,
  Square,
} from "lucide-react";
import { SortDropdown } from "./SortDropdown";
import { Div } from "./Div";
import { Span } from "./Typography";
import { StickyToolbar } from "./StickyToolbar";

const CLS_CLEAR_LINK = "text-xs text-zinc-400 hover:text-error text-[var(--appkit-color-text-muted)] transition-colors";
const CLS_CLEAR_ICON_BTN = "flex shrink-0 items-center justify-center rounded-lg border border-[var(--appkit-color-border)] p-1.5 sm:p-2 text-[var(--appkit-color-text-muted)] hover:bg-zinc-50 hover:bg-[var(--appkit-color-surface-elevated)] hover:text-error dark:hover:text-error transition-colors";

export interface ListingToolbarSortOption {
  value: string;
  label: string;
}

export interface ListingToolbarToggle {
  label: string;
  active: boolean;
  onChange: (next: boolean) => void;
}

export interface ListingToolbarLabels {
  search?: string;
  filters?: string;
  sort?: string;
  gridView?: string;
  listView?: string;
  tableView?: string;
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
  tableView: "Table view",
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

  /** Grid / list / table view toggle */
  view?: "grid" | "list" | "table";
  onViewChange?: (view: "grid" | "list" | "table") => void;
  hideViewToggle?: boolean;
  /** When true, adds a third Table button to the view toggle group (admin pages only). */
  showTableView?: boolean;

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

  /** Pill-style filter toggles rendered between view controls and extra */
  toggles?: ListingToolbarToggle[];

  /** Any extra action buttons placed after the view toggle */
  extra?: React.ReactNode;

  /** Overridable text labels for i18n */
  labels?: ListingToolbarLabels;

  className?: string;

  /**
   * Whether the toolbar can be collapsed to a thin re-expand strip, matching
   * the collapse affordance used by dashboard sections (`CollapsibleSection`).
   * Default `true` — every listing page gets this for free without needing
   * to opt in individually. The collapsed state is session-scoped and keyed
   * per-route (see `toolbarId`), so collapsing on one listing page doesn't
   * affect another.
   */
  dismissible?: boolean;
  /**
   * Storage key for the collapsed state. Defaults to the current pathname
   * so distinct listing pages never collide — only override when a single
   * route legitimately hosts more than one `ListingToolbar`.
   */
  toolbarId?: string;
  /** Accessible label for the collapse/expand control. Default "Toolbar". */
  collapseLabel?: string;
}

const VIEW_BTN_BASE =
  "p-1.5 sm:p-2 transition-colors";
const VIEW_BTN_ACTIVE =
  "bg-[var(--appkit-color-primary)] text-white";
const VIEW_BTN_INACTIVE =
  "text-[var(--appkit-color-text-muted)] hover:bg-zinc-50 hover:bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text-muted)]";

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
  showTableView = false,
  onResetAll,
  hasActiveState = false,
  bulkMode = false,
  bulkSelectedCount = 0,
  bulkTotalCount = 0,
  onBulkSelectAll,
  onBulkClear,
  toggles,
  extra,
  labels,
  className = "",
  dismissible = true,
  toolbarId,
  collapseLabel = "Toolbar",
}: ListingToolbarProps) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const pathname = usePathname();
  const resolvedToolbarId = toolbarId ?? `listing-toolbar${pathname ? `:${pathname}` : ""}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onSearchKeyDown) {
      onSearchKeyDown(e);
    } else if (e.key === "Enter") {
      onSearchCommit?.();
    }
  };

  const allSelected = bulkTotalCount > 0 && bulkSelectedCount === bulkTotalCount;

  return (
    <StickyToolbar
      dataTestId="listing-toolbar"
      offset="header"
      tone="translucent"
      border
      padding="none"
      z="above-toolbar"
      className={`py-3 px-3 sm:py-3.5 sm:px-4 shadow-sm ${className}`}
      dismissible={dismissible}
      id={resolvedToolbarId}
      label={collapseLabel}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">

        {/* Search row OR Bulk-select controls */}
        {bulkMode ? (
          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={onBulkSelectAll}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--appkit-color-border)] px-3 py-1.5 text-sm font-medium text-[var(--appkit-color-text-muted)] hover:bg-zinc-50 hover:bg-[var(--appkit-color-surface-elevated)] transition-colors"
            >
              {allSelected
                ? <CheckSquare className="h-4 w-4 text-[var(--appkit-color-primary)]" />
                : <Square className="h-4 w-4" />
              }
              {allSelected ? l.deselectAll : l.selectAll(bulkTotalCount)}
            </button>
            <Span size="sm" color="muted">
              {l.selected(bulkSelectedCount)}
            </Span>
            <button
              type="button"
              onClick={onBulkClear}
              className={CLS_CLEAR_LINK}
            >
              {l.clearSelection}
            </button>
          </div>
        ) : onSearchChange ? (
          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] min-w-0">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[var(--appkit-color-text)] placeholder-zinc-400 outline-none"
            />
            <button
              type="button"
              onClick={onSearchCommit}
              className="flex shrink-0 items-center justify-center px-2.5 py-2 text-zinc-400 hover:text-[var(--appkit-color-primary)] transition-colors"
              aria-label={l.search}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {/* Filters + Sort + View + Reset + Extra */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:shrink-0">

          {onFiltersClick && (
            <button
              type="button"
              onClick={onFiltersClick}
              className="relative flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--appkit-color-border)] px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-sm font-medium text-[var(--appkit-color-text-muted)] hover:bg-zinc-50 hover:bg-[var(--appkit-color-surface-elevated)] transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{l.filters}</span>
              {filterCount > 0 && (
                <Span weight="bold" className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--appkit-color-primary)] text-[10px] text-white">
                  {filterCount}
                </Span>
              )}
            </button>
          )}

          {sortOptions && sortValue !== undefined && onSortChange && (
            <Div className="flex items-center gap-1.5 text-[var(--appkit-color-text-muted)]">
              <Span size="xs" className="hidden md:inline whitespace-nowrap">{l.sort}</Span>
              <SortDropdown
                value={sortValue}
                onChange={onSortChange}
                options={sortOptions as any}
              />
            </Div>
          )}

          {!hideViewToggle && onViewChange && (
            <div className="flex items-center rounded-lg border border-[var(--appkit-color-border)] overflow-hidden">
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
              {showTableView && (
                <button
                  type="button"
                  onClick={() => onViewChange("table")}
                  aria-label={l.tableView}
                  className={`${VIEW_BTN_BASE} ${view === "table" ? VIEW_BTN_ACTIVE : VIEW_BTN_INACTIVE}`}
                >
                  <Table2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {onResetAll && hasActiveState && (
            <button
              type="button"
              onClick={onResetAll}
              aria-label={l.resetAll}
              title={l.resetAll}
              className={CLS_CLEAR_ICON_BTN}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {toggles && toggles.length > 0 && (
            <div className="flex items-center gap-1">
              {toggles.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  role="switch"
                  aria-checked={t.active}
                  onClick={() => t.onChange(!t.active)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
 t.active
 ? "border-transparent bg-[var(--appkit-color-primary)] text-white"
 : "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:bg-zinc-50 hover:bg-[var(--appkit-color-surface-elevated)]"
 }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {extra}
        </div>
      </div>
    </StickyToolbar>
  );
}
