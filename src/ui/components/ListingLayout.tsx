"use client";

/**
 * ListingLayout
 *
 * Standard layout shell for ALL listing / table pages — public, seller, admin,
 * and user. Provides a sticky toolbar with search, sort, view-toggle, filter
 * sidebar (desktop), filter overlay (mobile), and bulk-action bar.
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │ [headerSlot — PageHeader / Heading + subtitle]                  │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ [statusTabsSlot — status filter tabs]                           │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ STICKY ─────────────────────────────────────────────────────── │
 *  │ [Filters] [searchSlot] [viewToggle] [sortSlot] [acts] [page]   │
 *  ├──────────┬───────────────────────────────────────────────────────┤
 *  │ Filters  │  [activeFiltersSlot — chips]                         │
 *  │ (sidebar)│  [DataTable / ProductGrid / card list — children]    │
 *  └──────────┴───────────────────────────────────────────────────────┘
 */

import { ReactNode, useState, useEffect, useRef } from "react";
import { Aside, Nav } from "./Semantic";
import { Text, Span } from "./Typography";
import { Button } from "./Button";
import { BulkActionBar } from "./BulkActionBar";
import type { BulkActionItem } from "./BulkActionBar";

export interface ListingLayoutLabels {
  filtersTitle?: string;
  clearAll?: string;
  applyFilters?: string;
  close?: string;
  showFilters?: string;
  hideFilters?: string;
  filterActiveCount?: (count: number) => string;
}

export interface ListingLayoutProps {
  // ── Header ──────────────────────────────────────────────────────────────
  headerSlot?: ReactNode;

  // ── Status tabs ─────────────────────────────────────────────────────────
  statusTabsSlot?: ReactNode;

  // ── Filter ──────────────────────────────────────────────────────────────
  filterContent?: ReactNode;
  filterActiveCount?: number;
  onFilterApply?: () => void;
  onFilterClear?: () => void;
  filterTitle?: string;

  // ── Active filters ──────────────────────────────────────────────────────
  activeFiltersSlot?: ReactNode;

  // ── Toolbar slots ────────────────────────────────────────────────────────
  searchSlot?: ReactNode;
  sortSlot?: ReactNode;
  viewToggleSlot?: ReactNode;
  actionsSlot?: ReactNode;

  // ── Bulk selection ───────────────────────────────────────────────────────
  selectedCount?: number;
  onClearSelection?: () => void;
  bulkActionItems?: BulkActionItem[];

  // ── Pagination ───────────────────────────────────────────────────────────
  toolbarPaginationSlot?: ReactNode;
  paginationSlot?: ReactNode;

  // ── Content ──────────────────────────────────────────────────────────────
  children: ReactNode;

  // ── Options ──────────────────────────────────────────────────────────────
  /** When true, sticky toolbar sits at top-0 (inside overflow-y-auto container).
   *  When false, accounts for a top navbar above (top-14/top-[120px]). */
  isDashboard?: boolean;
  defaultSidebarOpen?: boolean;
  className?: string;
  loading?: boolean;
  errorSlot?: ReactNode;

  // ── i18n labels ──────────────────────────────────────────────────────────
  labels?: ListingLayoutLabels;
}

const DEFAULT_LABELS: Required<ListingLayoutLabels> = {
  filtersTitle: "Filters",
  clearAll: "Clear all",
  applyFilters: "Apply filters",
  close: "Close",
  showFilters: "Show filters",
  hideFilters: "Hide filters",
  filterActiveCount: (count) => `${count} active`,
};

