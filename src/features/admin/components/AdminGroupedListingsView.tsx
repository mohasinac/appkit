"use client";

/**
 * AdminGroupedListingsView — admin moderation view for grouped product listings.
 * W1-29 — pairs with the new GET /api/admin/grouped-listings endpoint.
 */

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface AdminGroupedListingsResponse {
  items?: unknown[];
  total?: number;
}

interface GroupedListingRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const ADMIN_GROUPED_LISTINGS_CONFIG: ListingViewConfig<
  AdminGroupedListingsResponse,
  GroupedListingRow
> = {
  portal: "admin",
  title: "Grouped Listings",
  searchPlaceholder: "Search grouped listings by title or seller",
  emptyLabel: "No grouped listings",
  filterKeys: [],
  defaultSort: "-createdAt",
  queryKey: ["admin", "grouped-listings"],
  endpoint: "/api/admin/grouped-listings",
  sortOptions: [
    { value: "-createdAt", label: "Newest" },
    { value: "createdAt", label: "Oldest" },
    { value: "title", label: "Title A–Z" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => ({
      id: toStringValue(item.id, `grouped-listing-${index}`),
      primary: toStringValue(item.title ?? item.name, "Untitled group"),
      secondary: [
        toStringValue(item.storeName ?? item.storeId, "Unknown store"),
        `${Array.isArray(item.productIds) ? item.productIds.length : 0} items`,
      ].join(" · "),
      status: toStringValue(item.isActive === false ? "inactive" : "active", "active"),
      updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
    })),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => "",
};

export type AdminGroupedListingsViewProps = ListingLayoutProps;

export function AdminGroupedListingsView({
  children,
  ...props
}: AdminGroupedListingsViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_GROUPED_LISTINGS_CONFIG} />;
}
