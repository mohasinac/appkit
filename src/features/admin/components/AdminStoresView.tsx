"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, FilterChipGroup, ListingToolbar, Pagination, ListingViewShell, RowActionMenu, useToast } from "../../../ui";
import type { ListingViewShellProps, BulkActionItem } from "../../../ui";
import { AdminViewCards } from "./AdminViewCards";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_STORE_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { apiClient } from "../../../http";
import { DataTable } from "./DataTable";
import { AdminStoreEditorView } from "./AdminStoreEditorView";

const PAGE_SIZE = 25;
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

export interface AdminStoresViewProps extends ListingViewShellProps {}

interface StoresFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function StoresFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: StoresFilterDrawerProps) {
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

export function AdminStoresView({ children, ...props }: AdminStoresViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const toast = useToast();
  const queryClient = useQueryClient();

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const { openEditPanel, closePanel, isEditOpen, editId } = usePanelUrlSync();

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

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminStoresResponse, StoreRow>({
    queryKey: ["admin", "stores", "listing"],
    endpoint: ADMIN_ENDPOINTS.STORES,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const panelRow = editId ? (rows.find((r) => r.id === editId) ?? null) : null;
  const selection = useBulkSelection({ items: rows, keyExtractor: (r) => r.id });

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
            { id: "manage", label: ACTIONS.ADMIN["manage-store"].label, variant: "primary", onClick: () => { const id = selection.selectedIds[0]; if (id) openEditPanel(id); selection.clearSelection(); } },
          ] satisfies BulkActionItem[])}
        />

        {totalPages > 1 && (
          <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
          </div>
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
              emptyLabel="No stores found"
              selectedIds={selection.selectedIdSet}
              onToggleSelect={selection.toggle}
              onToggleSelectAll={(next) => next ? selection.setSelectedIds(rows.map(r => r.id)) : selection.clearSelection()}
              renderRowActions={(row) => {
                const sr = row as StoreRow;
                const isSuspended = sr.status?.toLowerCase() === "suspended";
                const isVerified = Boolean(sr._raw?.isVerified);
                return (
                  <RowActionMenu actions={[
                    {
                      label: ACTIONS.ADMIN["manage-store"].label,
                      onClick: () => openEditPanel(sr.id),
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
              onRowClick={(row) => openEditPanel(row.id)}
              selectedIdSet={selection.selectedIdSet}
              onToggleSelect={selection.toggle}
            />
          )}
        </div>

        <StoresFilterDrawer
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          activeFilterCount={activeFilterCount}
          clearFilters={clearFilters}
          pendingFilters={pendingFilters}
          setPendingFilters={setPendingFilters}
          applyFilters={applyFilters}
        />
      </div>

      <AdminStoreEditorView
        open={isEditOpen}
        onClose={closePanel}
        storeId={editId ?? undefined}
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
