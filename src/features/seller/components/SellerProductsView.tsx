"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { AdminListingScaffold } from "../../admin/components/AdminListingScaffold";

export interface SellerProductsViewProps extends ListingViewShellProps {
  renderHeader?: (onAdd: () => void) => React.ReactNode;
}

interface SellerProductsResponse {
  products?: unknown[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function SellerProductsView({
  renderHeader,
  children,
  ...props
}: SellerProductsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerProductsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["seller", "products", "listing"],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => ({
        id: toStringValue(item.id, `product-${index}`),
        primary: toStringValue(item.title ?? item.name, "Untitled product"),
        secondary: [
          toStringValue(item.sku, "No SKU"),
          toStringValue(item.condition ?? "Unknown condition", "Unknown condition"),
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
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
      title="My Products"
      subtitle="Manage your product listings, inventory, and pricing"
      actionLabel="New Listing"
      searchPlaceholder="Search products by name or SKU"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No products listed"
      resultSummary={`Showing ${rows.length} of ${total} products`}
    />
  );
}
