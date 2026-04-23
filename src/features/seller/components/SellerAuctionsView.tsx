"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { AdminListingScaffold } from "../../admin/components/AdminListingScaffold";

export interface SellerAuctionsViewProps extends ListingViewShellProps {
  renderHeader?: (onAdd: () => void) => React.ReactNode;
}

interface SellerAuctionsResponse {
  auctions?: unknown[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function SellerAuctionsView({
  renderHeader,
  children,
  ...props
}: SellerAuctionsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerAuctionsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["seller", "auctions", "listing"],
    endpoint: SELLER_ENDPOINTS.AUCTIONS,
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
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  if (hasChildren) {
    return <ListingViewShell portal="seller" {...props}>{children}</ListingViewShell>;
  }

  return (
    <AdminListingScaffold
      portal="seller"
      {...props}
      title="Auctions"
      subtitle="Manage your active and draft auctions"
      actionLabel="New Auction"
      searchPlaceholder="Search auctions by product name"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No auctions found"
      resultSummary={`Showing ${rows.length} of ${total} auctions`}
    />
  );
}
