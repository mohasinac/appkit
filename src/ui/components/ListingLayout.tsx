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
        "appkit-listing-layout",
        toolbarPaginationSlot
          ? selectedCount > 0
            ? "appkit-listing-layout--bulk-offset"
            : "appkit-listing-layout--page-offset"
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
        <div className="appkit-listing-layout__status-tabs">
          {statusTabsSlot}
        </div>
      )}

      {/* Sticky toolbar */}
      <div
        className={[
          "appkit-listing-layout__toolbar",
          isDashboard
            ? "appkit-listing-layout__toolbar--dashboard"
            : "appkit-listing-layout__toolbar--page",
        ].join(" ")}
      >
        {/* Desktop (lg+): single flex row */}
        <div className="appkit-listing-layout__toolbar-row appkit-listing-layout__toolbar-row--desktop">
          {hasFilter && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? l.hideFilters : l.showFilters}
              aria-expanded={sidebarOpen}
              className={[
                "appkit-listing-layout__filter-btn",
                sidebarOpen ? "appkit-listing-layout__filter-btn--active" : "",
              ].join(" ")}
            >
              <FilterIcon />
              {l.filtersTitle}
              {filterActiveCount > 0 && (
                <Span
                  className="appkit-listing-layout__filter-badge"
                  aria-label={l.filterActiveCount(filterActiveCount)}
                >
                  {filterActiveCount}
                </Span>
              )}
            </Button>
          )}

          {searchSlot && (
            <div className="appkit-listing-layout__search">{searchSlot}</div>
          )}

          <div className="appkit-listing-layout__toolbar-actions">
            {sortSlot}
            {viewToggleSlot && (
              <div className="appkit-listing-layout__view-toggle-wrap">
                {viewToggleSlot}
              </div>
            )}
            {actionsSlot}
          </div>

          {toolbarPaginationSlot && (
            <div className="appkit-listing-layout__toolbar-pagination">
              {toolbarPaginationSlot}
            </div>
          )}
        </div>

        {/* Mobile/Tablet (< lg): two stacked rows */}
        <div className="appkit-listing-layout__toolbar-row appkit-listing-layout__toolbar-row--mobile">
          <div className="appkit-listing-layout__mobile-row-1">
            {hasFilter && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileFilterOpen(true)}
                aria-label={l.filtersTitle}
                className={[
                  "appkit-listing-layout__filter-btn",
                  filterActiveCount > 0
                    ? "appkit-listing-layout__filter-btn--active"
                    : "",
                ].join(" ")}
              >
                <FilterIcon />
                {l.filtersTitle}
                {filterActiveCount > 0 && (
                  <Span
                    className="appkit-listing-layout__filter-badge"
                    aria-label={l.filterActiveCount(filterActiveCount)}
                  >
                    {filterActiveCount}
                  </Span>
                )}
              </Button>
            )}
            {searchSlot && (
              <div className="appkit-listing-layout__search">{searchSlot}</div>
            )}
          </div>

          {(sortSlot || viewToggleSlot || actionsSlot) && (
            <div className="appkit-listing-layout__mobile-row-2">
              <div className="appkit-listing-layout__mobile-row-2__inner">
                {sortSlot}
                {viewToggleSlot}
                {actionsSlot}
              </div>
            </div>
          )}
        </div>

        {/* Bulk action bar — desktop, inside toolbar */}
        {selectedCount > 0 && (
          <div className="appkit-listing-layout__bulk-bar">
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
      <div className="appkit-listing-layout__body">
        {/* Desktop filter sidebar */}
        {hasFilter && (
          <Aside
            aria-label={panelTitle}
            className={[
              "appkit-listing-layout__sidebar",
              isDashboard
                ? "appkit-listing-layout__sidebar--dashboard"
                : "appkit-listing-layout__sidebar--page",
              sidebarOpen
                ? "appkit-listing-layout__sidebar--open"
                : "appkit-listing-layout__sidebar--collapsed",
            ].join(" ")}
          >
            <div className="appkit-listing-layout__sidebar-panel">
              {/* Panel header */}
              <div className="appkit-listing-layout__sidebar-header">
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
              <div className="appkit-listing-layout__sidebar-facets">
                {filterContent}
              </div>

              {/* Apply button */}
              <div className="appkit-listing-layout__sidebar-footer">
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
        <div className="appkit-listing-layout__content">
          {activeFiltersSlot}

          {errorSlot ? (
            errorSlot
          ) : (
            <>
              {children}
              {paginationSlot && (
                <div className="appkit-listing-layout__pagination">
                  {paginationSlot}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile sticky pagination bar */}
      {toolbarPaginationSlot && (
        <Nav
          aria-label="Pagination"
          className={[
            "appkit-listing-layout__mobile-pagination",
            isDashboard
              ? "appkit-listing-layout__mobile-pagination--dashboard"
              : selectedCount > 0
                ? "appkit-listing-layout__mobile-pagination--bulk"
                : "appkit-listing-layout__mobile-pagination--default",
          ].join(" ")}
        >
          {toolbarPaginationSlot}
        </Nav>
      )}

      {/* Mobile fullscreen filter overlay */}
      {hasFilter && mobileFilterOpen && (
        <>
          <div
            className="appkit-listing-layout__mobile-overlay-backdrop"
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={mobileOverlayRef}
            className="appkit-listing-layout__mobile-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={panelTitle}
          >
            {/* Header */}
            <div className="appkit-listing-layout__mobile-overlay-header">
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
                className="appkit-listing-layout__close-btn"
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
            <div className="appkit-listing-layout__mobile-overlay-facets">
              {filterContent}
            </div>

            {/* Footer actions */}
            <div className="appkit-listing-layout__mobile-overlay-footer">
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
