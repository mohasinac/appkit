"use client";

import React, { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { BulkActionBar, Button, Div, FilterChipGroup, ListingToolbar, Pagination, ListingViewShell, SideDrawer, Text, useToast } from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_COUPON_TYPE_TABS } from "../constants/filter-tabs";
import { apiClient } from "../../../http";
import {
  toRecordArray,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import { AdminCouponEditorView } from "./AdminCouponEditorView";
import { CouponCard } from "../../promotions/components/CouponCard";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["type"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "code", label: "Code A–Z" },
];
const TYPE_OPTIONS = ADMIN_COUPON_TYPE_TABS;

interface AdminCouponsResponse {
  items?: unknown[];
  total?: number;
}

export interface AdminCouponsViewProps extends ListingViewShellProps {
  actionHref?: string;
  getRowHref?: (row: AdminListingScaffoldRow) => string;
  onBulkArchive?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

interface CouponsFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function CouponsFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: CouponsFilterDrawerProps) {
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
            label="Type"
            tabs={TYPE_OPTIONS}
            value={pendingFilters.type ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
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

export function AdminCouponsView({ children, getRowHref, onBulkArchive, onBulkDelete, ...props }: AdminCouponsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const { openCreatePanel, openEditPanel, closePanel, isCreateOpen, isEditOpen, editId } = usePanelUrlSync();
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

  const typeRaw = table.get("type");
  const filters = typeRaw && typeRaw !== "All" ? `type==${typeRaw}` : undefined;

  const { rows, total, isLoading, errorMessage, refetch } = useAdminListingData<
    AdminCouponsResponse,
    { id: string; raw: Record<string, unknown> }
  >({
    queryKey: ["admin", "coupons", "listing"],
    endpoint: ADMIN_ENDPOINTS.COUPONS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `coupon-${index}`),
        raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });
  const { showToast } = useToast();

  const handleToggle = useCallback(async (id: string, currentlyActive: boolean) => {
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.COUPON_BY_ID(id), {
        validity: { isActive: !currentlyActive },
      });
      showToast(currentlyActive ? "Coupon deactivated." : "Coupon activated.", "success");
      refetch();
    } catch {
      showToast("Could not update coupon status.", "error");
    }
  }, [showToast, refetch]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiClient.delete(ADMIN_ENDPOINTS.COUPON_BY_ID(id));
      showToast("Coupon deleted.", "success");
      refetch();
    } catch {
      showToast("Could not delete coupon.", "error");
    }
  }, [showToast, refetch]);

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  const bulkActions: BulkActionItem[] = [
    ...(onBulkArchive ? [{
      id: "bulk-archive",
      label: "Archive",
      onClick: async () => { await onBulkArchive(selection.selectedIds); selection.clearSelection(); },
    }] : []),
    ...(onBulkDelete ? [{
      id: "bulk-delete",
      label: ACTIONS.ADMIN["delete-coupon"].label,
      variant: "danger" as const,
      onClick: async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); },
    }] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search codes, campaigns, or seller scopes"
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
        extra={
          <Button size="sm" onClick={openCreatePanel} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add Coupon
          </Button>
        }
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
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        )}
        {isLoading ? (
          <Div className="fluid-grid-card gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Div
                key={i}
                className="rounded-xl border-2 border-zinc-100 dark:border-slate-700 p-4 animate-pulse space-y-3"
              >
                <Div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
                <Div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                <Div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
              </Div>
            ))}
          </Div>
        ) : rows.length === 0 ? (
          <Div className="py-16 text-center">
            <Text className="text-zinc-400 dark:text-zinc-400">No coupons found</Text>
          </Div>
        ) : (
          <Div className="fluid-grid-card gap-3">
            {rows.map((row) => (
              <CouponCard
                key={row.id}
                coupon={row.raw}
                onEdit={openEditPanel}
                onToggleActive={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </Div>
        )}
      </div>

      <CouponsFilterDrawer
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
        pendingFilters={pendingFilters}
        setPendingFilters={setPendingFilters}
        applyFilters={applyFilters}
      />

      <SideDrawer
        isOpen={isCreateOpen || isEditOpen}
        onClose={closePanel}
        title={isCreateOpen ? "Add Coupon" : "Edit Coupon"}
        mode={isCreateOpen ? "create" : "edit"}
      >
        {(isCreateOpen || isEditOpen) && (
          <AdminCouponEditorView
            couponId={editId ?? undefined}
            onSaved={closePanel}
            onDeleted={closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
