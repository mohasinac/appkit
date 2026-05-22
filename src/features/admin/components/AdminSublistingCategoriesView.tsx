"use client";

import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, ListingToolbar, Pagination } from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";

const PAGE_SIZE = 25;
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
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const resetAll = useCallback(() => {
    table.setMany({ q: "", sort: "" });
    setSearchInput("");
  }, [table]);

  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    SublistingCategoriesResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "sublisting-categories", "listing"],
    endpoint: ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    q: table.get("q") || undefined,
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
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows ?? [], keyExtractor: (r: { id: string }) => r.id });

  const bulkActions: BulkActionItem[] = [
    ...(onBulkDelete ? [{
      id: "bulk-delete",
      label: ACTIONS.ADMIN["delete-sublisting-category"].label,
      variant: "danger" as const,
      onClick: async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); },
    }] : []),
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
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
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
