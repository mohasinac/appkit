"use client"
/**
 * ListingLayout
 *
 * Standard layout shell for ALL listing / table pages — public, seller, admin,
 * and user. Provides a sticky toolbar with search, sort, view-toggle, filter
 * sidebar (desktop), filter overlay (mobile), and bulk-action bar.
 *
 *  ┌------------------------------------------------------------------┐
 *  │ [headerSlot — PageHeader / Heading + subtitle]                  │
 *  ├------------------------------------------------------------------┤
 *  │ [statusTabsSlot — status filter tabs]                           │
 *  ├------------------------------------------------------------------┤
 *  │ STICKY ------------------------------------------------------- │
 *  │ [Filters] [searchSlot] [viewToggle] [sortSlot] [acts] [page]   │
 *  ├----------┬-------------------------------------------------------┤
 *  │ Filters  │  [activeFiltersSlot — chips]                         │
 *  │ (sidebar)│  [DataTable / ProductGrid / card list — children]    │
 *  └----------┴-------------------------------------------------------┘
 */

import { ReactNode, useState } from "react";
import { Aside, Nav } from "./Semantic";
import { Text, Span } from "./Typography";
import { Button } from "./Button";
import { Drawer } from "./Drawer";
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
  // -- Header --------------------------------------------------------------
  headerSlot?: ReactNode;

  // -- Status tabs ---------------------------------------------------------
  statusTabsSlot?: ReactNode;

  // -- Filter --------------------------------------------------------------
  filterContent?: ReactNode;
  filterActiveCount?: number;
  onFilterApply?: () => void;
  onFilterClear?: () => void;
  filterTitle?: string;

  // -- Active filters ------------------------------------------------------
  activeFiltersSlot?: ReactNode;

  // -- Toolbar slots --------------------------------------------------------
  searchSlot?: ReactNode;
  sortSlot?: ReactNode;
  viewToggleSlot?: ReactNode;
  actionsSlot?: ReactNode;

  // -- Bulk selection -------------------------------------------------------
  selectedCount?: number;
  onClearSelection?: () => void;
  bulkActionItems?: BulkActionItem[];

  // -- Result count ---------------------------------------------------------
  /** "Showing 1-24 of 128" or similar — rendered above content, below active filters. */
  resultCountSlot?: ReactNode;

  // -- Pagination -----------------------------------------------------------
  toolbarPaginationSlot?: ReactNode;
  paginationSlot?: ReactNode;

  // -- Content --------------------------------------------------------------
  children: ReactNode;

  // -- Options --------------------------------------------------------------
  /** When true, sticky toolbar sits at top-0 (inside overflow-y-auto container).
   *  When false, accounts for a top navbar above (top-14/top-[120px]). */
  isDashboard?: boolean;
  defaultSidebarOpen?: boolean;
  /** Count of filter changes staged but not yet committed. Shows in Apply button. */
  filterPendingCount?: number;
  className?: string;
  loading?: boolean;
  errorSlot?: ReactNode;

  // -- i18n labels ----------------------------------------------------------
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
  resultCountSlot,
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
  filterPendingCount,
  className = "",
  loading = false,
  errorSlot,
  labels,
}: ListingLayoutProps) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const hasFilter = Boolean(filterContent);
  const panelTitle = filterTitle ?? l.filtersTitle;

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
        <div className="appkit-listing-layout__status-tabs" data-section="listinglayout-div-539">
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
       data-section="listinglayout-div-540">
        {/* Desktop (lg+): single flex row */}
        <div className="appkit-listing-layout__toolbar-row appkit-listing-layout__toolbar-row--desktop" data-section="listinglayout-div-541">
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
            <div className="appkit-listing-layout__search" data-section="listinglayout-div-542">{searchSlot}</div>
          )}

          <div className="appkit-listing-layout__toolbar-actions" data-section="listinglayout-div-543">
            {sortSlot}
            {viewToggleSlot && (
              <div className="appkit-listing-layout__view-toggle-wrap" data-section="listinglayout-div-544">
                {viewToggleSlot}
              </div>
            )}
            {actionsSlot}
          </div>

          {toolbarPaginationSlot && (
            <div className="appkit-listing-layout__toolbar-pagination" data-section="listinglayout-div-545">
              {toolbarPaginationSlot}
            </div>
          )}
        </div>

        {/* Mobile/Tablet (< lg): two stacked rows */}
        <div className="appkit-listing-layout__toolbar-row appkit-listing-layout__toolbar-row--mobile" data-section="listinglayout-div-546">
          <div className="appkit-listing-layout__mobile-row-1" data-section="listinglayout-div-547">
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
              <div className="appkit-listing-layout__search" data-section="listinglayout-div-548">{searchSlot}</div>
            )}
          </div>

          {(sortSlot || viewToggleSlot || actionsSlot) && (
            <div className="appkit-listing-layout__mobile-row-2" data-section="listinglayout-div-549">
              <div className="appkit-listing-layout__mobile-row-2__inner" data-section="listinglayout-div-550">
                {sortSlot}
                {viewToggleSlot}
                {actionsSlot}
              </div>
            </div>
          )}
        </div>

        {/* Bulk action bar — desktop, inside toolbar */}
        {selectedCount > 0 && (
          <div className="appkit-listing-layout__bulk-bar" data-section="listinglayout-div-551">
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
      <div className="appkit-listing-layout__body" data-section="listinglayout-div-552">
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
            <div className="appkit-listing-layout__sidebar-panel" data-section="listinglayout-div-553">
              {/* Panel header */}
              <div className="appkit-listing-layout__sidebar-header" data-section="listinglayout-div-554">
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
              <div className="appkit-listing-layout__sidebar-facets" data-section="listinglayout-div-555">
                {filterContent}
              </div>

              {/* Apply button */}
              <div className="appkit-listing-layout__sidebar-footer" data-section="listinglayout-div-556">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full rounded-xl"
                  size="sm"
                  onClick={onFilterApply}
                >
                  {filterPendingCount != null && filterPendingCount > 0
                    ? `${l.applyFilters} (${filterPendingCount})`
                    : l.applyFilters}
                </Button>
              </div>
            </div>
          </Aside>
        )}

        {/* Main content */}
        <div className="appkit-listing-layout__content" data-section="listinglayout-div-557">
          {activeFiltersSlot}
          {resultCountSlot && (
            <div className="appkit-listing-layout__result-count" data-section="listinglayout-div-558">
              {resultCountSlot}
            </div>
          )}

          {errorSlot ? (
            errorSlot
          ) : (
            <>
              {children}
              {paginationSlot && (
                <div className="appkit-listing-layout__pagination" data-section="listinglayout-div-559">
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

      {/* Mobile filter drawer — slides up from bottom */}
      {hasFilter && (
        <Drawer
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          side="bottom"
          title={
            filterActiveCount > 0
              ? `${panelTitle} (${filterActiveCount})`
              : panelTitle
          }
          footer={
            <div className="appkit-listing-layout__mobile-overlay-footer" data-section="listinglayout-div-560">
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
                {filterPendingCount != null && filterPendingCount > 0
                  ? `${l.applyFilters} (${filterPendingCount})`
                  : l.applyFilters}
              </Button>
            </div>
          }
        >
          {filterContent}
        </Drawer>
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
