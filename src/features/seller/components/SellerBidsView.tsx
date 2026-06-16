"use client";
import { normalizeError } from "../../../errors/normalize";

import { Row, SIEVE_OP, Stack, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { Badge, BulkActionBar, Div, FilterChipGroup, ListingFilterDrawer, ListingToolbar, Pagination, Span, Text, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
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
  { value: sortBy("bidDate", "DESC"), label: "Newest" },
  { value: "bidDate", label: "Oldest" },
  { value: sortBy("bidAmount", "DESC"), label: "Highest Bid" },
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
  const filters = statusRaw ? sieveFilter("status", SIEVE_OP.EQ, statusRaw) : undefined;
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
        <Div className="space-y-0.5">
          <Text className="line-clamp-1" color="primary" size="sm" weight="medium">{row.productTitle}</Text>
          <Text className="font-mono" color="faint" size="xs">{row.productId}</Text>
        </Div>
      ),
    },
    {
      key: "userName",
      header: "Bidder",
      className: "w-36",
      render: (row) => <Span size="sm" color="muted">{row.userName}</Span>,
    },
    {
      key: "bidAmount",
      header: "Bid",
      className: "w-28 text-right",
      render: (row) => (
        <Span size="sm" weight="semibold" color="primary">
          {toRupees(row.bidAmount)}
        </Span>
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
      render: (row) => <Span size="xs" color="muted">{row.bidDate}</Span>,
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
      void normalizeError(err);
      showToast(err instanceof Error ? err.message : "Failed to cancel bids.", "error");
    }
  }, [selection, showToast]);

  const bulkActions: BulkActionItem[] = [
    buildBulkAction(ACTIONS.SELLER["cancel-bid"], () => void bulkCancel()),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  return (
    <Div className="min-h-screen">
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
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 backdrop-blur-sm border-b border-zinc-200 py-1.5" surface="default" padding="x-sm" justify="center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </Row>
      )}

      {selection.selectedIds.length > 0 && (
        <Div className="sticky z-20 px-3 sm:px-4 backdrop-blur-sm border-b border-zinc-200" surface="default" padding="y-xs"
          // audit-inline-style-ok: sticky header offset
          style={{ top: "calc(var(--header-height, 0px) + 88px)" }}>
          <BulkActionBar
            selectedCount={selection.selectedIds.length}
            onClearSelection={selection.clearSelection}
            actions={bulkActions}
          />
        </Div>
      )}

      <Div className="px-3 sm:px-4" padding="y-md">
        {errorMessage && (
          <Div className="mb-4 border border-error/20 px-4 text-sm text-error" surface="danger-surface" padding="y-sm" rounded="xl">
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
          <Stack gap="3">
            {groupedRows.length === 0 && !isLoading && (
              <Text size="sm" color="muted">No bids found for your auctions.</Text>
            )}
            {groupedRows.map((group) => {
              const collapsed = collapsedGroups.has(group.id);
  return (
                <Div
                  key={group.id}
                  className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="lg"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[var(--appkit-color-text)] hover:bg-[var(--appkit-color-surface-raised)]"
                  >
                    <Span className="truncate">
                      {group.title}{" "}
                      <Span size="xs" weight="normal" className="text-[var(--appkit-color-text-muted)]">
                        · {group.bids.length} bid{group.bids.length === 1 ? "" : "s"}
                      </Span>
                    </Span>
                    <Span aria-hidden className="text-[var(--appkit-color-text-muted)]">
                      {collapsed ? "▸" : "▾"}
                    </Span>
                  </button>
                  {!collapsed && (
                    <Div className="border-t border-[var(--appkit-color-border)]">
                      <DataTable
                        rows={group.bids}
                        columns={columns}
                        isLoading={false}
                        emptyLabel=""
                        selectedIds={selection.selectedIdSet}
                        onToggleSelect={selection.toggle}
                      />
                    </Div>
                  )}
                </Div>
              );
            })}
          </Stack>
        )}
      </Div>

      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
          label="Bid Status"
          tabs={STATUS_OPTIONS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
          allId=""
        />
      </ListingFilterDrawer>
    </Div>
  );
}
