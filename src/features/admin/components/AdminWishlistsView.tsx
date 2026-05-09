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

export interface AdminWishlistsViewProps extends ListingViewShellProps {}

interface AdminWishlistsResponse {
  items?: unknown[];
  total?: number;
}

interface WishlistRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminWishlistsView({ children, ...props }: AdminWishlistsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminWishlistsResponse,
    WishlistRow
  >({
    queryKey: ["admin", "wishlists", "listing", q],
    endpoint: ADMIN_ENDPOINTS.ADMIN_WISHLISTS,
    q,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `wish-${index}`),
        primary: toStringValue(item.productTitle ?? item.productId, "Unknown product"),
        secondary: [
          toStringValue(item.userId, ""),
          toRupees(item.priceAtAdd),
        ].filter(Boolean).join(" · "),
        status: "—",
        updatedAt: toRelativeDate(item.addedAt ?? item.createdAt),
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
      title="Wishlist Insights"
      subtitle="Identify the most-wishlisted products to inform merchandising and promotions strategy."
      searchPlaceholder="Search by product or user ID"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No wishlist items found"
      resultSummary={`Showing ${rows.length} of ${total} items`}
    />
  );
}
