"use client";

import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { X, Plus } from "lucide-react";
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
import { useBottomActions } from "../../layout";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ROUTES } from "../../../next";
import {
  toRecordArray,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { TABLE_KEYS } from "../../../constants/table-keys";

const PAGE_SIZE = 25;
const DEFAULT_SORT = "displayOrder";
const SORT_OPTIONS = [
  { value: "displayOrder", label: "Display Order" },
  { value: "label", label: "Label A–Z" },
  { value: "-label", label: "Label Z–A" },
  { value: "-createdAt", label: "Newest" },
];

interface CategoryRow {
  id: string;
  raw: Record<string, unknown>;
  label: string;
  slug: string;
  productCount: number;
  isActive: boolean;
}

interface StoreCategoriesResponse {
  items?: unknown[];
  total?: number;
}

export interface SellerStoreCategoriesViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkActivate?: (ids: string[]) => Promise<void>;
  onBulkDeactivate?: (ids: string[]) => Promise<void>;
}

const COLUMNS: DataTableColumn<CategoryRow>[] = [
  {
    key: "label",
    header: "Label",
    render: (row) => (
      <Div>
        <Text className="text-sm font-medium">{row.label}</Text>
        <Text className="text-xs text-[var(--appkit-color-text-muted)]">/{row.slug}</Text>
      </Div>
    ),
  },
  {
    key: "productCount",
    header: "Products",
    render: (row) => <Text className="text-sm tabular-nums">{row.productCount}</Text>,
  },
  {
    key: "isActive",
    header: "Status",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          row.isActive
            ? "bg-success-surface text-success"
            : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {row.isActive ? "Active" : "Hidden"}
      </span>
    ),
  },
];

export function SellerStoreCategoriesView({
  onCreateClick,
  onEditClick,
  onDelete,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
}: SellerStoreCategoriesViewProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    deleteFn: onDelete,
    successMessage: "Category deleted.",
    onSuccess: () => { refetch?.(); },
  });


  const commitSearch = useCallback(() => { table.set(TABLE_KEYS.QUERY, searchInput.trim()); }, [searchInput, table]);

  const resetAll = useCallback(() => {
    table.setMany({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "" });
    setSearchInput("");
  }, [table]);

  const hasActiveState = !!table.get(TABLE_KEYS.QUERY) || table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT;

  const { rows, total, isLoading, errorMessage, refetch } = useSellerListingData<
    StoreCategoriesResponse,
    CategoryRow
  >({
    queryKey: ["seller", "store-categories"],
    endpoint: SELLER_ENDPOINTS.STORE_CATEGORIES,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    pageSize: PAGE_SIZE,
    sorts: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `cat-${index}`),
        raw: item,
        label: String(item.label ?? ""),
        slug: String(item.slug ?? ""),
        productCount: Number((item.productIds as unknown[])?.length ?? 0),
        isActive: Boolean(item.isActive),
      })),
    getTotal: (response, rows) =>
      typeof response.total === "number" ? response.total : rows.length,
  });

  const currentPage = table.getNumber(TABLE_KEYS.PAGE, 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r) => r.id });

  const handleDelete = useCallback(async (id: string) => {
    if (!onDelete) return;
    await performDelete(id);
    setDeleteTargetId(null);
  }, [onDelete, performDelete]);

  const bulkActions: BulkActionItem[] = [
    ...(onBulkDelete ? [buildBulkAction(ACTIONS.STORE["delete-listing"], async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); refetch?.(); })] : []),
    ...(onBulkActivate ? [buildBulkAction(ACTIONS.ADMIN["activate-bundle"], async () => { await onBulkActivate(selection.selectedIds); selection.clearSelection(); refetch?.(); })] : []),
    ...(onBulkDeactivate ? [buildBulkAction(ACTIONS.ADMIN["deactivate-bundle"], async () => { await onBulkDeactivate(selection.selectedIds); selection.clearSelection(); refetch?.(); })] : []),
  ];

  const handleNavigateNew = () => {
    if (onCreateClick) { onCreateClick(); return; }
    window.location.href = String(ROUTES.STORE.STORE_CATEGORIES_NEW);
  };

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={0}
        searchValue={searchInput}
        searchPlaceholder="Search categories by label..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        showTableView
        view="table"
        onViewChange={() => {}}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          <Button size="sm" onClick={handleNavigateNew} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            <span>New Category</span>
          </Button>
        }
      />

      {totalPages > 1 && (
        <Div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </Div>
      )}

      {selection.selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      <Div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-error/20 bg-error-surface px-4 py-3 text-sm text-error">
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
            <Text className="text-zinc-400 dark:text-zinc-400">No categories yet — add your first storefront category</Text>
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
                    onClick: () => onEditClick
                      ? onEditClick(row.id)
                      : (window.location.href = String(ROUTES.STORE.STORE_CATEGORIES_EDIT(row.id))),
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
        )}
      </Div>

      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Category"
          message="Are you sure you want to delete this category? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </Div>
  );
}
