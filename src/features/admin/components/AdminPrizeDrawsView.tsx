"use client";

import React, { useState, useCallback } from "react";
import { Pencil, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { Alert, Badge, BulkActionBar, Button, FilterChipGroup, ListingToolbar, ListingViewShell, Pagination, Text } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_PRODUCT_STATUS_TABS } from "../constants/filter-tabs";
import { ROUTES } from "../../../constants";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import type { AdminTableColumn } from "../types";

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

export interface AdminPrizeDrawsViewProps extends ListingViewShellProps {}

interface PrizeDrawsFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function PrizeDrawsFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: PrizeDrawsFilterDrawerProps) {
  if (!filterOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
      <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-[var(--appkit-color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--appkit-color-border)] px-4 py-3.5">
          <span className="text-base font-semibold text-[var(--appkit-color-text)]">Filters</span>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="text-xs text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-error)] transition-colors">Clear all</button>
            )}
            <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)] transition-colors">
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
        <div className="border-t border-[var(--appkit-color-border)] px-4 py-3.5">
          <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-[var(--appkit-color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity active:scale-[0.98]">
            Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}

export function AdminPrizeDrawsView({ children, ...props }: AdminPrizeDrawsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");

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
  const hasActiveState =
    !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const statusRaw = table.get("status");
  const statusFilter =
    statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
  const filters =
    [LISTING_TYPE_FILTER, statusFilter].filter(Boolean).join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminProductsResponse,
    PrizeDrawAdminRow
  >({
    queryKey: ["admin", "prize-draws", "listing"],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  if (hasChildren) {
    return (
      <ListingViewShell portal="admin" {...props}>
        {children}
      </ListingViewShell>
    );
  }

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
          { id: "delete", label: "Delete Selected", variant: "secondary", onClick: () => { selection.clearSelection(); } },
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

      <PrizeDrawsFilterDrawer
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
        pendingFilters={pendingFilters}
        setPendingFilters={setPendingFilters}
        applyFilters={applyFilters}
      />
    </div>
  );
}
