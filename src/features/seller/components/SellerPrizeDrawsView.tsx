"use client";

import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { Alert, Badge, BulkActionBar, ConfirmDeleteModal, Div, FilterChipGroup, ListingFilterDrawer, ListingToolbar, ListingLayout, Pagination, RowActionMenu, Text } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_PRIZE_DRAW_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ROUTES } from "../../../constants";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { DataTable } from "../../admin/components/DataTable";
import type { AdminTableColumn } from "../../admin/types";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";

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

const STATUS_OPTIONS = SELLER_PRIZE_DRAW_STATUS_TABS;

interface PrizeDrawRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  entryFee: string;
  drawDate: string;
  updatedAt: string;
  imageUrl?: string;
}

interface SellerProductsResponse {
  products?: unknown[];
  meta?: { total: number };
}

const STATUS_VARIANT: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  active: "success",
  draft: "default",
  ended: "secondary",
  cancelled: "danger",
};

const PRIZE_DRAW_COLUMNS: AdminTableColumn<PrizeDrawRow>[] = [
  {
    key: "thumbnail",
    header: "",
    className: "w-12",
    render: (row) =>
      row.imageUrl ? (
        <img
          src={row.imageUrl}
          alt=""
          className="w-10 h-10 rounded-lg object-cover border border-[var(--appkit-color-border)]"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-[var(--appkit-color-surface-raised)] border border-[var(--appkit-color-border)] flex items-center justify-center">
          <span className="text-xs text-[var(--appkit-color-text-faint)]">–</span>
        </div>
      ),
  },
  {
    key: "primary",
    header: "Prize Draw",
    render: (row) => (
      <div className="space-y-1">
        <Text className="font-medium text-[var(--appkit-color-text)] line-clamp-1">{row.primary}</Text>
        <span className="text-xs text-[var(--appkit-color-text-muted)]">{row.secondary}</span>
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
      <span className="text-xs text-[var(--appkit-color-text-muted)]">{row.drawDate}</span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-28",
    render: (row) => (
      <span className="text-xs text-[var(--appkit-color-text-muted)]">{row.updatedAt}</span>
    ),
  },
];

export interface SellerPrizeDrawsViewProps extends ListingLayoutProps {
  onDelete?: (id: string) => Promise<void>;
}

export function SellerPrizeDrawsView({ children, onDelete, ...props }: SellerPrizeDrawsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const dispatch = useActionDispatch();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: (id) => `/api/store/products/${id}`,
    deleteFn: onDelete,
    successMessage: "Prize draw deleted.",
    fetchOptions: { credentials: "include" },
  });


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
  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const statusRaw = table.get("status");
  const statusFilter = statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
  const filters = [LISTING_TYPE_FILTER, statusFilter].filter(Boolean).join(",");

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerProductsResponse,
    PrizeDrawRow
  >({
    queryKey: ["seller", "prize-draws", "listing"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => {
        const priceRaw = typeof item.price === "number" ? item.price : 0;
        return {
          id: toStringValue(item.id, `prize-draw-${index}`),
          primary: toStringValue(item.title ?? item.name, "Untitled prize draw"),
          secondary: toStringValue(item.condition, ""),
          status: toStringValue(item.status, "draft"),
          entryFee: priceRaw ? toRupees(priceRaw) : "Free",
          drawDate: item.prizeDrawEndDate
            ? toRelativeDate(item.prizeDrawEndDate as string)
            : "TBA",
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          imageUrl: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  const handleDelete = useCallback(async (id: string) => {
    await performDelete(id);
    setDeleteTargetId(null);
  }, [performDelete]);

  if (hasChildren) {
    return (
      <ListingLayout portal="seller" {...props}>
        {children}
      </ListingLayout>
    );
  }

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search prize draws by name…"
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
          <Alert variant="error" className="mb-4">{errorMessage}</Alert>
        )}
        <DataTable
          columns={PRIZE_DRAW_COLUMNS}
          rows={rows}
          isLoading={isLoading}
          emptyLabel="No prize draws listed yet"
          getRowHref={(row) => String(ROUTES.STORE.PRIZE_DRAWS_EDIT(row.id))}
          renderRowActions={(row) => (
            <RowActionMenu
              actions={[
                {
                  label: ACTIONS.STORE["edit-listing"].label,
                  onClick: () => void dispatch({ type: "NAVIGATE", href: String(ROUTES.STORE.PRIZE_DRAWS_EDIT(row.id)) }),
                },
                ...(onDelete ? [{
                  label: ACTIONS.STORE["delete-listing"].label,
                  destructive: true,
                  onClick: () => setDeleteTargetId(row.id),
                  disabled: deletingId === row.id,
                }] : []),
              ]}
            />
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

      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Prize Draw"
          message="Are you sure you want to delete this prize draw listing? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </Div>
  );
}
