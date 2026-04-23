"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminBidsViewProps extends ListingViewShellProps {}

interface AdminBidsResponse {
  items?: unknown[];
  total?: number;
}

export function AdminBidsView({ children, ...props }: AdminBidsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminBidsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
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
        secondary: toStringValue(item.bidderId ?? item.userId, "Unknown bidder"),
        status: toStringValue(item.status, "Active"),
        updatedAt: toRelativeDate(item.bidDate ?? item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="Bid Oversight"
      subtitle="Review high-value bidding activity, outbid events, and auction integrity from one queue."
      actionLabel="Export bids"
      searchPlaceholder="Search bids, products, or bidder IDs"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No bids found"
      resultSummary={`Showing ${rows.length} of ${total} bids`}
    />
  );
}
