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

export interface AdminPayoutsViewProps extends ListingViewShellProps {}

interface AdminPayoutsResponse {
  payouts?: unknown[];
  meta?: {
    total?: number;
  };
}

export function AdminPayoutsView({ children, ...props }: AdminPayoutsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminPayoutsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "payouts", "listing"],
    endpoint: ADMIN_ENDPOINTS.PAYOUTS,
    mapRows: (response) =>
      toRecordArray(response.payouts).map((item, index) => ({
        id: toStringValue(item.id, `payout-${index}`),
        primary: [
          `Payout ${toStringValue(item.id, "-")}`,
          toRupees(item.amount),
        ].join(" · "),
        secondary: toStringValue(item.sellerName ?? item.sellerEmail, "Unknown seller"),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="Payout Operations"
      subtitle="Monitor payout eligibility, dispatch readiness, and failure follow-up in one operational queue."
      actionLabel="Run payout batch"
      searchPlaceholder="Search sellers, payout IDs, or order groups"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No payouts found"
      resultSummary={`Showing ${rows.length} of ${total} payouts`}
    />
  );
}
