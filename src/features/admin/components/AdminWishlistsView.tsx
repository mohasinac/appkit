"use client";

import React from "react";
import { ListingToolbar, Pagination, ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
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
  { value: "-itemCount", label: "Largest first" },
];

export interface AdminWishlistsViewProps extends ListingLayoutProps {}

interface AdminWishlistsResponse {
  items?: unknown[];
  total?: number;
}

interface WishlistRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminWishlistsView({ children, ...props }: AdminWishlistsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages,
  } = useAdminListing<AdminWishlistsResponse, WishlistRow>({
    filterKeys: [],
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "wishlists", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_WISHLISTS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const itemCount = typeof item.itemCount === "number" ? item.itemCount : 0;
        const limit = typeof item.limit === "number" ? item.limit : 20;
        const isFull = item.isFull === true;
        return {
          id: toStringValue(item.id, `wish-${index}`),
          primary: toStringValue(item.userId, "Unknown user"),
          secondary: `${itemCount} item${itemCount === 1 ? "" : "s"} of ${limit}`,
          status: isFull ? "Full" : itemCount >= limit - 2 ? "Near cap" : "OK",
          updatedAt: toRelativeDate(item.updatedAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: () => undefined,
  });

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={0}
        searchValue={searchInput}
        searchPlaceholder="Search by user ID"
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
          emptyLabel="No user wishlists found"
        />
      </div>
    </div>
  );
}
