"use client";

import { sortBy, type JsonArray } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Badge, ConfirmDeleteModal, RowActionMenu, Span, Text } from "../../../ui";
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

interface DigitalCodeRow {
  id: string;
  title: string;
  price: string;
  codePoolSize: number | null;
  codesAvailable: number | null;
  deliveryMethod: string;
  status: string;
  createdAt: string;
}

interface ProductsResponse {
  products?: JsonArray;
  meta?: { total: number };
}

const COLUMNS: AdminTableColumn<DigitalCodeRow>[] = [
  { key: "title", header: "Product", render: (row) => <Text size="sm" weight="medium">{row.title}</Text> },
  { key: "price", header: "Price", render: (row) => <Text className="tabular-nums" size="sm">{row.price}</Text> },
  {
    key: "codePoolSize",
    header: "Total Codes",
    render: (row) => (
      <Text className="tabular-nums" size="sm">{row.codePoolSize !== null ? row.codePoolSize : "—"}</Text>
    ),
  },
  {
    key: "codesAvailable",
    header: "Available",
    render: (row) => (
      <Text className="tabular-nums" size="sm">{row.codesAvailable !== null ? row.codesAvailable : "—"}</Text>
    ),
  },
  {
    key: "deliveryMethod",
    header: "Delivery",
    render: (row) => (
      <Span layout="inline-flex" size="xs" weight="medium" rounded="full" padding="pill-xs" surface="subtle" color="muted" transform="capitalize">
        {row.deliveryMethod.replace(/-/g, " ")}
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
    header: "Created",
    render: (row) => (
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">{row.createdAt}</Text>
    ),
  },
];

export interface SellerDigitalCodesViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function SellerDigitalCodesView({
  onCreateClick,
  onEditClick,
  onDelete,
  onBulkDelete,
}: SellerDigitalCodesViewProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: (id) => `/api/store/products/${id}`,
    deleteFn: onDelete,
    successMessage: "Code deleted.",
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
      else window.location.href = String(ROUTES.STORE.DIGITAL_CODES_EDIT(id));
    },
    [onEditClick],
  );

  const handleCreate = useCallback(() => {
    if (onCreateClick) onCreateClick();
    else window.location.href = String(ROUTES.STORE.DIGITAL_CODES_NEW);
  }, [onCreateClick]);

  const config: ListingViewConfig<ProductsResponse, DigitalCodeRow> = {
    portal: "seller",
    title: "Digital Codes",
    searchPlaceholder: "Search digital code listings...",
    emptyLabel: "No digital code listings yet",
    filterKeys: [],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "digital-codes"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "productTitle", label: "Name A–Z" },
      { value: sortBy("price", "ASC"), label: "Price: Low–High" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => {
        const dc = (item.digitalCode ?? {}) as Record<string, JsonValue>;
        return {
          id: toStringValue(item.id, `dc-${index}`),
          title: toStringValue(item.productTitle ?? item.title, "Untitled"),
          price: toRupees(item.price),
          codePoolSize: typeof dc.codePoolSize === "number" ? dc.codePoolSize : null,
          codesAvailable: typeof dc.codesAvailable === "number" ? dc.codesAvailable : null,
          deliveryMethod: toStringValue(dc.codeDeliveryMethod, "auto-claim"),
          status: toStringValue(item.status, "draft"),
          createdAt: toRelativeDate(item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: () => "listingType==digital-code",
    primaryAction: { label: "New Digital Code", onClick: () => handleCreate() },
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
          title="Delete Digital Code Listing"
          message="Are you sure you want to delete this digital code listing? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
