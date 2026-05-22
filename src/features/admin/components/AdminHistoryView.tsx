"use client";

/**
 * AdminHistoryView — read-only admin insights for the top-level `history` collection.
 * One row per user with item count + last visit. Mirrors AdminWishlistsView.
 */
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
const DEFAULT_SORT = "-updatedAt";
const SORT_OPTIONS = [
  { value: "-updatedAt", label: "Recently active" },
  { value: "-itemCount", label: "Largest first" },
];

export interface AdminHistoryViewProps extends ListingViewShellProps {}

interface AdminHistoryResponse {
  items?: unknown[];
  total?: number;
}

interface HistoryRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminHistoryView({ children, ...props }: AdminHistoryViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");

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

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminHistoryResponse, HistoryRow>({
    queryKey: ["admin", "history", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_HISTORY,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const itemCount = typeof item.itemCount === "number" ? item.itemCount : 0;
        const limit = typeof item.limit === "number" ? item.limit : 50;
        return {
          id: toStringValue(item.id, `hist-${index}`),
          primary: toStringValue(item.userId, "Unknown user"),
          secondary: `${itemCount} of ${limit} items`,
          status: itemCount >= limit ? "At cap" : itemCount >= limit - 5 ? "Near cap" : "OK",
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
        {view === "table" ? (
          <DataTable rows={rows} isLoading={isLoading} emptyLabel="No user history records found" />
        ) : (
          <AdminViewCards rows={rows} view={view} isLoading={isLoading} emptyLabel="No user history records found" onRowClick={undefined} selectedIdSet={selection.selectedIdSet} onToggleSelect={selection.toggle} />
        )}
      </div>
    </div>
  );
}
