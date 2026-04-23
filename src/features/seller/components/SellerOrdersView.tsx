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

export interface SellerOrdersViewProps extends ListingViewShellProps {}

interface SellerOrdersResponse {
  orders?: unknown[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function SellerOrdersView({
  children,
  ...props
}: SellerOrdersViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerOrdersResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["seller", "orders", "listing"],
    endpoint: SELLER_ENDPOINTS.ORDERS,
    mapRows: (response) =>
      toRecordArray(response.orders).map((item, index) => ({
        id: toStringValue(item.id, `order-${index}`),
        primary: toStringValue(item.orderNumber ?? `#${item.id}`, "Order"),
        secondary: [
          toStringValue(item.buyerName ?? "Unknown buyer", "Unknown buyer"),
          toRupees(item.totalAmount ?? item.total),
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.orderDate ?? item.createdAt),
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
      title="Orders"
      subtitle="Track all orders for your products"
      actionLabel=""
      searchPlaceholder="Search by order #, buyer name, or product"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No orders found"
      resultSummary={`Showing ${rows.length} of ${total} orders`}
    />
  );
}
