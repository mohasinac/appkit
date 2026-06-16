"use client";

/**
 * AdminClassifiedView — admin browse of classified listings (W1-29).
 * Read-only summary with edit-handoff to the seller-portal edit route.
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

interface ClassifiedRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const ADMIN_CLASSIFIED_CONFIG: ListingViewConfig<AdminProductsResponse, ClassifiedRow> = {
  portal: "admin",
  title: "Classified",
  searchPlaceholder: "Search classified by name or seller",
  emptyLabel: "No classified listings",
  filterKeys: [],
  defaultSort: sortBy("createdAt", "DESC"),
  queryKey: ["admin", "classified", "listing"],
  endpoint: ADMIN_ENDPOINTS.PRODUCTS,
  sortOptions: [
    { value: sortBy("createdAt", "DESC"), label: "Newest" },
    { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    { value: "title", label: "Title A–Z" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => ({
      id: toStringValue(item.id, `classified-${index}`),
      primary: toStringValue(item.title ?? item.productTitle, "Untitled classified"),
      secondary: [
        toStringValue(item.sellerName, "Unknown seller"),
        toRupees(item.price),
      ].join(" · "),
      status: toStringValue(item.status, "draft"),
      updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
    })),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => "listingType==classified",
};

export type AdminClassifiedViewProps = ListingLayoutProps;

export function AdminClassifiedView({ children, ...props }: AdminClassifiedViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_CLASSIFIED_CONFIG} />;
}
