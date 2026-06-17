"use client";

import { Badge, Span, sortBy, type JsonArray } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { ConfirmDeleteModal, Div, RowActionMenu, Text } from "../../../ui";
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

interface LiveRow {
  id: string;
  title: string;
  price: string;
  species: string;
  ageMonths: number | null;
  vendorVerified: boolean;
  status: string;
  createdAt: string;
}

interface ProductsResponse {
  products?: JsonArray;
  meta?: { total: number };
}

const COLUMNS: AdminTableColumn<LiveRow>[] = [
  {
    key: "title",
    header: "Item",
    render: (row) => (
      <Div>
        <Text size="sm" weight="medium">{row.title}</Text>
        {row.species && (
          <Text className="text-[var(--appkit-color-text-muted)] italic" size="xs">{row.species}</Text>
        )}
      </Div>
    ),
  },
  { key: "price", header: "Price", render: (row) => <Text className="tabular-nums" size="sm">{row.price}</Text> },
  {
    key: "ageMonths",
    header: "Age",
    render: (row) => (
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
        {row.ageMonths !== null ? `${row.ageMonths}mo` : "—"}
      </Text>
    ),
  },
  {
    key: "vendorVerified",
    header: "Verified",
    render: (row) => (
      // audit-variant-ok: vendor status badge — conditional bg-success-surface vs bg-warning-surface
      <Span layout="inline-flex"
        className={`${ row.vendorVerified ? "bg-success-surface text-success" : "bg-warning-surface text-warning" }`} size="xs" weight="medium" rounded="full" padding="pill-xs"
      >
        {row.vendorVerified ? "Verified" : "Pending"}
      </Span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge variant={row.status === "active" ? "active" : "inactive"} size="xs" className="capitalize">
        {row.status}
      </Badge>
    ),
  },
  {
    key: "createdAt",
    header: "Listed",
    render: (row) => (
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">{row.createdAt}</Text>
    ),
  },
];

export interface SellerLiveViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function SellerLiveView({
  onCreateClick,
  onEditClick,
  onDelete,
  onBulkDelete,
}: SellerLiveViewProps) {
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
      else window.location.href = String(ROUTES.STORE.LIVE_ITEMS_EDIT(id));
    },
    [onEditClick],
  );

  const handleCreate = useCallback(() => {
    if (onCreateClick) onCreateClick();
    else window.location.href = String(ROUTES.STORE.LIVE_ITEMS_NEW);
  }, [onCreateClick]);

  const config: ListingViewConfig<ProductsResponse, LiveRow> = {
    portal: "seller",
    title: "Live Items",
    searchPlaceholder: "Search live item listings...",
    emptyLabel: "No live item listings yet",
    filterKeys: [],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "live-items"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "productTitle", label: "Name A–Z" },
      { value: sortBy("price", "ASC"), label: "Price: Low–High" },
      { value: sortBy("price", "DESC"), label: "Price: High–Low" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => {
        const live = (item.liveItem ?? {}) as Record<string, JsonValue>;
        return {
          id: toStringValue(item.id, `live-${index}`),
          title: toStringValue(item.productTitle ?? item.title, "Untitled"),
          price: toRupees(item.price),
          species: toStringValue(live.species, ""),
          ageMonths: typeof live.ageMonths === "number" ? live.ageMonths : null,
          vendorVerified: Boolean(live.vendorVerified),
          status: toStringValue(item.status, "draft"),
          createdAt: toRelativeDate(item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: () => "listingType==live",
    primaryAction: { label: "New Live Item", onClick: () => handleCreate() },
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
          title="Delete Live Item Listing"
          message="Are you sure you want to delete this live item listing? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
