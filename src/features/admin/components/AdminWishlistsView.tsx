"use client";

import { sortBy, type JsonArray } from "@mohasinac/appkit/client";
import React from "react";
import { useRouter } from "next/navigation";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface AdminWishlistsResponse {
  items?: JsonArray;
  total?: number;
}

interface WishlistRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  /** Owning user — the row's only navigable target (see the view's comment). */
  userId: string;
}

const ADMIN_WISHLISTS_CONFIG: ListingViewConfig<AdminWishlistsResponse, WishlistRow> = {
  portal: "admin",
  title: "Wishlists",
  searchPlaceholder: "Search by user ID",
  emptyLabel: "No user wishlists found",
  filterKeys: [],
  defaultSort: sortBy("updatedAt", "DESC"),
  queryKey: ["admin", "wishlists", "listing"],
  endpoint: ADMIN_ENDPOINTS.ADMIN_WISHLISTS,
  sortOptions: [
    { value: sortBy("updatedAt", "DESC"), label: "Recently updated" },
    { value: sortBy("itemCount", "DESC"), label: "Largest first" },
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
        userId: toStringValue(item.userId, ""),
      };
    }),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => undefined,
};

export type AdminWishlistsViewProps = ListingLayoutProps;

export function AdminWishlistsView({ children, ...props }: AdminWishlistsViewProps) {
  const router = useRouter();

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  // The list API (`wishlistRepository.findAllSummaries()`) deliberately
  // returns only {userId, itemCount, isFull, updatedAt} — never the items
  // themselves, since pulling every user's ≤20 items into one payload is
  // exactly the unbounded-response shape Rule #6 forbids. So the row already
  // shows its whole record, and the genuinely useful destination is the
  // owning user's admin page, which renders their real detail.
  return (
    <DataListingView
      config={{
        ...ADMIN_WISHLISTS_CONFIG,
        onRowClick: (row) =>
          row.userId && router.push(String(ROUTES.ADMIN.USER_DETAIL(row.userId))),
      }}
    />
  );
}
