"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDeleteModal, FilterChipGroup, ListingLayout, RowActionMenu, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BID_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";

interface AdminBidsResponse {
  items?: unknown[];
  total?: number;
}

interface BidRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export type AdminBidsViewProps = ListingLayoutProps;

export function AdminBidsView({ children, ...props }: AdminBidsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BidRow | null>(null);

  const cancelMutation = useApiMutation({
    mutationFn: async (bidId: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.BID_BY_ID(bidId), { status: "cancelled" });
    },
    onSuccess: () => {
      showToast("Bid cancelled.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "bids"] });
      setCancelOpen(false);
      setSelectedRow(null);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to cancel bid.", "error");
    },
  });

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminBidsResponse, BidRow> = {
    portal: "admin",
    title: "Bids",
    searchPlaceholder: "Search bids, products, or bidder IDs",
    emptyLabel: "No bids found",
    filterKeys: ["status"],
    defaultSort: sortBy("bidTime", "DESC"),
    queryKey: ["admin", "bids", "listing"],
    endpoint: ADMIN_ENDPOINTS.BIDS,
    sortOptions: [
      { value: sortBy("bidTime", "DESC"), label: "Newest" },
      { value: "bidTime", label: "Oldest" },
      { value: sortBy("amount", "DESC"), label: "Highest amount" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `bid-${index}`),
        primary: [
          toStringValue(item.productName ?? item.productTitle, "Unknown item"),
          toRupees(item.amount),
        ].join(" · "),
        secondary: toStringValue(item.bidderId ?? item.bidderName ?? item.userId, "Unknown bidder"),
        status: toStringValue(item.status, "active"),
        updatedAt: toRelativeDate(
          item.bidTime ?? item.bidDate ?? item.updatedAt ?? item.createdAt,
        ),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) =>
      state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined,
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: ROW_ACTION_ID.CANCEL,
        label: ACTIONS.ADMIN["cancel-bid"].label,
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderRowActions: (row) => {
      const isCancelled = row.status === "cancelled" || row.status === "voided";
      return (
        <RowActionMenu
          actions={[
            {
              label: ROW_ACTION_META[ROW_ACTION_ID.CANCEL].label,
              destructive: ROW_ACTION_META[ROW_ACTION_ID.CANCEL].destructive,
              disabled: isCancelled,
              onClick: () => {
                setSelectedRow(row);
                setCancelOpen(true);
              },
            },
          ]}
        />
      );
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_BID_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <ConfirmDeleteModal
        isOpen={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setSelectedRow(null);
        }}
        onConfirm={() => {
          if (selectedRow) cancelMutation.mutate(selectedRow.id);
        }}
        isDeleting={cancelMutation.isPending}
        title="Cancel this bid?"
        message="This will mark the bid as cancelled and notify the bidder. The auction will continue with remaining active bids."
        confirmText="Cancel bid"
        variant="warning"
      />
    </>
  );
}
