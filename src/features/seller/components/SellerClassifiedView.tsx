"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import {
  BulkActionBar,
  Button,
  ConfirmDeleteModal,
  DataTable,
  Div,
  ListingToolbar,
  Pagination,
  RowActionMenu,
  Text,
} from "../../../ui";
import type { BulkActionItem, DataTableColumn } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../..";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { TABLE_KEYS } from "../../../constants/table-keys";

const PAGE_SIZE = 25;
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "productTitle", label: "Name A–Z" },
  { value: "price", label: "Price: Low–High" },
  { value: "-price", label: "Price: High–Low" },
];

interface ClassifiedRow {
  id: string;
  raw: Record<string, unknown>;
  title: string;
  price: string;
  city: string;
  acceptsShipping: boolean;
  status: string;
  createdAt: string;
}

interface ProductsResponse {
  products?: unknown[];
  meta?: { total: number };
}

const COLUMNS: DataTableColumn<ClassifiedRow>[] = [
  {
    key: "title",
    header: "Listing",
    render: (row) => <Text className="text-sm font-medium">{row.title}</Text>,
  },
  {
    key: "price",
    header: "Price",
    render: (row) => <Text className="text-sm tabular-nums">{row.price}</Text>,
  },
  {
    key: "city",
    header: "Location",
    render: (row) => (
      <Text className="text-sm text-[var(--appkit-color-text-muted)]">
        {row.city || "—"}
      </Text>
    ),
  },
  {
    key: "acceptsShipping",
    header: "Shipping",
    render: (row) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        row.acceptsShipping
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400"
      }`}>
        {row.acceptsShipping ? "Ships" : "Meetup only"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        row.status === "active"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400"
      }`}>
        {row.status}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    render: (row) => <Text className="text-sm text-[var(--appkit-color-text-muted)]">{row.createdAt}</Text>,
  },
];

export interface SellerClassifiedViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function SellerClassifiedView({
  onCreateClick,
  onEditClick,
  onDelete,
  onBulkDelete,
}: SellerClassifiedViewProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [view] = useState<"grid" | "list" | "table">("table");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const resetAll = useCallback(() => {
    table.setMany({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "" });
    setSearchInput("");
  }, [table]);

  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) || table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    ProductsResponse,
    ClassifiedRow
  >({
    queryKey: ["seller", "classified"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    pageSize: PAGE_SIZE,
    sorts: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    filters: "listingType==classified",
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => {
        const classified = (item.classified ?? {}) as Record<string, unknown>;
        const meetupArea = (classified.meetupArea ?? {}) as Record<string, unknown>;
        return {
          id: toStringValue(item.id, `classified-${index}`),
          raw: item,
          title: toStringValue(item.productTitle ?? item.title, "Untitled"),
          price: toRupees(item.price),
          city: toStringValue(meetupArea.city ?? classified.city, ""),
          acceptsShipping: Boolean(classified.acceptsShipping),
          status: toStringValue(item.status, "draft"),
          createdAt: toRelativeDate(item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  const currentPage = table.getNumber(TABLE_KEYS.PAGE, 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r) => r.id });

  const bulkActions: BulkActionItem[] = onBulkDelete
    ? [{
        id: "bulk-delete",
        label: ACTIONS.STORE["delete-listing"].label,
        variant: "danger" as const,
        onClick: async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); },
      }]
    : [];

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      if (onDelete) await onDelete(id);
      else await fetch(`/api/store/products/${id}`, { method: "DELETE", credentials: "include" });
    } finally { setDeletingId(null); setDeleteTargetId(null); }
  }, [onDelete]);

  const handleEdit = useCallback((id: string) => {
    if (onEditClick) onEditClick(id);
    else window.location.href = String(ROUTES.STORE.CLASSIFIED_EDIT(id));
  }, [onEditClick]);

  const handleCreate = useCallback(() => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      window.location.href = String(ROUTES.STORE.CLASSIFIED_NEW);
    }
  }, [onCreateClick]);

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={0}
        searchValue={searchInput}
        searchPlaceholder="Search classified listings..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        showTableView
        view={view}
        onViewChange={() => {}}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          <Button size="sm" onClick={handleCreate} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            <span>New Classified</span>
          </Button>
        }
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </div>
      )}

      {selection.selectedCount > 0 && bulkActions.length > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {errorMessage}
          </Div>
        )}
        {isLoading ? (
          <Div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Div key={i} className="h-14 animate-pulse rounded-xl border border-zinc-100 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800" />
            ))}
          </Div>
        ) : rows.length === 0 ? (
          <Div className="py-16 text-center">
            <Text className="text-zinc-400 dark:text-zinc-500">
              No classified listings yet — post your first buy/sell/trade ad
            </Text>
          </Div>
        ) : (
          <DataTable
            columns={COLUMNS}
            data={rows}
            keyExtractor={(r) => r.id}
            selectable={bulkActions.length > 0}
            selectedIds={selection.selectedIds}
            onSelectionChange={(ids) => selection.setSelectedIds(ids)}
            actions={(row) => (
              <RowActionMenu
                actions={[
                  {
                    label: ACTIONS.STORE["edit-listing"].label,
                    onClick: () => handleEdit(row.id),
                  },
                  {
                    label: ACTIONS.STORE["delete-listing"].label,
                    destructive: true,
                    onClick: () => setDeleteTargetId(row.id),
                    disabled: deletingId === row.id,
                  },
                ]}
              />
            )}
          />
        )}
      </div>

      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Classified Listing"
          message="Are you sure you want to delete this classified listing? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </div>
  );
}
