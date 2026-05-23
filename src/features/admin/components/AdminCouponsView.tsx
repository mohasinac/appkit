"use client";

import React, { useCallback } from "react";
import { Plus } from "lucide-react";
import { BulkActionBar, Button, Div, FilterChipGroup, ListingToolbar, Pagination, ListingLayout, SideDrawer, Text, useToast, ListingFilterDrawer} from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { ADMIN_COUPON_TYPE_TABS } from "../constants/filter-tabs";
import { apiClient } from "../../../http";
import {
  toRecordArray,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
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

export interface AdminCouponsViewProps extends ListingLayoutProps {
  actionHref?: string;
  getRowHref?: (row: AdminListingScaffoldRow) => string;
  onBulkArchive?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function AdminCouponsView({ children, getRowHref, onBulkArchive, onBulkDelete, ...props }: AdminCouponsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const {
    view, setView, table, panel, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage, refetch,
    currentPage, totalPages, selection,
  } = useAdminListing<
    AdminCouponsResponse,
    { id: string; raw: Record<string, unknown> }
  >({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "coupons", "listing"],
    endpoint: ADMIN_ENDPOINTS.COUPONS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `coupon-${index}`),
        raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const typeRaw = filterState.type;
      return typeRaw && typeRaw !== "All" ? `type==${typeRaw}` : undefined;
    },
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

  const bulkActions: BulkActionItem[] = [
    ...(onBulkArchive ? [{
      id: "bulk-archive",
      label: ROW_ACTION_META[ROW_ACTION_ID.ARCHIVE].label,
      onClick: async () => { await onBulkArchive(selection.selectedIds); selection.clearSelection(); },
    }] : []),
    ...(onBulkDelete ? [buildBulkAction(ACTIONS.ADMIN["delete-coupon"], async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); })] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
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
          <Button size="sm" onClick={panel.openCreatePanel} className="flex items-center gap-1.5">
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
          <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
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
                onEdit={panel.openEditPanel}
                onToggleActive={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </Div>
        )}
      </div>

      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
            label="Type"
            tabs={TYPE_OPTIONS}
            value={pendingFilters.type ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
          />
      </ListingFilterDrawer>

      <SideDrawer
        isOpen={panel.isCreateOpen || panel.isEditOpen}
        onClose={panel.closePanel}
        title={panel.isCreateOpen ? "Add Coupon" : "Edit Coupon"}
        mode={panel.isCreateOpen ? "create" : "edit"}
      >
        {(panel.isCreateOpen || panel.isEditOpen) && (
          <AdminCouponEditorView
            couponId={panel.editId ?? undefined}
            onSaved={panel.closePanel}
            onDeleted={panel.closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
