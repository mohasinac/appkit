"use client";

import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { ConfirmDeleteModal, FilterChipGroup, ListingLayout, RowActionMenu } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_AUCTION_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../../constants";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";

interface SellerAuctionsResponse {
  auctions?: unknown[];
  meta?: { total: number };
}

interface AuctionRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export interface SellerAuctionsViewProps extends ListingLayoutProps {
  renderHeader?: (onAdd: () => void) => React.ReactNode;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function SellerAuctionsView({
  children,
  onEditClick,
  onDelete,
  onBulkDelete,
  ...props
}: SellerAuctionsViewProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: (id) => `/api/store/products/${id}`,
    deleteFn: onDelete,
    successMessage: "Auction deleted.",
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

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="seller" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<SellerAuctionsResponse, AuctionRow> = {
    portal: "seller",
    title: "Auctions",
    searchPlaceholder: "Search auctions by product name",
    emptyLabel: "No auctions found",
    filterKeys: ["status"],
    defaultSort: sortBy("endsAt", "ASC"),
    queryKey: ["seller", "auctions", "listing"],
    endpoint: SELLER_ENDPOINTS.AUCTIONS,
    sortOptions: [
      { value: "endsAt", label: "Ending soon" },
      { value: sortBy("endsAt", "DESC"), label: "Ending latest" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.auctions).map((item, index) => ({
        id: toStringValue(item.id, `auction-${index}`),
        primary: toStringValue(item.productTitle ?? item.title, "Untitled auction"),
        secondary: [
          `Reserve: ${toRupees(item.reservePrice)}`,
          `Bids: ${item.bidCount ?? 0}`,
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.endsAt ?? item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
    buildFilters: (state) =>
      state.status && state.status !== "All" ? `status==${state.status}` : undefined,
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
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={SELLER_AUCTION_STATUS_TABS}
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
          title="Delete Auction"
          message="Are you sure you want to delete this auction? This cannot be undone."
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
