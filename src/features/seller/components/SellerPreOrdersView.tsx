"use client";

import { Row, SIEVE_OP, Stack, sieveFilter, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Badge, ConfirmDeleteModal, Div, FilterChipGroup, ListingLayout, RowActionMenu, Span, Text } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_PRE_ORDER_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ROUTES } from "../../../constants";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
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
  /** Alias of `imageUrl` for AdminViewCards' list/grid avatar (generic `AdminListingScaffoldRow.image` field name). */
  image?: string;
}

interface SellerProductsResponse {
  products?: JsonArray;
  meta?: { total: number };
}

const PRE_ORDER_COLUMNS: AdminTableColumn<PreOrderRow>[] = [
  {
    key: "thumbnail",
    header: "",
    className: "w-12",
    render: (row) =>
      row.imageUrl ? (
        <Div className="relative w-10 h-10 flex-shrink-0 border border-[var(--appkit-color-border)]" rounded="lg" overflow="hidden">
          <MediaImage src={row.imageUrl} alt="" size="thumbnail" />
        </Div>
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
      <Stack gap="xs">
        <Text className="text-[var(--appkit-color-text)] line-clamp-1" weight="medium">{row.primary}</Text>
        <Span size="xs" color="muted">{row.secondary}</Span>
      </Stack>
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
      // Real ProductStatus is draft|published|in_review|archived — "active"
      // fixed to "published"; "cancelled" is not a stored status value.
      const variant =
        row.status === "published"
          ? "success"
          : row.status === "draft"
            ? "default"
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
    endpoint: SELLER_ENDPOINTS.PRODUCT_BY_ID,
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
      { value: "preOrderDeliveryDate", label: "Delivery Soon" },
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
          price: priceRaw ? toCurrency(priceRaw) : "—",
          deliveryDate: item.preOrderDeliveryDate
            ? toRelativeDate(item.preOrderDeliveryDate as string)
            : "TBA",
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          imageUrl: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
          image: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    // No "Show closed" toggle here (unlike Auctions/Prize Draws): the public
    // PreOrdersIndexListing equivalent filters on stockQuantity>0, a range
    // filter, which cannot be combined with this view's title/
    // preOrderDeliveryDate/createdAt sort options without violating
    // Firestore's orderBy-must-match-the-range-field rule (confirmed by
    // appkit/scripts/audit-listing-indices.mjs QUERY_UNSATISFIABLE). Fixing
    // this properly would mean constraining sort choices per toggle state,
    // out of scope for this pass — left as a real gap, not silently broken.
    buildFilters: (state) => {
      const status = state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : null;
      return ["listingType==pre-order", status].filter(Boolean).join(",");
    },
    rowHrefTemplate: String(ROUTES.STORE.PRE_ORDERS_EDIT("{id}")),
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
