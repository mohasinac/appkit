"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, FilterChipGroup, ListingToolbar, Pagination, ListingLayout, ConfirmDeleteModal, RowActionMenu, useToast, ListingFilterDrawer} from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BID_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";
import { useBottomActions } from "../../layout";

const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-bidTime";
const SORT_OPTIONS = [
  { value: "-bidTime", label: "Newest" },
  { value: "bidTime", label: "Oldest" },
  { value: "-amount", label: "Highest amount" },
];
const STATUS_OPTIONS = ADMIN_BID_STATUS_TABS;

interface AdminBidsResponse {
  items?: unknown[];
  total?: number;
}

interface BidRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminBidsViewProps extends ListingLayoutProps {}

export function AdminBidsView({ children, ...props }: AdminBidsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BidRow | null>(null);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminBidsResponse, BidRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "bids", "listing"],
    endpoint: ADMIN_ENDPOINTS.BIDS,
    buildFilters: (state) => {
      const statusRaw = state.status;
      return statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
    },
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `bid-${index}`),
        primary: [
          toStringValue(item.productName ?? item.productTitle, "Unknown item"),
          toRupees(item.amount),
        ].join(" · "),
        secondary: toStringValue(item.bidderId ?? item.bidderName ?? item.userId, "Unknown bidder"),
        status: toStringValue(item.status, "active"),
        updatedAt: toRelativeDate(item.bidTime ?? item.bidDate ?? item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bidId: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.BID_BY_ID(bidId), { status: "cancelled" });
    },
    onSuccess: () => {
      showToast("Bid cancelled.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "bids"] });
      setCancelOpen(false);
      setSelectedRow(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to cancel bid.", "error");
    },
  });

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search bids, products, or bidder IDs"
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

        <BulkActionBar
          selectedCount={selection.selectedCount}
          onClearSelection={selection.clearSelection}
          actions={([
            { id: ROW_ACTION_ID.CANCEL, label: ACTIONS.ADMIN["cancel-bid"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[])}
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
            emptyLabel="No bids found"
            renderRowActions={(row) => {
              const bidRow = row as BidRow;
              const isCancelled = bidRow.status === "cancelled" || bidRow.status === "voided";
              useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
            { id: ROW_ACTION_ID.CANCEL, label: ACTIONS.ADMIN["cancel-bid"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[]) } } : {});

  return (
                <RowActionMenu
                  actions={[
                    {
                      label: ROW_ACTION_META[ROW_ACTION_ID.CANCEL].label,
                      destructive: ROW_ACTION_META[ROW_ACTION_ID.CANCEL].destructive,
                      disabled: isCancelled,
                      onClick: () => {
                        setSelectedRow(bidRow);
                        setCancelOpen(true);
                      },
                    },
                  ]}
                />
              );
            }}
          />
        </div>

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
            label="Status"
            tabs={STATUS_OPTIONS}
            value={pendingFilters.status ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
          />
      </ListingFilterDrawer>
      </div>

      <ConfirmDeleteModal
        isOpen={cancelOpen}
        onClose={() => { setCancelOpen(false); setSelectedRow(null); }}
        onConfirm={() => { if (selectedRow) cancelMutation.mutate(selectedRow.id); }}
        isDeleting={cancelMutation.isPending}
        title="Cancel this bid?"
        message="This will mark the bid as cancelled and notify the bidder. The auction will continue with remaining active bids."
        confirmText="Cancel bid"
        variant="warning"
      />
    </>
  );
}
