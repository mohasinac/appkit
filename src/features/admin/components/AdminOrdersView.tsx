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

export interface AdminOrdersViewProps extends ListingViewShellProps {}

interface AdminOrdersResponse {
  orders?: unknown[];
  meta?: {
    total?: number;
  };
}

export function AdminOrdersView({ children, ...props }: AdminOrdersViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminOrdersResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "orders", "listing"],
    endpoint: ADMIN_ENDPOINTS.ORDERS,
    mapRows: (response) =>
      toRecordArray(response.orders).map((item, index) => ({
        id: toStringValue(item.id, `order-${index}`),
        primary: `Order ${toStringValue(item.orderNumber ?? item.id, "-")}`,
        secondary: [
          toStringValue(item.buyerName ?? item.customerName, "Unknown buyer"),
          toRupees(item.totalAmount ?? item.total ?? item.amount),
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
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
      title="Order Operations"
      subtitle="Track payment, fulfillment, and delivery exceptions across the marketplace."
      actionLabel="Export orders"
      searchPlaceholder="Search orders, buyers, or tracking IDs"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No orders found"
      resultSummary={`Showing ${rows.length} of ${total} orders`}
    />
  );
}
