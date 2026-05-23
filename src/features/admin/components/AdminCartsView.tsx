"use client";

import React from "react";
import { FilterChipGroup, ListingFilterDrawer, ListingToolbar, Pagination, ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_CART_OWNERSHIP_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";

const DEFAULT_SORT = "-updatedAt";
const SORT_OPTIONS = [
  { value: "-updatedAt", label: "Recently updated" },
  { value: "updatedAt", label: "Oldest" },
];
const TYPE_OPTIONS = ADMIN_CART_OWNERSHIP_TABS;

export interface AdminCartsViewProps extends ListingLayoutProps {}

interface AdminCartsResponse {
  items?: unknown[];
  total?: number;
}

interface CartRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminCartsView({ children, ...props }: AdminCartsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters,
    activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminCartsResponse, CartRow>({
    filterKeys: ["type"],
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "carts", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_CARTS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const isGuest = !item.userId;
        const itemCount = Array.isArray(item.items) ? (item.items as unknown[]).length : 0;
        const sessionShort = toStringValue(item.sessionId, "").slice(0, 8);
        return {
          id: toStringValue(item.id, `cart-${index}`),
          primary: isGuest
            ? `Guest · ${sessionShort || "—"}`
            : toStringValue(item.userId, `user-${index}`),
          secondary: `${itemCount} item${itemCount !== 1 ? "s" : ""}`,
          status: isGuest ? "Guest" : "Authenticated",
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const typeRaw = filterState.type;
      return typeRaw && typeRaw !== "All" ? `type==${typeRaw}` : undefined;
    },
  });

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search by user ID or session"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
            {errorMessage}
          </div>
        )}
        <DataTable
          rows={rows}
          isLoading={isLoading}
          emptyLabel="No carts found"
        />
      </div>

      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
<FilterChipGroup
                label="Type"
                tabs={TYPE_OPTIONS}
                value={pendingFilters.type ?? ""}
                onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
              />
      </ListingFilterDrawer>
    </div>
  );
}
