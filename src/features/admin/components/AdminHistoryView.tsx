"use client";

/**
 * AdminHistoryView — read-only admin insights for the top-level `history` collection.
 * One row per user with item count + last visit. Mirrors AdminWishlistsView.
 */
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

interface AdminHistoryResponse {
  items?: unknown[];
  total?: number;
}

interface HistoryRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const ADMIN_HISTORY_CONFIG: ListingViewConfig<AdminHistoryResponse, HistoryRow> = {
  portal: "admin",
  title: "History",
  searchPlaceholder: "Search by user ID",
  emptyLabel: "No user history records found",
  filterKeys: [],
  defaultSort: "-updatedAt",
  queryKey: ["admin", "history", "listing"],
  endpoint: ADMIN_ENDPOINTS.ADMIN_HISTORY,
  sortOptions: [
    { value: "-updatedAt", label: "Recently active" },
    { value: "-itemCount", label: "Largest first" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => {
      const itemCount = typeof item.itemCount === "number" ? item.itemCount : 0;
      const limit = typeof item.limit === "number" ? item.limit : 50;
      return {
        id: toStringValue(item.id, `hist-${index}`),
        primary: toStringValue(item.userId, "Unknown user"),
        secondary: `${itemCount} of ${limit} items`,
        status: itemCount >= limit ? "At cap" : itemCount >= limit - 5 ? "Near cap" : "OK",
        updatedAt: toRelativeDate(item.updatedAt),
      };
    }),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => undefined,
};

export type AdminHistoryViewProps = ListingLayoutProps;

export function AdminHistoryView({ children, ...props }: AdminHistoryViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_HISTORY_CONFIG} />;
}
