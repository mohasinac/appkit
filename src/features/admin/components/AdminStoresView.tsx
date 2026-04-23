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

export interface AdminStoresViewProps extends ListingViewShellProps {}

interface AdminStoresResponse {
  items?: unknown[];
  total?: number;
}

export function AdminStoresView({ children, ...props }: AdminStoresViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminStoresResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "stores", "listing"],
    endpoint: ADMIN_ENDPOINTS.STORES,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `store-${index}`),
        primary: toStringValue(item.storeName, "Unnamed store"),
        secondary: [
          toStringValue(item.storeSlug, "No slug"),
          toStringValue(item.ownerId, "No owner"),
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
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
      title="Store Directory"
      subtitle="Review seller storefront health, verification, and merchandising quality from the shared listing shell."
      actionLabel="Approve store"
      searchPlaceholder="Search stores, slugs, or owner names"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No stores found"
      resultSummary={`Showing ${rows.length} of ${total} stores`}
    />
  );
}
