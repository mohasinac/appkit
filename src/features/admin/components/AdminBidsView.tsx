"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import {
  ConfirmDeleteModal,
  RowActionMenu,
  useToast,
} from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { apiClient } from "../../../http";

export interface AdminBidsViewProps extends ListingViewShellProps {}

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
  _raw?: Record<string, unknown>;
}

export function AdminBidsView({ children, ...props }: AdminBidsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<BidRow | null>(null);

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminBidsResponse,
    BidRow
  >({
    queryKey: ["admin", "bids", "listing"],
    endpoint: ADMIN_ENDPOINTS.BIDS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `bid-${index}`),
        primary: [
          toStringValue(item.productName ?? item.productTitle, "Unknown item"),
          toRupees(item.amount),
        ].join(" · "),
        secondary: toStringValue(item.bidderId ?? item.bidderName ?? item.userId, "Unknown bidder"),
        status: toStringValue(item.status, "active"),
        updatedAt: toRelativeDate(item.bidTime ?? item.bidDate ?? item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bidId: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.BID_BY_ID(bidId), { status: "cancelled" });
    },
    onSuccess: () => {
      showToast("Bid cancelled.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "bids"] });
      setCancelOpen(false);
      setSelectedRow(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to cancel bid.", "error");
    },
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        {...props}
        title="Bid Oversight"
        subtitle="Review high-value bidding activity, outbid events, and auction integrity from one queue."
        searchPlaceholder="Search bids, products, or bidder IDs"
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No bids found"
        resultSummary={`Showing ${rows.length} of ${total} bids`}
        renderRowActions={(row) => {
          const bidRow = row as BidRow;
          const isCancelled = bidRow.status === "cancelled" || bidRow.status === "voided";
          return (
            <RowActionMenu
              actions={[
                {
                  label: "Cancel bid",
                  destructive: true,
                  disabled: isCancelled,
                  onClick: () => {
                    setSelectedRow(bidRow);
                    setCancelOpen(true);
                  },
                },
              ]}
            />
          );
        }}
      />

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
