"use client";

import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Badge, ConfirmDeleteModal, FilterChipGroup, ListingLayout, RowActionMenu, Text } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_PRE_ORDER_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ROUTES } from "../../../constants";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";

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

export interface SellerPreOrdersViewProps extends ListingLayoutProps {
  onDelete?: (id: string) => Promise<void>;
}

export function SellerPreOrdersView({ children, onDelete, ...props }: SellerPreOrdersViewProps) {
  const dispatch = useActionDispatch();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: (id) => `/api/store/products/${id}`,
    deleteFn: onDelete,
    successMessage: "Pre-order deleted.",
    fetchOptions: { credentials: "include" },
  });

  const handleDelete = useCallback(
    async (id: string) => {
      await performDelete(id);
      setDeleteTargetId(null);
    },
    [performDelete],
  );

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="seller" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<SellerProductsResponse, PreOrderRow> = {
    portal: "seller",
    title: "Pre-Orders",
    searchPlaceholder: "Search pre-orders by name…",
    emptyLabel: "No pre-orders listed yet",
    filterKeys: ["status"],
    defaultSort: "-createdAt",
    queryKey: ["seller", "pre-orders", "listing"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: "-createdAt", label: "Newest" },
      { value: "createdAt", label: "Oldest" },
      { value: "title", label: "Title A–Z" },
      { value: "preorderAvailableDate", label: "Delivery Soon" },
    ],
    columns: PRE_ORDER_COLUMNS,
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
    buildFilters: (state) => {
      const status = state.status && state.status !== "All" ? `status==${state.status}` : null;
      return ["listingType==pre-order", status].filter(Boolean).join(",");
    },
    getRowHref: (row) => String(ROUTES.STORE.PRE_ORDERS_EDIT(row.id)),
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.STORE["edit-listing"].label,
            onClick: () =>
              void dispatch({ type: "NAVIGATE", href: String(ROUTES.STORE.PRE_ORDERS_EDIT(row.id)) }),
          },
          ...(onDelete
            ? [
                {
                  label: ACTIONS.STORE["delete-listing"].label,
                  destructive: true,
                  onClick: () => setDeleteTargetId(row.id),
                  disabled: deletingId === row.id,
                },
              ]
            : []),
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={SELLER_PRE_ORDER_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
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
    </>
  );
}
