"use client";

/**
 * AdminStickersView — admin browse of sticker listings (EMI/art-stickers session).
 * Mirrors AdminClassifiedView's thin config-driven pattern.
 */

import { sortBy, type JsonArray } from "@mohasinac/appkit";
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
  items?: JsonArray;
  total?: number;
}

interface StickersRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const ADMIN_STICKERS_CONFIG: ListingViewConfig<AdminProductsResponse, StickersRow> = {
  portal: "admin",
  title: "Stickers",
  searchPlaceholder: "Search stickers by name or seller",
  emptyLabel: "No sticker listings",
  filterKeys: [],
  defaultSort: sortBy("createdAt", "DESC"),
  queryKey: ["admin", "stickers", "listing"],
  endpoint: ADMIN_ENDPOINTS.PRODUCTS,
  sortOptions: [
    { value: sortBy("createdAt", "DESC"), label: "Newest" },
    { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    { value: "title", label: "Title A–Z" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => ({
      id: toStringValue(item.id, `stickers-${index}`),
      primary: toStringValue(item.title ?? item.productTitle, "Untitled sticker listing"),
      secondary: [
        toStringValue(item.sellerName, "Unknown seller"),
        toRupees(item.price),
      ].join(" · "),
      status: toStringValue(item.status, "draft"),
      updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
    })),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => "listingType==stickers",
};

export type AdminStickersViewProps = ListingLayoutProps;

export function AdminStickersView({ children, ...props }: AdminStickersViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_STICKERS_CONFIG} />;
}
