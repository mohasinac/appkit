"use client";

import React from "react";
import { Pencil } from "lucide-react";
import { Alert, Badge, BulkActionBar, Button, FilterChipGroup, ListingToolbar, ListingLayout, Pagination, Text, ListingFilterDrawer} from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_PRODUCT_STATUS_TABS } from "../constants/filter-tabs";
import { ROUTES } from "../../../constants";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import type { AdminTableColumn } from "../types";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
// Hardcoded sieve clause — this view only ever shows prize draws.
const LISTING_TYPE_FILTER = "listingType==prize-draw";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "prizeDrawEndDate", label: "Draw Date Soon" },
];

const STATUS_OPTIONS = ADMIN_PRODUCT_STATUS_TABS;

const STATUS_VARIANT: Record<
  string,
  "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
  published: "success",
  active: "success",
  draft: "default",
  pending: "warning",
  archived: "secondary",
  ended: "secondary",
  cancelled: "danger",
};

interface PrizeDrawAdminRow extends AdminListingScaffoldRow {
  entryFee: string;
  drawDate: string;
  storeName: string;
}

interface AdminProductsResponse {
  items?: unknown[];
  total?: number;
}

const PRIZE_DRAW_COLUMNS: AdminTableColumn<PrizeDrawAdminRow>[] = [
  {
    key: "primary",
    header: "Prize Draw",
    render: (row) => (
      <div className="space-y-1">
        <Text className="font-semibold text-[var(--appkit-color-text)] line-clamp-1">{row.primary}</Text>
        <Text className="text-xs text-[var(--appkit-color-text-muted)]">{row.storeName}</Text>
      </div>
    ),
  },
  {
    key: "entryFee",
    header: "Entry Fee",
    className: "w-28 text-right",
    render: (row) => (
      <span className="text-sm font-medium text-[var(--appkit-color-text)]">{row.entryFee}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    className: "w-28",
    render: (row) => (
      <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>{row.status}</Badge>
    ),
  },
  {
    key: "drawDate",
    header: "Draw Date",
    className: "w-32",
    render: (row) => (
      <span className="text-sm text-[var(--appkit-color-text-muted)]">{row.drawDate}</span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    sortable: true,
    className: "w-32",
    render: (row) => (
      <span className="text-sm text-[var(--appkit-color-text-muted)]">{row.updatedAt}</span>
    ),
  },
];

export interface AdminPrizeDrawsViewProps extends ListingLayoutProps {}

export function AdminPrizeDrawsView({ children, ...props }: AdminPrizeDrawsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminProductsResponse, PrizeDrawAdminRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "prize-draws", "listing"],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const priceRaw = typeof item.price === "number" ? item.price : 0;
        return {
          id: toStringValue(item.id, `prize-draw-${index}`),
          primary: toStringValue(item.title ?? item.name, "Untitled prize draw"),
          secondary: toStringValue(item.sellerName, ""),
          storeName: toStringValue(item.sellerName ?? item.storeId, "Unknown store"),
          status: toStringValue(item.status, "draft"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          entryFee: priceRaw ? toRupees(priceRaw) : "Free",
          drawDate: item.prizeDrawEndDate
            ? toRelativeDate(item.prizeDrawEndDate as string)
            : "TBA",
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const statusRaw = filterState.status;
      const statusFilter = statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
      return [LISTING_TYPE_FILTER, statusFilter].filter(Boolean).join(",") || undefined;
    },
  });

  if (hasChildren) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
          { id: "delete", label: ACTIONS.ADMIN["delete-prize-draw"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
        ] satisfies BulkActionItem[]) } } : {});

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search prize draws by name or store…"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => {
          table.set("sort", v);
        }}
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
          { id: "delete", label: ACTIONS.ADMIN["delete-prize-draw"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
        ] satisfies BulkActionItem[])}
      />

      {totalPages > 1 && (
        <div
          className="sticky z-10 flex justify-center bg-[var(--appkit-color-surface)]/95 backdrop-blur-sm border-b border-[var(--appkit-color-border)] px-3 py-1.5"
          style={{ top: "calc(var(--header-height, 0px) + 44px)" }}
        >
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Alert variant="error" className="mb-4">
            {errorMessage}
          </Alert>
        )}
        <DataTable
          columns={PRIZE_DRAW_COLUMNS}
          rows={rows}
          isLoading={isLoading}
          emptyLabel="No prize draws found"
          getRowHref={(row) => String(ROUTES.ADMIN.PRIZE_DRAWS_EDIT(row.id))}
          renderRowActions={(row) => (
            <Button variant="ghost" size="sm" asChild>
              <a href={String(ROUTES.ADMIN.PRIZE_DRAWS_EDIT(row.id))} aria-label="Edit">
                <Pencil className="w-4 h-4" />
              </a>
            </Button>
          )}
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
  );
}