export function ListingLayout({
  headerSlot,
  statusTabsSlot,
  filterContent,
  filterActiveCount = 0,
  onFilterApply,
  onFilterClear,
  filterTitle,
  activeFiltersSlot,
  searchSlot,
  sortSlot,
  viewToggleSlot,
  actionsSlot,
  selectedCount = 0,
  onClearSelection,
  bulkActionItems,
  toolbarPaginationSlot,
  paginationSlot,
  children,
  isDashboard = false,
  defaultSidebarOpen = false,
  className = "",
  loading = false,
  errorSlot,
  labels,
}: ListingLayoutProps) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);

  const hasFilter = Boolean(filterContent);
  const panelTitle = filterTitle ?? l.filtersTitle;

  // Sticky offset: dashboard containers scroll internally (top-0);
  // public pages have a top navbar (top-14 / top-[120px]).
  const stickyTop = isDashboard ? "top-0" : "top-14 md:top-[120px]";
  const sidebarSticky = isDashboard ? "sticky top-16" : "sticky top-[176px]";

  // Close mobile overlay on Escape key
  useEffect(() => {
    if (!mobileFilterOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileFilterOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [mobileFilterOpen]);

  // Lock body scroll while mobile filter is open
  useEffect(() => {
    if (mobileFilterOpen) {
      const w = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${w}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [mobileFilterOpen]);

  const handleMobileApply = () => {
    onFilterApply?.();
    setMobileFilterOpen(false);
  };

  return (
    <div
      className={[
        "w-full space-y-4",
        toolbarPaginationSlot
          ? selectedCount > 0
            ? "pb-28 lg:pb-0"
            : "pb-12 lg:pb-0"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header */}
      {headerSlot}

      {/* Status tabs */}
      {statusTabsSlot && (
        <div className="overflow-x-auto touch-pan-x -mx-4 px-4 md:-mx-6 md:px-6">
          {statusTabsSlot}
        </div>
      )}

      {/* Sticky toolbar */}
      <div
        className={[
          "sticky z-20 -mx-4 px-4 md:-mx-6 md:px-6",
          stickyTop,
          "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md",
          "border-b border-zinc-200/70 dark:border-slate-800/70",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
          "py-2.5",
        ].join(" ")}
      >
        {/* Desktop (lg+): single flex row */}
        <div className="hidden lg:flex items-center gap-2 min-w-0">
          {hasFilter && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? l.hideFilters : l.showFilters}
              aria-expanded={sidebarOpen}
              className={[
                "hidden lg:flex flex-shrink-0 items-center gap-1.5",
                "rounded-full h-8 px-3 text-sm font-medium",
                "border transition-all duration-150",
                sidebarOpen
                  ? "bg-primary/10 border-primary/30 text-primary dark:bg-primary/15 dark:border-primary/40"
                  : "border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-slate-300 hover:border-zinc-300 dark:hover:border-slate-600 hover:bg-zinc-50 dark:hover:bg-slate-800/60",
              ].join(" ")}
            >
              <FilterIcon />
              {l.filtersTitle}
              {filterActiveCount > 0 && (
                <Span
                  className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-primary text-white"
                  aria-label={l.filterActiveCount(filterActiveCount)}
                >
                  {filterActiveCount}
                </Span>
              )}
            </Button>
          )}

          {searchSlot && <div className="flex-1 min-w-0">{searchSlot}</div>}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {sortSlot}
            {viewToggleSlot && (
              <div className="flex items-center gap-0.5 rounded-full border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
                {viewToggleSlot}
              </div>
            )}
            {actionsSlot}
          </div>

          {toolbarPaginationSlot && (
            <div className="ml-auto flex-shrink-0 pl-3 border-l border-zinc-200/70 dark:border-slate-700/70">
              {toolbarPaginationSlot}
            </div>
          )}
        </div>

        {/* Mobile/Tablet (< lg): two stacked rows */}
        <div className="flex flex-col gap-2 lg:hidden">
          <div className="flex items-center gap-2">
            {hasFilter && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileFilterOpen(true)}
                aria-label={l.filtersTitle}
                className={[
                  "flex-shrink-0 flex items-center gap-1.5",
                  "rounded-full h-9 px-3 text-sm font-medium",
                  "border border-zinc-200 dark:border-slate-700",
                  "text-zinc-600 dark:text-slate-300",
                  "hover:bg-zinc-50 dark:hover:bg-slate-800/60 transition-colors",
                  filterActiveCount > 0
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "",
                ].join(" ")}
              >
                <FilterIcon />
                {l.filtersTitle}
                {filterActiveCount > 0 && (
                  <Span
                    className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-primary text-white"
                    aria-label={l.filterActiveCount(filterActiveCount)}
                  >
                    {filterActiveCount}
                  </Span>
                )}
              </Button>
            )}
            {searchSlot && <div className="flex-1 min-w-0">{searchSlot}</div>}
          </div>

          {(sortSlot || viewToggleSlot || actionsSlot) && (
            <div className="flex items-stretch min-h-[44px] gap-2 overflow-x-auto">
              <div className="flex items-center gap-2 flex-shrink-0 pb-px">
                {sortSlot}
                {viewToggleSlot}
                {actionsSlot}
              </div>
            </div>
          )}
        </div>

        {/* Bulk action bar — desktop, inside toolbar */}
        {selectedCount > 0 && (
          <div className="hidden lg:block pt-2 mt-2 border-t border-zinc-100 dark:border-slate-800">
            <BulkActionBar
              selectedCount={selectedCount}
              onClearSelection={onClearSelection}
              actions={bulkActionItems}
              labels={{
                selected: l.filtersTitle, // placeholder — callers provide proper labels
                apply: l.applyFilters,
                clearSelection: l.clearAll,
              }}
            />
          </div>
        )}
      </div>

      {/* Sidebar + Content area */}
      <div className="flex gap-4 lg:gap-6 items-start">
        {/* Desktop filter sidebar */}
        {hasFilter && (
          <Aside
            aria-label={panelTitle}
            className={[
              "hidden lg:block flex-shrink-0 self-start",
              sidebarSticky,
              "transition-all duration-200 ease-in-out overflow-hidden",
              sidebarOpen
                ? "w-60 xl:w-64 2xl:w-72 opacity-100"
                : "w-0 opacity-0 pointer-events-none",
            ].join(" ")}
          >
            <div
              className={[
                "w-60 xl:w-64 2xl:w-72 rounded-2xl overflow-hidden",
                "border border-zinc-200/80 dark:border-slate-700/60",
                "bg-white dark:bg-slate-900",
                "shadow-sm",
              ].join(" ")}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-slate-800">
                <Text weight="semibold" size="sm">
                  {panelTitle}
                </Text>
                {filterActiveCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onFilterClear}
                    className="text-xs text-primary hover:text-primary/80 hover:underline p-0 h-auto leading-none font-medium"
                  >
                    {l.clearAll}
                  </Button>
                )}
              </div>

              {/* Scrollable facets */}
              <div className="px-3 pt-5 pb-3 max-h-[calc(100vh-15rem)] overflow-y-auto space-y-4">
                {filterContent}
              </div>

              {/* Apply button */}
              <div className="px-3 pb-3 pt-2 border-t border-zinc-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full rounded-xl"
                  size="sm"
                  onClick={onFilterApply}
                >
                  {l.applyFilters}
                </Button>
              </div>
            </div>
          </Aside>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-3">
          {activeFiltersSlot}

          {errorSlot ? (
            errorSlot
          ) : (
            <>
              {children}
              {paginationSlot && <div className="pt-2">{paginationSlot}</div>}
            </>
          )}
        </div>
      </div>

      {/* Mobile sticky pagination bar */}
      {toolbarPaginationSlot && (
        <Nav
          aria-label="Pagination"
          className={[
            "fixed left-0 right-0 lg:hidden",
            isDashboard
              ? "bottom-0"
              : selectedCount > 0
                ? "bottom-28"
                : "bottom-14",
            "z-[39]",
            "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-slate-800/80",
            "shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.20)]",
            "h-10 flex items-center justify-center px-3 overflow-x-auto pb-px",
          ].join(" ")}
        >
          {toolbarPaginationSlot}
        </Nav>
      )}

      {/* Mobile fullscreen filter overlay */}
      {hasFilter && mobileFilterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={mobileOverlayRef}
            className="fixed inset-0 z-50 flex flex-col lg:hidden bg-white dark:bg-slate-950"
            role="dialog"
            aria-modal="true"
            aria-label={panelTitle}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-slate-800 flex-shrink-0">
              <Text weight="semibold">
                {panelTitle}
                {filterActiveCount > 0 && (
                  <Span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-primary text-white">
                    {filterActiveCount}
                  </Span>
                )}
              </Text>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMobileFilterOpen(false)}
                aria-label={l.close}
                className="rounded-full w-8 h-8 p-0 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-slate-800"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>

            {/* Scrollable facets */}
            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-4">
              {filterContent}
            </div>

            {/* Footer actions */}
            <div className="flex-shrink-0 flex gap-3 px-4 py-4 border-t border-zinc-100 dark:border-slate-800 bg-white dark:bg-slate-950">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 rounded-xl"
                onClick={() => onFilterClear?.()}
              >
                {l.clearAll}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1 rounded-xl"
                onClick={handleMobileApply}
              >
                {l.applyFilters}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
      />
    </svg>
  );
}
