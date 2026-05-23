"use client";

import React, { useState, useCallback } from "react";
import { BulkActionBar, FilterChipGroup, ListingToolbar, Pagination, ListingLayout, useToast, ListingFilterDrawer} from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { apiClient } from "../../../http";
import { QuickEditMenu } from "./QuickEditMenu";
import { AdminViewCards } from "./AdminViewCards";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_ORDER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminOrderEditorView } from "./AdminOrderEditorView";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
];
const STATUS_OPTIONS = ADMIN_ORDER_STATUS_TABS;

interface AdminOrdersResponse {
  orders?: unknown[];
  meta?: { total?: number };
}

interface OrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminOrdersViewProps extends ListingLayoutProps {}

export function AdminOrdersView({ children, ...props }: AdminOrdersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const { showToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<OrderRow | null>(null);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection, defaultSort,
  } = useAdminListing<AdminOrdersResponse, OrderRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "orders", "listing"],
    endpoint: ADMIN_ENDPOINTS.ORDERS,
    mapRows: (response) =>
      toRecordArray(response.orders).map((item, index) => ({
        id: toStringValue(item.id, `order-${index}`),
        primary: `Order ${toStringValue(item.orderNumber ?? item.id, "-")}`,
        secondary: [
          toStringValue(item.buyerName ?? item.customerName, "Unknown buyer"),
          toRupees(item.totalAmount ?? item.total ?? item.amount),
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: (f) => {
      return f.status && f.status !== "All" ? `status==${f.status}` : undefined;
    },
  });

  const handleQuickStatus = useCallback(async (id: string, status: string) => {
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(id), { status });
      showToast("Order status updated.", "success");
    } catch (err) {
      showToast((err as Error)?.message ?? "Failed to update order.", "error");
      throw err;
    }
  }, [showToast]);

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
            { id: "mark-shipped", label: ACTIONS.ADMIN["mark-shipped"].label, variant: "secondary", onClick: () => { for (const id of selection.selectedIds) void handleQuickStatus(id, "SHIPPED"); selection.clearSelection(); } },
            { id: "mark-delivered", label: ACTIONS.ADMIN["mark-delivered"].label, variant: "primary", onClick: () => { for (const id of selection.selectedIds) void handleQuickStatus(id, "DELIVERED"); selection.clearSelection(); } },
            { id: "mark-cancelled", label: ACTIONS.ADMIN["cancel-order"].label, variant: "danger", onClick: () => { for (const id of selection.selectedIds) void handleQuickStatus(id, "CANCELLED"); selection.clearSelection(); } },
          ] satisfies BulkActionItem[]) } } : {});

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search orders, buyers, or tracking IDs"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || defaultSort}
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
            { id: "mark-shipped", label: ACTIONS.ADMIN["mark-shipped"].label, variant: "secondary", onClick: () => { for (const id of selection.selectedIds) void handleQuickStatus(id, "SHIPPED"); selection.clearSelection(); } },
            { id: "mark-delivered", label: ACTIONS.ADMIN["mark-delivered"].label, variant: "primary", onClick: () => { for (const id of selection.selectedIds) void handleQuickStatus(id, "DELIVERED"); selection.clearSelection(); } },
            { id: "mark-cancelled", label: ACTIONS.ADMIN["cancel-order"].label, variant: "danger", onClick: () => { for (const id of selection.selectedIds) void handleQuickStatus(id, "CANCELLED"); selection.clearSelection(); } },
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
          {view === "table" ? (
            <DataTable
              rows={rows}
              isLoading={isLoading}
              emptyLabel="No orders found"
              selectedIds={selection.selectedIdSet}
              onToggleSelect={selection.toggle}
              onToggleSelectAll={(next) => next ? selection.setSelectedIds(rows.map(r => r.id)) : selection.clearSelection()}
              renderRowActions={(row) => (
                <QuickEditMenu
                  actions={[
                    {
                      label: "View full details",
                      onClick: () => { setSelectedRow(row as OrderRow); setDrawerOpen(true); },
                    },
                    {
                      label: "Update status",
                      separator: true,
                      formTitle: "Update Order Status",
                      fields: [
                        { name: "status", label: "Status", type: "select", required: true,
                          options: STATUS_OPTIONS.filter((t) => t.id !== "All").map((t) => ({ value: t.id, label: t.label })) },
                      ],
                      defaultValues: { status: (row as OrderRow).status },
                      onSubmit: (vals) => handleQuickStatus(row.id, String(vals.status ?? "")),
                      submitLabel: "Update",
                    },
                  ]}
                />
              )}
            />
          ) : (
            <AdminViewCards
              rows={rows}
              view={view}
              isLoading={isLoading}
              emptyLabel="No orders found"
              onRowClick={(row) => { setSelectedRow(row as OrderRow); setDrawerOpen(true); }}
              selectedIdSet={selection.selectedIdSet}
              onToggleSelect={selection.toggle}
            />
          )}
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

      <AdminOrderEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        orderId={selectedRow?.id}
        orderLabel={selectedRow?.primary}
        currentStatus={selectedRow?.status}
      />
    </>
  );
}
