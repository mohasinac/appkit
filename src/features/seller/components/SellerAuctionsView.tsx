"use client";

import { sieveFilter, SIEVE_OP, type JsonArray } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { ConfirmDeleteModal, FilterChipGroup, ListingLayout, RowActionMenu } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { SELLER_AUCTION_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../../constants";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { SELLER_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";

interface SellerAuctionsResponse {
  auctions?: JsonArray;
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
  // Independent of DataListingView's own internal useUrlTable() — both read
  // and write the same URL, useUrlTable has no local state, so they stay in
  // sync (same pattern SellerProductsView already uses for its "Show sold"
  // toggle).
  const toggleTable = useUrlTable({});
  const showEnded = toggleTable.get(TABLE_KEYS.SHOW_ENDED) === "true";
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: SELLER_ENDPOINTS.PRODUCT_BY_ID,
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
    filterKeys: ["status", TABLE_KEYS.SHOW_ENDED],
    defaultSort: sortBy("auctionEndDate", "ASC"),
    queryKey: ["seller", "auctions", "listing"],
    endpoint: SELLER_ENDPOINTS.AUCTIONS,
    sortOptions: [
      { value: "auctionEndDate", label: "Ending soon" },
      { value: sortBy("auctionEndDate", "DESC"), label: "Ending latest" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.auctions).map((item, index) => ({
        id: toStringValue(item.id, `auction-${index}`),
        primary: toStringValue(item.productTitle ?? item.title, "Untitled auction"),
        secondary: [
          `Reserve: ${toCurrency(item.reservePrice)}`,
          `Bids: ${item.bidCount ?? 0}`,
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.endsAt ?? item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
    buildFilters: (state) => {
      // Previously missing entirely — the seller Auctions tab silently
      // listed the entire seller catalog, not just auctions.
      const parts = ["listingType==auction"];
      if (state.status && state.status !== "All") parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      if (state[TABLE_KEYS.SHOW_ENDED] !== "true") {
        parts.push(sieveFilter("auctionEndDate", SIEVE_OP.GTE, new Date().toISOString()));
      }
      return parts.join(",");
    },
    toggles: [
      {
        label: "Show ended",
        active: showEnded,
        onChange: (next) => toggleTable.set(TABLE_KEYS.SHOW_ENDED, next ? "true" : ""),
      },
    ],
    // Rule #7: bulk-action array sourced from the SELLER_BULK_ACTIONS preset.
    buildBulkActions: onBulkDelete
      ? (selection): BulkActionItem[] =>
          SELLER_BULK_ACTIONS.auctions.map((id) => ({
            id,
            label: ROW_ACTION_META[id].label,
            destructive: ROW_ACTION_META[id].destructive,
            onClick: async () => {
              await onBulkDelete(selection.selectedIds);
              selection.clearSelection();
            },
          }))
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
