"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import {
  Badge,
  BulkActionBar,
  Button,
  Heading,
  ListingToolbar,
  Pagination,
  Stack,
  Text,
  useToast, ListingFilterDrawer} from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import {
  BUNDLE_COPY,
  BUNDLE_STOCK_VARIANT,
} from "../../../_internal/shared/features/categories/bundle-copy";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import type { AdminTableColumn } from "../types";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["isActive", "bundleStockStatus"];
const DEFAULT_SORT = "name";
const SORT_OPTIONS = [
  { value: "name", label: "Name A–Z" },
  { value: "-name", label: "Name Z–A" },
  { value: "-bundlePriceInPaise", label: "Price high→low" },
  { value: "bundlePriceInPaise", label: "Price low→high" },
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
];

interface BundlesResponse {
  items?: unknown[];
  total?: number;
}

type BundleRow = {
  id: string;
  primary: string;
  secondary: string;
  price: string;
  members: string;
  stockStatus: string;
  isActive: boolean;
  status: string;
  updatedAt: string;
};

function formatPrice(paise: unknown): string {
  if (typeof paise !== "number" || paise <= 0) return "—";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const COLUMNS: AdminTableColumn<BundleRow>[] = [
  {
    key: "primary",
    header: "Name",
    render: (row) => (
      <Stack gap="xs">
        <Text className="font-medium text-zinc-900 dark:text-zinc-100">{row.primary}</Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">{row.secondary}</Text>
      </Stack>
    ),
  },
  { key: "price", header: "Price", className: "w-28" },
  { key: "members", header: "Members", className: "w-24" },
  {
    key: "stockStatus",
    header: "Stock",
    className: "w-28",
    render: (row) => (
      <Badge
        variant={
          BUNDLE_STOCK_VARIANT[row.stockStatus as keyof typeof BUNDLE_STOCK_VARIANT] ?? "default"
        }
      >
        {row.stockStatus === "in_stock"
          ? BUNDLE_COPY.stockBadge.listVariantInStock
          : BUNDLE_COPY.stockBadge.listVariantOutOfStock}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-24",
    render: (row) => (
      <Badge variant={row.isActive ? "success" : "default"}>{row.status}</Badge>
    ),
  },
  { key: "updatedAt", header: "Updated", className: "w-28" },
];

export interface AdminBundlesViewProps {
  getEditHref: (row: { id: string }) => string;
  newHref: string;
}

export function AdminBundlesView({ getEditHref, newHref }: AdminBundlesViewProps) {
  const [rebuildingId, setRebuildingId] = useState<string | null>(null);
  const toast = useToast();

  const {
    table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage, refetch,
    currentPage, totalPages, selection,
  } = useAdminListing<BundlesResponse, BundleRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "bundles", "listing"],
    endpoint: ADMIN_ENDPOINTS.BUNDLES,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `bundle-${index}`),
        primary: toStringValue(item.name, "Untitled bundle"),
        secondary: toStringValue(item.slug, "no-slug"),
        price: formatPrice(item.bundlePriceInPaise),
        members: String(Array.isArray(item.bundleProductIds) ? item.bundleProductIds.length : 0),
        stockStatus: toStringValue(item.bundleStockStatus, "in_stock"),
        isActive: item.isActive === true,
        status:
          item.isActive === true
            ? BUNDLE_COPY.adminList.activeBadge
            : BUNDLE_COPY.adminList.inactiveBadge,
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const parts: string[] = [];
      if (filterState.isActive) parts.push(`isActive==${filterState.isActive}`);
      if (filterState.bundleStockStatus) parts.push(`bundleStockStatus==${filterState.bundleStockStatus}`);
      return parts.join(",") || undefined;
    },
  });

  const handleRebuild = useCallback(
    async (bundleId: string) => {
      setRebuildingId(bundleId);
      try {
        const res = await fetch(ADMIN_ENDPOINTS.BUNDLE_REBUILD(bundleId), { method: "POST" });
        if (!res.ok) throw new Error("Rebuild failed");
        toast.showToast("Bundle stock rebuilt.", "success");
      } catch {
        toast.showToast("Failed to rebuild bundle stock.", "error");
      } finally {
        setRebuildingId(null);
        refetch();
      }
    },
    [refetch, toast],
  );

  const bulkActions: BulkActionItem[] = [
    buildBulkAction(ACTIONS.ADMIN["activate-bundle"], async () => {
      await Promise.all(
        selection.selectedIds.map((id) =>
          fetch(ADMIN_ENDPOINTS.BUNDLE_BY_ID(id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          }),
        ),
      );
      selection.clearSelection();
      refetch();
    }),
    buildBulkAction(ACTIONS.ADMIN["deactivate-bundle"], async () => {
      await Promise.all(
        selection.selectedIds.map((id) =>
          fetch(ADMIN_ENDPOINTS.BUNDLE_BY_ID(id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          }),
        ),
      );
      selection.clearSelection();
      refetch();
    }),
    buildBulkAction(ACTIONS.ADMIN["delete-bundle"], async () => {
      await Promise.all(
        selection.selectedIds.map((id) =>
          fetch(ADMIN_ENDPOINTS.BUNDLE_BY_ID(id), { method: "DELETE" }),
        ),
      );
      selection.clearSelection();
      refetch();
    }),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  return (
    <div className="min-h-screen">
      <Heading level={1} className="sr-only">
        Bundles
      </Heading>

      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search bundles by name or slug…"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => {
          table.set("sort", v);
        }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          <Button asChild size="sm" variant="primary">
            <a href={newHref} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {BUNDLE_COPY.adminList.newButton}
            </a>
          </Button>
        }
      />

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={bulkActions}
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
            {errorMessage}
          </div>
        )}
        <DataTable
          columns={COLUMNS}
          rows={rows}
          isLoading={isLoading}
          emptyLabel={BUNDLE_COPY.adminList.empty}
          getRowHref={getEditHref}
          selectedIds={selection.selectedIdSet}
          onToggleSelect={selection.toggle}
          onToggleSelectAll={(next) =>
            next
              ? selection.setSelectedIds(rows.map((r) => r.id))
              : selection.clearSelection()
          }
          renderRowActions={(row) => (
            <Button
              variant="ghost"
              size="sm"
              isLoading={rebuildingId === row.id}
              disabled={rebuildingId === row.id}
              onClick={() => void handleRebuild(row.id)}
            >
              {ACTIONS.ADMIN["rebuild-bundle"].label}
            </Button>
          )}
        />
      </div>

      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <div className="space-y-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Status
            </Text>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", value: "" },
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPendingFilters((p) => ({ ...p, isActive: opt.value }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    (pendingFilters.isActive || "") === opt.value
                      ? "bg-primary text-white border-primary"
                      : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Stock
            </Text>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", value: "" },
                { label: "Sold out", value: "out_of_stock" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() =>
                    setPendingFilters((p) => ({ ...p, bundleStockStatus: opt.value }))
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    (pendingFilters.bundleStockStatus || "") === opt.value
                      ? "bg-primary text-white border-primary"
                      : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
      </ListingFilterDrawer>
    </div>
  );
}
