"use client";

import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { ConfirmDeleteModal, RowActionMenu, Text } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../..";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";

interface ClassifiedRow {
  id: string;
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

const COLUMNS: AdminTableColumn<ClassifiedRow>[] = [
  { key: "title", header: "Listing", render: (row) => <Text className="text-sm font-medium">{row.title}</Text> },
  { key: "price", header: "Price", render: (row) => <Text className="text-sm tabular-nums">{row.price}</Text> },
  {
    key: "city",
    header: "Location",
    render: (row) => (
      <Text className="text-sm text-[var(--appkit-color-text-muted)]">{row.city || "—"}</Text>
    ),
  },
  {
    key: "acceptsShipping",
    header: "Shipping",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          row.acceptsShipping
            ? "bg-success-surface text-success"
            : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {row.acceptsShipping ? "Ships" : "Meetup only"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
          row.status === "active"
            ? "bg-success-surface text-success"
            : "bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {row.status}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    render: (row) => (
      <Text className="text-sm text-[var(--appkit-color-text-muted)]">{row.createdAt}</Text>
    ),
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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: (id) => `/api/store/products/${id}`,
    deleteFn: onDelete,
    successMessage: "Listing deleted.",
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
      else window.location.href = String(ROUTES.STORE.CLASSIFIED_EDIT(id));
    },
    [onEditClick],
  );

  const handleCreate = useCallback(() => {
    if (onCreateClick) onCreateClick();
    else window.location.href = String(ROUTES.STORE.CLASSIFIED_NEW);
  }, [onCreateClick]);

  const config: ListingViewConfig<ProductsResponse, ClassifiedRow> = {
    portal: "seller",
    title: "Classified",
    searchPlaceholder: "Search classified listings...",
    emptyLabel: "No classified listings yet — post your first buy/sell/trade ad",
    filterKeys: [],
    defaultSort: "-createdAt",
    queryKey: ["seller", "classified"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: "-createdAt", label: "Newest" },
      { value: "createdAt", label: "Oldest" },
      { value: "productTitle", label: "Name A–Z" },
      { value: "price", label: "Price: Low–High" },
      { value: "-price", label: "Price: High–Low" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => {
        const classified = (item.classified ?? {}) as Record<string, unknown>;
        const meetupArea = (classified.meetupArea ?? {}) as Record<string, unknown>;
        return {
          id: toStringValue(item.id, `classified-${index}`),
          title: toStringValue(item.productTitle ?? item.title, "Untitled"),
          price: toRupees(item.price),
          city: toStringValue(meetupArea.city ?? classified.city, ""),
          acceptsShipping: Boolean(classified.acceptsShipping),
          status: toStringValue(item.status, "draft"),
          createdAt: toRelativeDate(item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
    buildFilters: () => "listingType==classified",
    primaryAction: { label: "New Classified", onClick: () => handleCreate() },
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
          title="Delete Classified Listing"
          message="Are you sure you want to delete this classified listing? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
