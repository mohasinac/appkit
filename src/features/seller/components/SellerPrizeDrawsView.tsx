"use client";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { Badge, ConfirmDeleteModal, Div, FilterChipGroup, ListingLayout, RowActionMenu, Span, Text } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_PRIZE_DRAW_STATUS_TABS } from "../../admin/constants/filter-tabs";
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

interface PrizeDrawRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  entryFee: string;
  drawDate: string;
  updatedAt: string;
  imageUrl?: string;
}

interface SellerProductsResponse {
  products?: unknown[];
  meta?: { total: number };
}

const STATUS_VARIANT: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  active: "success",
  draft: "default",
  ended: "secondary",
  cancelled: "danger",
};

const PRIZE_DRAW_COLUMNS: AdminTableColumn<PrizeDrawRow>[] = [
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
        <Div className="w-10 h-10 rounded-lg bg-[var(--appkit-color-surface-raised)] border border-[var(--appkit-color-border)] flex items-center justify-center">
          <Span size="xs" color="faint">–</Span>
        </Div>
      ),
  },
  {
    key: "primary",
    header: "Prize Draw",
    render: (row) => (
      <Div className="space-y-1">
        <Text className="font-medium text-[var(--appkit-color-text)] line-clamp-1">{row.primary}</Text>
        <Span size="xs" color="muted">{row.secondary}</Span>
      </Div>
    ),
  },
  {
    key: "entryFee",
    header: "Entry Fee",
    className: "w-28 text-right",
    render: (row) => (
      <Span size="sm" weight="medium" className="text-[var(--appkit-color-text)]">{row.entryFee}</Span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => (
      <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>{row.status}</Badge>
    ),
  },
  {
    key: "drawDate",
    header: "Draw Date",
    className: "w-32",
    render: (row) => (
      <Span size="xs" color="muted">{row.drawDate}</Span>
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

export interface SellerPrizeDrawsViewProps extends ListingLayoutProps {
  onDelete?: (id: string) => Promise<void>;
}

export function SellerPrizeDrawsView({ children, onDelete, ...props }: SellerPrizeDrawsViewProps) {
  const dispatch = useActionDispatch();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: (id) => `/api/store/products/${id}`,
    deleteFn: onDelete,
    successMessage: "Prize draw deleted.",
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

  const config: ListingViewConfig<SellerProductsResponse, PrizeDrawRow> = {
    portal: "seller",
    title: "Prize Draws",
    searchPlaceholder: "Search prize draws by name…",
    emptyLabel: "No prize draws listed yet",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "prize-draws", "listing"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "title", label: "Title A–Z" },
      { value: "prizeDrawEndDate", label: "Draw Date Soon" },
    ],
    columns: PRIZE_DRAW_COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => {
        const priceRaw = typeof item.price === "number" ? item.price : 0;
        return {
          id: toStringValue(item.id, `prize-draw-${index}`),
          primary: toStringValue(item.title ?? item.name, "Untitled prize draw"),
          secondary: toStringValue(item.condition, ""),
          status: toStringValue(item.status, "draft"),
          entryFee: priceRaw ? toRupees(priceRaw) : "Free",
          drawDate: item.prizeDrawEndDate
            ? toRelativeDate(item.prizeDrawEndDate as string)
            : "TBA",
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          imageUrl: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: (state) => {
      const status = state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : null;
      return ["listingType==prize-draw", status].filter(Boolean).join(",");
    },
    getRowHref: (row) => String(ROUTES.STORE.PRIZE_DRAWS_EDIT(row.id)),
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.STORE["edit-listing"].label,
            onClick: () =>
              void dispatch({ type: "NAVIGATE", href: String(ROUTES.STORE.PRIZE_DRAWS_EDIT(row.id)) }),
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
        tabs={SELLER_PRIZE_DRAW_STATUS_TABS}
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
          title="Delete Prize Draw"
          message="Are you sure you want to delete this prize draw listing? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
