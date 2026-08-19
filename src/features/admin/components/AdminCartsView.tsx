"use client";

import { type JsonArray, SIEVE_OP, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { FilterChipGroup, ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface AdminCartsResponse {
  items?: JsonArray;
  total?: number;
}

interface CartRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const ADMIN_CARTS_CONFIG: ListingViewConfig<AdminCartsResponse, CartRow> = {
  portal: "admin",
  title: "Carts",
  searchPlaceholder: "Search by user ID or session",
  emptyLabel: "No carts found",
  filterKeys: ["ownership"],
  defaultSort: sortBy("updatedAt", "DESC"),
  queryKey: ["admin", "carts", "listing"],
  endpoint: ADMIN_ENDPOINTS.ADMIN_CARTS,
  sortOptions: [
    { value: sortBy("updatedAt", "DESC"), label: "Recently updated" },
    { value: sortBy("updatedAt", "ASC"), label: "Oldest" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => {
      const isGuest = !item.userId;
      const itemCount = Array.isArray(item.items) ? (item.items as unknown[]).length : 0;
      const sessionShort = toStringValue(item.sessionId, "").slice(0, 8);
      return {
        id: toStringValue(item.id, `cart-${index}`),
        primary: isGuest
          ? `Guest · ${sessionShort || "—"}`
          : toStringValue(item.userId, `user-${index}`),
        secondary: `${itemCount} item${itemCount !== 1 ? "s" : ""}`,
        status: isGuest ? "Guest" : "Authenticated",
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      };
    }),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: (state) =>
    // Guest carts store userId as an empty string (CartDocument.userId is a
    // required string, not optional, see mapRows below). Only the guest-only
    // direction is offered: an authenticated-only filter would need a NEQ
    // on userId combined with the default updatedAt sort, which Firestore
    // rejects (inequality filters require orderBy to match the same
    // field), and CartRepository Sieve config marks userId as not
    // sortable, so no safe workaround sort exists.
    state.ownership === "guest" ? sieveFilter("userId", SIEVE_OP.EQ, "") : undefined,
  renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
    <FilterChipGroup
      label="Ownership"
      tabs={[
        { id: "", label: "All" },
        { id: "guest", label: "Guest only" },
      ]}
      value={pendingFilters.ownership ?? ""}
      onChange={(id) => setPendingFilters((p) => ({ ...p, ownership: id }))}
      allId=""
    />
  ),
};

export type AdminCartsViewProps = ListingLayoutProps;

export function AdminCartsView({ children, ...props }: AdminCartsViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_CARTS_CONFIG} />;
}
