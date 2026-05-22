"use client";

import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, ListingToolbar, Pagination, ListingViewShell } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";

const PAGE_SIZE = 25;
const FILTER_KEYS: string[] = [];
const DEFAULT_SORT = "-updatedAt";
const SORT_OPTIONS = [
  { value: "-updatedAt", label: "Recently updated" },
  { value: "-itemCount", label: "Largest first" },
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
  const [view, setView] = useState<"grid" | "list" | "table">("table");

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string, next: boolean) =>
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id); else s.delete(id);
      return s;
    });

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
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
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
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={(next) =>
            setSelectedIds(next ? new Set(rows.map((r) => r.id)) : new Set())
          }
        />
      </div>
    </div>
  );
}
