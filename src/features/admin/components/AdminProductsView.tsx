"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminProductsViewProps extends ListingViewShellProps {}

interface AdminProductsResponse {
  items?: unknown[];
  total?: number;
}

export function AdminProductsView({ children, ...props }: AdminProductsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminProductsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "products", "listing"],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `product-${index}`),
        primary: toStringValue(item.title ?? item.name, "Untitled product"),
        secondary: [
          toStringValue(item.sellerName, "Unknown seller"),
          toStringValue(item.sku, "No SKU"),
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
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
      title="Product Management"
      subtitle="Review catalogue health, publishing state, and merchandising issues from one queue."
      actionLabel="New product"
      searchPlaceholder="Search products, SKUs, or seller names"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No products found"
      resultSummary={`Showing ${rows.length} of ${total} products`}
    />
  );
}
