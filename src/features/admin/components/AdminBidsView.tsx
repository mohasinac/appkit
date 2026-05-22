"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, FilterChipGroup, ListingToolbar, Pagination, ListingViewShell, ConfirmDeleteModal, RowActionMenu, useToast } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BID_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;
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

export interface AdminBidsViewProps extends ListingViewShellProps {}

interface BidsFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function BidsFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: BidsFilterDrawerProps) {
  if (!filterOpen) return null;
  return (
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
  );
}

export function AdminBidsView({ children, ...props }: AdminBidsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BidRow | null>(null);

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

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminBidsResponse, BidRow>({
    queryKey: ["admin", "bids", "listing"],
    endpoint: ADMIN_ENDPOINTS.BIDS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
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

        <BidsFilterDrawer
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          activeFilterCount={activeFilterCount}
          clearFilters={clearFilters}
          pendingFilters={pendingFilters}
          setPendingFilters={setPendingFilters}
          applyFilters={applyFilters}
        />
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
