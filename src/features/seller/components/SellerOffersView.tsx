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

export interface SellerOffersViewProps extends ListingViewShellProps {}

interface SellerOffersResponse {
  offers?: unknown[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function SellerOffersView({ children, ...props}: SellerOffersViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerOffersResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["seller", "offers", "listing"],
    endpoint: SELLER_ENDPOINTS.OFFERS,
    mapRows: (response) =>
      toRecordArray(response.offers).map((item, index) => ({
        id: toStringValue(item.id, `offer-${index}`),
        primary: toStringValue(item.productTitle ?? item.title, "Untitled product"),
        secondary: [
          `Offer: ${toRupees(item.offerAmount ?? item.amount)}`,
          toStringValue(item.buyerName ?? "Unknown buyer", "Unknown buyer"),
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
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
      title="Offers Received"
      subtitle="Negotiate and accept buyer offers on your products"
      actionLabel=""
      searchPlaceholder="Search offers by product or buyer name"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No offers received"
      resultSummary={`Showing ${rows.length} of ${total} offers`}
    />
  );
}
