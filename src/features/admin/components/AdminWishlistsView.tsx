"use client";

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

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

const ADMIN_WISHLISTS_CONFIG: ListingViewConfig<AdminWishlistsResponse, WishlistRow> = {
  portal: "admin",
  title: "Wishlists",
  searchPlaceholder: "Search by user ID",
  emptyLabel: "No user wishlists found",
  filterKeys: [],
  defaultSort: "-updatedAt",
  queryKey: ["admin", "wishlists", "listing"],
  endpoint: ADMIN_ENDPOINTS.ADMIN_WISHLISTS,
  sortOptions: [
    { value: "-updatedAt", label: "Recently updated" },
    { value: "-itemCount", label: "Largest first" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => {
      const itemCount = typeof item.itemCount === "number" ? item.itemCount : 0;
      const limit = typeof item.limit === "number" ? item.limit : 20;
      const isFull = item.isFull === true;
      return {
        id: toStringValue(item.id, `wish-${index}`),
        primary: toStringValue(item.userId, "Unknown user"),
        secondary: `${itemCount} item${itemCount === 1 ? "" : "s"} of ${limit}`,
        status: isFull ? "Full" : itemCount >= limit - 2 ? "Near cap" : "OK",
        updatedAt: toRelativeDate(item.updatedAt),
      };
    }),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => undefined,
};

export type AdminWishlistsViewProps = ListingLayoutProps;

export function AdminWishlistsView({ children, ...props }: AdminWishlistsViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_WISHLISTS_CONFIG} />;
}
