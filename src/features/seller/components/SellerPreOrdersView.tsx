"use client";

import { Row, SIEVE_OP, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Badge, ConfirmDeleteModal, Div, FilterChipGroup, ListingLayout, RowActionMenu, Span, Text } from "../../../ui";
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
        <Row className="w-10 h-10 bg-[var(--appkit-color-surface-raised)] border border-[var(--appkit-color-border)]" align="center" justify="center" rounded="lg">
          <Span size="xs" color="faint">–</Span>
        </Row>
      ),
  },
  {
    key: "primary",
    header: "Pre-order",
    render: (row) => (
      <Div className="space-y-1">
        <Text className="text-[var(--appkit-color-text)] line-clamp-1" weight="medium">{row.primary}</Text>
        <Span size="xs" color="muted">{row.secondary}</Span>
      </Div>
    ),
  },
  {
    key: "price",
    header: "Price",
    className: "w-28 text-right",
    render: (row) => (
      <Span size="sm" weight="medium" className="text-[var(--appkit-color-text)]">{row.price}</Span>
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
      <Span size="xs" color="muted">{row.deliveryDate}</Span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-28",
    render: (row) => (
      <Span size="xs" color="muted">{row.updatedAt}</Span>
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
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "pre-orders", "listing"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
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
      const status = state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : null;
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
