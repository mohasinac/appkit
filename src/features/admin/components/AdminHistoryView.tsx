"use client";

/**
 * AdminHistoryView — read-only admin insights for the top-level `history` collection.
 * One row per user with item count + last visit. Mirrors AdminWishlistsView.
 */
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

interface AdminHistoryResponse {
  items?: JsonArray;
  total?: number;
}

interface HistoryRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  /** Owning user — the row's only navigable target (see the view's comment). */
  userId: string;
}

const ADMIN_HISTORY_CONFIG: ListingViewConfig<AdminHistoryResponse, HistoryRow> = {
  portal: "admin",
  title: "History",
  searchPlaceholder: "Search by user ID",
  emptyLabel: "No user history records found",
  filterKeys: [],
  defaultSort: sortBy("updatedAt", "DESC"),
  queryKey: ["admin", "history", "listing"],
  endpoint: ADMIN_ENDPOINTS.ADMIN_HISTORY,
  sortOptions: [
    { value: sortBy("updatedAt", "DESC"), label: "Recently active" },
    { value: sortBy("itemCount", "DESC"), label: "Largest first" },
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
        userId: toStringValue(item.userId, ""),
      };
    }),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => undefined,
};

export type AdminHistoryViewProps = ListingLayoutProps;

export function AdminHistoryView({ children, ...props }: AdminHistoryViewProps) {
  const router = useRouter();

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  // Same shape as AdminWishlistsView: the list API returns only a per-user
  // summary (never the viewed items), so the row already shows its whole
  // record and the useful destination is the owning user's admin page.
  return (
    <DataListingView
      config={{
        ...ADMIN_HISTORY_CONFIG,
        onRowClick: (row) =>
          row.userId && router.push(String(ROUTES.ADMIN.USER_DETAIL(row.userId))),
      }}
    />
  );
}
