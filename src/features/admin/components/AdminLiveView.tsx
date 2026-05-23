"use client";

/**
 * AdminLiveView — admin browse of live-item listings (W1-29).
 */

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface AdminProductsResponse {
  items?: unknown[];
  total?: number;
}

interface LiveRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const ADMIN_LIVE_CONFIG: ListingViewConfig<AdminProductsResponse, LiveRow> = {
  portal: "admin",
  title: "Live Items",
  searchPlaceholder: "Search live items",
  emptyLabel: "No live item listings",
  filterKeys: [],
  defaultSort: "-createdAt",
  queryKey: ["admin", "live-items", "listing"],
  endpoint: ADMIN_ENDPOINTS.PRODUCTS,
  sortOptions: [
    { value: "-createdAt", label: "Newest" },
    { value: "createdAt", label: "Oldest" },
    { value: "title", label: "Title A–Z" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => {
      const live = (item.liveItem ?? {}) as Record<string, unknown>;
      return {
        id: toStringValue(item.id, `live-${index}`),
        primary: toStringValue(item.title ?? item.productTitle, "Untitled live item"),
        secondary: [
          toStringValue(item.sellerName, "Unknown seller"),
          toRupees(item.price),
          toStringValue(live.species, ""),
          Boolean(live.vendorVerified) ? "verified" : "pending",
        ]
          .filter(Boolean)
          .join(" · "),
        status: toStringValue(item.status, "draft"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      };
    }),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => "listingType==live",
};

export type AdminLiveViewProps = ListingLayoutProps;

export function AdminLiveView({ children, ...props }: AdminLiveViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_LIVE_CONFIG} />;
}
