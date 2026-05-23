"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, FilterChipGroup, ListingToolbar, Pagination, ListingLayout, RowActionMenu, useToast, ListingFilterDrawer} from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { AdminViewCards } from "./AdminViewCards";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_STORE_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { apiClient } from "../../../http";
import { DataTable } from "./DataTable";
import { AdminStoreEditorView } from "./AdminStoreEditorView";
import { useBottomActions } from "../../layout";

const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "storeName", label: "Name A–Z" },
];
const STATUS_OPTIONS = ADMIN_STORE_STATUS_TABS;

interface AdminStoresResponse {
  items?: unknown[];
  total?: number;
}

interface StoreRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminStoresViewProps extends ListingLayoutProps {}

export function AdminStoresView({ children, ...props }: AdminStoresViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const toast = useToast();
  const queryClient = useQueryClient();

  const listing = useAdminListing<AdminStoresResponse, StoreRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "stores", "listing"],
    endpoint: ADMIN_ENDPOINTS.STORES,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `store-${index}`),
        primary: toStringValue(item.storeName, "Unnamed store"),
        secondary: [
          toStringValue(item.storeSlug, "No slug"),
          toStringValue(item.ownerId, "No owner"),
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) => {
      const statusRaw = state.status;
      return statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
    },
  });

  const { view, setView, table, panel, searchInput, setSearchInput, commitSearch, filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters, pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll, rows, isLoading, errorMessage, currentPage, totalPages, selection } = listing;

  const verifyStore = useMutation({
    mutationFn: (storeId: string) =>
      apiClient.patch(ADMIN_ENDPOINTS.STORE_BY_ID(storeId), { isVerified: true }),
    onSuccess: () => {
      toast.showToast("Store verified.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "stores", "listing"] });
    },
    onError: () => { toast.showToast("Failed to verify store.", "error"); },
  });

  const suspendStore = useMutation({
    mutationFn: (storeId: string) =>
      apiClient.patch(ADMIN_ENDPOINTS.STORE_BY_ID(storeId), { storeStatus: "suspended" }),
    onSuccess: () => {
      toast.showToast("Store suspended.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "stores", "listing"] });
    },
    onError: () => { toast.showToast("Failed to suspend store.", "error"); },
  });

  const panelRow = panel.editId ? (rows.find((r) => r.id === panel.editId) ?? null) : null;

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
          searchPlaceholder="Search stores, slugs, or owner names"
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
            { id: "manage", label: ACTIONS.ADMIN["manage-store"].label, variant: "primary", onClick: () => { const id = selection.selectedIds[0]; if (id) panel.openEditPanel(id); selection.clearSelection(); } },
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
              emptyLabel="No stores found"
              selectedIds={selection.selectedIdSet}
              onToggleSelect={selection.toggle}
              onToggleSelectAll={(next) => next ? selection.setSelectedIds(rows.map(r => r.id)) : selection.clearSelection()}
              renderRowActions={(row) => {
                const sr = row as StoreRow;
                const isSuspended = sr.status?.toLowerCase() === "suspended";
                const isVerified = Boolean(sr._raw?.isVerified);
                useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
            { id: "manage", label: ACTIONS.ADMIN["manage-store"].label, variant: "primary", onClick: () => { const id = selection.selectedIds[0]; if (id) panel.openEditPanel(id); selection.clearSelection(); } },
          ] satisfies BulkActionItem[]) } } : {});

  return (
                  <RowActionMenu actions={[
                    {
                      label: ACTIONS.ADMIN["manage-store"].label,
                      onClick: () => panel.openEditPanel(sr.id),
                    },
                    {
                      label: ACTIONS.ADMIN["verify-store"].label,
                      onClick: () => verifyStore.mutate(sr.id),
                      disabled: isVerified || verifyStore.isPending,
                    },
                    {
                      label: ACTIONS.ADMIN["suspend-store"].label,
                      onClick: () => suspendStore.mutate(sr.id),
                      disabled: isSuspended || suspendStore.isPending,
                    },
                  ]} />
                );
              }}
            />
          ) : (
            <AdminViewCards
              rows={rows}
              view={view}
              isLoading={isLoading}
              emptyLabel="No stores found"
              onRowClick={(row) => panel.openEditPanel(row.id)}
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

      <AdminStoreEditorView
        open={panel.isEditOpen}
        onClose={panel.closePanel}
        storeId={panel.editId ?? undefined}
        storeName={panelRow?.primary}
        currentStatus={panelRow?.status?.toLowerCase()}
        currentIsVerified={Boolean(panelRow?._raw?.isVerified)}
        currentCapabilities={
          Array.isArray(panelRow?._raw?.capabilities)
            ? (panelRow!._raw!.capabilities as string[])
            : undefined
        }
      />
    </>
  );
}
