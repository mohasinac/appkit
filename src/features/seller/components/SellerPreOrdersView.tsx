"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { Alert, Badge, BulkActionBar, Button, ConfirmDeleteModal, Div, FilterChipGroup, ListingToolbar, ListingViewShell, Pagination, Row, RowActionMenu, Text } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_PRE_ORDER_STATUS_TABS } from "../../admin/constants/filter-tabs";
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
// Hardcoded sieve clause — this view only ever shows pre-orders.
const LISTING_TYPE_FILTER = "listingType==pre-order";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "preorderAvailableDate", label: "Delivery Soon" },
];

const STATUS_OPTIONS = SELLER_PRE_ORDER_STATUS_TABS;

interface PreOrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  price: string;
  deliveryDate: string;
  updatedAt: string;
  imageUrl?: string;
}

interface SellerProductsResponse {
  products?: unknown[];
  meta?: { total: number };
}

const PRE_ORDER_COLUMNS: AdminTableColumn<PreOrderRow>[] = [
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
    header: "Pre-order",
    render: (row) => (
      <div className="space-y-1">
        <Text className="font-medium text-[var(--appkit-color-text)] line-clamp-1">{row.primary}</Text>
        <span className="text-xs text-[var(--appkit-color-text-muted)]">{row.secondary}</span>
      </div>
    ),
  },
  {
    key: "price",
    header: "Price",
    className: "w-28 text-right",
    render: (row) => (
      <span className="text-sm font-medium text-[var(--appkit-color-text)]">{row.price}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => {
      const variant =
        row.status === "active"
          ? "success"
          : row.status === "draft"
            ? "default"
            : row.status === "cancelled"
              ? "danger"
              : "warning";
      return <Badge variant={variant}>{row.status}</Badge>;
    },
  },
  {
    key: "deliveryDate",
    header: "Est. Delivery",
    className: "w-36",
    render: (row) => (
      <span className="text-xs text-[var(--appkit-color-text-muted)]">{row.deliveryDate}</span>
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

export interface SellerPreOrdersViewProps extends ListingViewShellProps {
  onDelete?: (id: string) => Promise<void>;
}

export function SellerPreOrdersView({ children, onDelete, ...props }: SellerPreOrdersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const dispatch = useActionDispatch();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    PreOrderRow
  >({
    queryKey: ["seller", "pre-orders", "listing"],
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
          id: toStringValue(item.id, `preorder-${index}`),
          primary: toStringValue(item.title ?? item.name, "Untitled pre-order"),
          secondary: toStringValue(item.condition, ""),
          status: toStringValue(item.status, "draft"),
          price: priceRaw ? toRupees(priceRaw) : "—",
          deliveryDate: item.preorderAvailableDate
            ? toRelativeDate(item.preorderAvailableDate as string)
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
    setDeletingId(id);
    try {
      if (onDelete) await onDelete(id);
      else await fetch(`/api/store/products/${id}`, { method: "DELETE", credentials: "include" });
    } finally { setDeletingId(null); setDeleteTargetId(null); }
  }, [onDelete]);

  if (hasChildren) {
    return (
      <ListingViewShell portal="seller" {...props}>
        {children}
      </ListingViewShell>
    );
  }

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search pre-orders by name…"
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
          columns={PRE_ORDER_COLUMNS}
          rows={rows}
          isLoading={isLoading}
          emptyLabel="No pre-orders listed yet"
          getRowHref={(row) => String(ROUTES.STORE.PRE_ORDERS_EDIT(row.id))}
          renderRowActions={(row) => (
            <RowActionMenu
              actions={[
                {
                  label: ACTIONS.STORE["edit-listing"].label,
                  onClick: () => void dispatch({ type: "NAVIGATE", href: String(ROUTES.STORE.PRE_ORDERS_EDIT(row.id)) }),
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

      {filterOpen && (
        <>
          <Div
            role="presentation"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setFilterOpen(false)}
          />
          <Div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-[var(--appkit-color-surface)] shadow-2xl">
            <Row justify="between" className="border-b border-[var(--appkit-color-border)] px-4 py-3.5">
              <Text className="text-base font-semibold text-[var(--appkit-color-text)]">Filters</Text>
              <Row className="gap-2">
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-error)]"
                  >
                    Clear all
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterOpen(false)}
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </Button>
              </Row>
            </Row>
            <Div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <FilterChipGroup
                label="Status"
                tabs={STATUS_OPTIONS}
                value={pendingFilters.status ?? ""}
                onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
              />
            </Div>
            <Div className="border-t border-[var(--appkit-color-border)] px-4 py-3.5">
              <Button
                variant="primary"
                onClick={applyFilters}
                className="w-full rounded-lg py-2.5 active:scale-[0.98]"
              >
                Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            </Div>
          </Div>
        </>
      )}

      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Pre-Order"
          message="Are you sure you want to delete this pre-order listing? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </Div>
  );
}
