"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { Badge, BulkActionBar, Div, FilterChipGroup, ListingToolbar, Pagination, Text, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { SELLER_BID_STATUS_TABS } from "../../admin/constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { DataTable } from "../../admin/components/DataTable";
import type { AdminTableColumn } from "../../admin/types";
import { useBottomActions } from "../../layout";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-bidDate";
const SORT_OPTIONS = [
  { value: "-bidDate", label: "Newest" },
  { value: "bidDate", label: "Oldest" },
  { value: "-bidAmount", label: "Highest Bid" },
  { value: "bidAmount", label: "Lowest Bid" },
];
const STATUS_OPTIONS = SELLER_BID_STATUS_TABS;
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  SELLER_BID_STATUS_TABS.map((t) => [t.id, t.label]),
);

const STATUS_BADGE: Record<string, "success" | "info" | "warning" | "danger" | "default"> = {
  active: "success",
  won: "info",
  outbid: "warning",
  lost: "default",
  cancelled: "danger",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BidRow {
  id: string;
  productTitle: string;
  productId: string;
  userName: string;
  bidAmount: number;
  status: string;
  bidDate: string;
}

interface SellerBidsResponse {
  bids?: unknown[];
  total?: number;
  auctions?: { id: string; title: string }[];
}

export interface SellerBidsViewProps {
  endpoint?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SellerBidsView({ endpoint = SELLER_ENDPOINTS.BIDS }: SellerBidsViewProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const { showToast } = useToast();
  const [view, setView] = useState<"grid" | "list" | "table">("table");

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

  const commitSearch = useCallback(() => { table.set("q", searchInput.trim()); }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const statusRaw = table.get("status");
  const filters = statusRaw ? `status==${statusRaw}` : undefined;
  const productIdFilter = table.get("productId") || undefined;

  const endpointWithProduct = productIdFilter
    ? `${endpoint}?productId=${encodeURIComponent(productIdFilter)}`
    : endpoint;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerBidsResponse,
    BidRow
  >({
    queryKey: ["seller", "bids", "listing"],
    endpoint: endpointWithProduct,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.bids).map((item, idx) => ({
        id: toStringValue(item.id, `bid-${idx}`),
        productTitle: toStringValue(item.productTitle, "Unknown auction"),
        productId: toStringValue(item.productId, ""),
        userName: toStringValue(item.userName, "—"),
        bidAmount: Number(item.bidAmount ?? 0),
        status: toStringValue(item.status, "active"),
        bidDate: toRelativeDate(item.bidDate ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns: AdminTableColumn<BidRow>[] = [
    {
      key: "productTitle",
      header: "Auction",
      render: (row) => (
        <div className="space-y-0.5">
          <Text className="font-medium text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">{row.productTitle}</Text>
          <Text className="text-xs text-zinc-400 dark:text-zinc-400 font-mono">{row.productId}</Text>
        </div>
      ),
    },
    {
      key: "userName",
      header: "Bidder",
      className: "w-36",
      render: (row) => <span className="text-sm text-zinc-700 dark:text-zinc-300">{row.userName}</span>,
    },
    {
      key: "bidAmount",
      header: "Bid",
      className: "w-28 text-right",
      render: (row) => (
        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {toRupees(row.bidAmount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-24",
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status] ?? "default"}>
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "bidDate",
      header: "Date",
      className: "w-28",
      render: (row) => <span className="text-xs text-zinc-500 dark:text-zinc-400">{row.bidDate}</span>,
    },
  ];

  const selection = useBulkSelection({ items: rows ?? [], keyExtractor: (r: { id: string }) => r.id });

  // S-STORE-4-B — group bids by productId (auction) with collapsible sections.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const groupedRows = React.useMemo(() => {
    const groups = new Map<string, { title: string; bids: BidRow[] }>();
    for (const row of rows ?? []) {
      const key = row.productId || row.productTitle;
      const g = groups.get(key) ?? { title: row.productTitle, bids: [] };
      g.bids.push(row);
      groups.set(key, g);
    }
    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }));
  }, [rows]);
  const toggleGroup = (id: string) =>
    setCollapsedGroups((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // S-STORE-4-B — bulk actions: cancel / retract.
  const bulkCancel = useCallback(async () => {
    if (!selection.selectedIds.length) return;
    try {
      const results = await Promise.all(
        selection.selectedIds.map((id) =>
          fetch(`/api/store/bids/${id}`, { method: "DELETE" }).then((r) => r.ok),
        ),
      );
      const failed = results.filter((ok) => !ok).length;
      if (failed > 0) {
        showToast(`${failed} bid(s) failed to cancel.`, "error");
      } else {
        showToast(`${results.length} bid(s) cancelled.`, "success");
      }
      selection.clearSelection();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cancel bids.", "error");
    }
  }, [selection, showToast]);

  const bulkActions: BulkActionItem[] = [
    { id: "cancel", label: ACTIONS.SELLER["cancel-bid"].label, onClick: () => void bulkCancel(), variant: "danger" },
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search by bidder name"
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

      {selection.selectedIds.length > 0 && (
        <div className="sticky z-20 px-3 sm:px-4 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700"
          style={{ top: "calc(var(--header-height, 0px) + 88px)" }}>
          <BulkActionBar
            selectedCount={selection.selectedIds.length}
            onClearSelection={selection.clearSelection}
            actions={bulkActions}
          />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-red-200 bg-error-surface dark:border-red-900/60 px-4 py-3 text-sm text-error">
            {errorMessage}
          </Div>
        )}
        {/* S-STORE-4-B — grouped-by-auction view; toggle off by passing ?grouped=0 */}
        {table.get("grouped") === "0" ? (
          <DataTable
            rows={rows}
            columns={columns}
            isLoading={isLoading}
            emptyLabel="No bids found for your auctions"
            selectedIds={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            onToggleSelectAll={() => selection.toggleAll()}
          />
        ) : (
          <div className="space-y-3">
            {groupedRows.length === 0 && !isLoading && (
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">No bids found for your auctions.</Text>
            )}
            {groupedRows.map((group) => {
              const collapsed = collapsedGroups.has(group.id);
  return (
                <Div
                  key={group.id}
                  className="rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[var(--appkit-color-text)] hover:bg-[var(--appkit-color-surface-raised)]"
                  >
                    <span className="truncate">
                      {group.title}{" "}
                      <span className="text-xs text-[var(--appkit-color-text-muted)] font-normal">
                        · {group.bids.length} bid{group.bids.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span aria-hidden className="text-[var(--appkit-color-text-muted)]">
                      {collapsed ? "▸" : "▾"}
                    </span>
                  </button>
                  {!collapsed && (
                    <div className="border-t border-[var(--appkit-color-border)]">
                      <DataTable
                        rows={group.bids}
                        columns={columns}
                        isLoading={false}
                        emptyLabel=""
                        selectedIds={selection.selectedIdSet}
                        onToggleSelect={selection.toggle}
                      />
                    </div>
                  )}
                </Div>
              );
            })}
          </div>
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
                  <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-rose-500 transition-colors">Clear all</button>
                )}
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <FilterChipGroup
                label="Bid Status"
                tabs={STATUS_OPTIONS}
                value={pendingFilters.status ?? ""}
                onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
                allId=""
              />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-[var(--appkit-color-primary)] py-2.5 text-sm font-semibold text-white transition-colors active:scale-[0.98]">
                Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
