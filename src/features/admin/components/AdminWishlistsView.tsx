"use client";

import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { ListingToolbar, Pagination, ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";

const PAGE_SIZE = 25;
const FILTER_KEYS: string[] = [];
const DEFAULT_SORT = "-addedAt";
const SORT_OPTIONS = [
  { value: "-addedAt", label: "Newest" },
  { value: "addedAt", label: "Oldest" },
];

export interface AdminWishlistsViewProps extends ListingViewShellProps {}

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

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");

  const resetAll = useCallback(() => {
    table.setMany({ q: "", sort: "" });
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminWishlistsResponse, WishlistRow>({
    queryKey: ["admin", "wishlists", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_WISHLISTS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `wish-${index}`),
        primary: toStringValue(item.productTitle ?? item.productId, "Unknown product"),
        secondary: [
          toStringValue(item.userId, ""),
          toRupees(item.priceAtAdd),
        ].filter(Boolean).join(" · "),
        status: "—",
        updatedAt: toRelativeDate(item.addedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={0}
        searchValue={searchInput}
        searchPlaceholder="Search by product or user ID"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
        hideViewToggle
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
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        )}
        <DataTable rows={rows} isLoading={isLoading} emptyLabel="No wishlist items found" />
      </div>
    </div>
  );
}
