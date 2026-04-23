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

export interface SellerPayoutsViewProps extends ListingViewShellProps {}

interface SellerPayoutsResponse {
  payouts?: unknown[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function SellerPayoutsView({ children, ...props}: SellerPayoutsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerPayoutsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["seller", "payouts", "listing"],
    endpoint: SELLER_ENDPOINTS.PAYOUTS,
    mapRows: (response) =>
      toRecordArray(response.payouts).map((item, index) => ({
        id: toStringValue(item.id, `payout-${index}`),
        primary: `Payout #${toStringValue(item.payoutNumber ?? item.id, "Unknown")}`,
        secondary: [
          toRupees(item.amount ?? item.totalAmount),
          `Requested: ${toRelativeDate(item.requestedAt ?? item.createdAt)}`,
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.processedAt ?? item.updatedAt ?? item.createdAt),
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
      title="Payout History"
      subtitle="Track all payouts to your bank account"
      actionLabel="Request Payout"
      searchPlaceholder="Search payouts by payout # or amount"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No payouts found"
      resultSummary={`Showing ${rows.length} of ${total} payouts`}
    />
  );
}
