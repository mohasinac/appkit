"use client";

import React from "react";
import { BulkActionBar, ListingToolbar, Pagination } from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";

const DEFAULT_SORT = "name";
const SORT_OPTIONS = [
  { value: "name", label: "Name A–Z" },
  { value: "-name", label: "Name Z–A" },
  { value: "-productCount", label: "Most listings" },
  { value: "-createdAt", label: "Newest" },
];

interface SublistingCategoriesResponse {
  items?: unknown[];
  total?: number;
}

interface AdminSublistingCategoriesViewProps {
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function AdminSublistingCategoriesView({ onBulkDelete }: AdminSublistingCategoriesViewProps) {
  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<
    SublistingCategoriesResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    filterKeys: [],
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "sublisting-categories", "listing"],
    endpoint: ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `sc-${index}`),
        primary: toStringValue(item.name, "Untitled"),
        secondary: [
          item.itemCode ? `Code: ${item.itemCode}` : "",
          `${typeof item.productCount === "number" ? item.productCount : 0} listing${item.productCount === 1 ? "" : "s"}`,
        ]
          .filter(Boolean)
          .join(" · "),
        status: "",
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: () => undefined,
  });

  const bulkActions: BulkActionItem[] = [
    ...(onBulkDelete ? [buildBulkAction(ACTIONS.ADMIN["delete-sublisting-category"], async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); })] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  return (
    <div className="min-h-screen">
      <ListingToolbar
        searchValue={searchInput}
        searchPlaceholder="Search sub-listing categories…"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => {
          table.set("sort", v);
        }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {selection.selectedCount > 0 && bulkActions.length > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
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
          emptyLabel="No sub-listing categories found"
        />
      </div>
    </div>
  );
}
