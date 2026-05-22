"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { BulkActionBar, Button, ConfirmDeleteModal, FilterChipGroup, ListingToolbar, Pagination, ListingViewShell, RowActionMenu } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_AUCTION_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../../constants";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { DataTable } from "../../admin/components/DataTable";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "endsAt";
const SORT_OPTIONS = [
  { value: "endsAt", label: "Ending soon" },
  { value: "-endsAt", label: "Ending latest" },
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
];
const STATUS_OPTIONS = SELLER_AUCTION_STATUS_TABS;

interface SellerAuctionsResponse {
  auctions?: unknown[];
  meta?: { total: number };
}

export interface SellerAuctionsViewProps extends ListingViewShellProps {
  renderHeader?: (onAdd: () => void) => React.ReactNode;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function SellerAuctionsView({ renderHeader, children, onEditClick, onDelete, onBulkDelete, ...props }: SellerAuctionsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { q: "", sort: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const statusRaw = table.get("status");
  const filters = statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerAuctionsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["seller", "auctions", "listing"],
    endpoint: SELLER_ENDPOINTS.AUCTIONS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.auctions).map((item, index) => ({
        id: toStringValue(item.id, `auction-${index}`),
        primary: toStringValue(item.productTitle ?? item.title, "Untitled auction"),
        secondary: [
          `Reserve: ${toRupees(item.reservePrice)}`,
          `Bids: ${item.bidCount ?? 0}`,
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.endsAt ?? item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  const bulkActions: BulkActionItem[] = onBulkDelete
    ? [{
        id: "bulk-delete",
        label: ACTIONS.STORE["delete-listing"].label,
        variant: "danger" as const,
        onClick: async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); },
      }]
    : [];

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      if (onDelete) await onDelete(id);
      else await fetch(`/api/store/products/${id}`, { method: "DELETE", credentials: "include" });
    } finally { setDeletingId(null); setDeleteTargetId(null); }
  }, [onDelete]);

  const handleEdit = useCallback((id: string) => {
    if (onEditClick) onEditClick(id);
    else window.location.href = String(ROUTES.STORE.PRODUCTS_EDIT(id));
  }, [onEditClick]);

  if (hasChildren) {
    return <ListingViewShell portal="seller" {...props}>{children}</ListingViewShell>;
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search auctions by product name"
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

      {selection.selectedCount > 0 && bulkActions.length > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        )}
        {view === "table" ? (
          <DataTable
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No auctions found"
            selectedIds={selection.selectedIdSet}
            onToggleSelect={(id) => selection.toggle(id)}
            onToggleSelectAll={() => selection.toggleAll()}
            renderRowActions={(row) => (
              <RowActionMenu
                actions={[
                  { label: ACTIONS.STORE["edit-listing"].label, onClick: () => handleEdit(row.id) },
                  { label: ACTIONS.STORE["delete-listing"].label, destructive: true, onClick: () => setDeleteTargetId(row.id), disabled: deletingId === row.id },
                ]}
              />
            )}
          />
        ) : (
          <AdminViewCards rows={rows} view={view} isLoading={isLoading} emptyLabel="No auctions found" onRowClick={undefined} selectedIdSet={selection.selectedIdSet} onToggleSelect={selection.toggle} />
        )}
      </div>

      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">Clear all</button>
                )}
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <FilterChipGroup
                label="Status"
                tabs={STATUS_OPTIONS}
                value={pendingFilters.status ?? ""}
                onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
              />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]">
                Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}

      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Auction"
          message="Are you sure you want to delete this auction? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </div>
  );
}
