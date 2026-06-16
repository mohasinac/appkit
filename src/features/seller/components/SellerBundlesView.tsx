"use client";

import { Span, sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { ConfirmDeleteModal, RowActionMenu, Text } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../..";

const CLS_ITEMS_PILL = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 tabular-nums";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";

interface BundleRow {
  id: string;
  title: string;
  price: string;
  itemCount: number;
  status: string;
  createdAt: string;
}

interface ProductsResponse {
  products?: unknown[];
  meta?: { total: number };
}

const COLUMNS: AdminTableColumn<BundleRow>[] = [
  { key: "title", header: "Bundle", render: (row) => <Text size="sm" weight="medium">{row.title}</Text> },
  { key: "price", header: "Price", render: (row) => <Text className="tabular-nums" size="sm">{row.price}</Text> },
  {
    key: "itemCount",
    header: "Items",
    render: (row) => (
      <Span className={CLS_ITEMS_PILL}>
        {row.itemCount}
      </Span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
          row.status === "active"
            ? "bg-success-surface text-success"
            : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {row.status}
      </Span>
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    render: (row) => (
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">{row.createdAt}</Text>
    ),
  },
];

export interface SellerBundlesViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function SellerBundlesView({
  onCreateClick,
  onEditClick,
  onDelete,
  onBulkDelete,
}: SellerBundlesViewProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: (id) => `/api/store/products/${id}`,
    deleteFn: onDelete,
    successMessage: "Bundle deleted.",
    fetchOptions: { credentials: "include" },
  });

  const handleDelete = useCallback(
    async (id: string) => {
      await performDelete(id);
      setDeleteTargetId(null);
    },
    [performDelete],
  );

  const handleEdit = useCallback(
    (id: string) => {
      if (onEditClick) onEditClick(id);
      else window.location.href = String(ROUTES.STORE.PRODUCTS_EDIT(id));
    },
    [onEditClick],
  );

  const handleCreate = useCallback(() => {
    if (onCreateClick) onCreateClick();
    else window.location.href = String(ROUTES.STORE.PRODUCTS_NEW);
  }, [onCreateClick]);

  const config: ListingViewConfig<ProductsResponse, BundleRow> = {
    portal: "seller",
    title: "Bundles",
    searchPlaceholder: "Search bundles...",
    emptyLabel: "No bundles yet — create a bundle to group multiple products together",
    filterKeys: [],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "bundles"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "productTitle", label: "Name A–Z" },
      { value: sortBy("productTitle", "DESC"), label: "Name Z–A" },
      { value: sortBy("price", "ASC"), label: "Price: Low–High" },
      { value: sortBy("price", "DESC"), label: "Price: High–Low" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => ({
        id: toStringValue(item.id, `bundle-${index}`),
        title: toStringValue(item.productTitle ?? item.title, "Untitled bundle"),
        price: toRupees(item.price),
        itemCount: Array.isArray(item.bundleProductIds)
          ? (item.bundleProductIds as unknown[]).length
          : Number(item.bundleItemCount ?? 0),
        status: toStringValue(item.status, "draft"),
        createdAt: toRelativeDate(item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: () => "listingType==bundle",
    primaryAction: { label: "New Bundle", onClick: () => handleCreate() },
    buildBulkActions: onBulkDelete
      ? (selection): BulkActionItem[] => [
          {
            id: "bulk-delete",
            label: ACTIONS.STORE["delete-listing"].label,
            variant: "danger",
            onClick: async () => {
              await onBulkDelete(selection.selectedIds);
              selection.clearSelection();
            },
          },
        ]
      : undefined,
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          { label: ACTIONS.STORE["edit-listing"].label, onClick: () => handleEdit(row.id) },
          {
            label: ACTIONS.STORE["delete-listing"].label,
            destructive: true,
            onClick: () => setDeleteTargetId(row.id),
            disabled: deletingId === row.id,
          },
        ]}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Bundle"
          message="Are you sure you want to delete this bundle? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
