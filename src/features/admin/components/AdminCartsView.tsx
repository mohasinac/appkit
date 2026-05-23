"use client";

import React from "react";
import { FilterChipGroup, ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_CART_OWNERSHIP_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface AdminCartsResponse {
  items?: unknown[];
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
  filterKeys: ["type"],
  defaultSort: "-updatedAt",
  queryKey: ["admin", "carts", "listing"],
  endpoint: ADMIN_ENDPOINTS.ADMIN_CARTS,
  sortOptions: [
    { value: "-updatedAt", label: "Recently updated" },
    { value: "updatedAt", label: "Oldest" },
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
    state.type && state.type !== "All" ? `type==${state.type}` : undefined,
  renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
    <FilterChipGroup
      label="Type"
      tabs={ADMIN_CART_OWNERSHIP_TABS}
      value={pendingFilters.type ?? ""}
      onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
    />
  ),
};

export interface AdminCartsViewProps extends ListingLayoutProps {}

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
