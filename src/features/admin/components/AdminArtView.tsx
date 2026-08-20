"use client";

/**
 * AdminArtView — admin browse of art print listings (EMI/art-stickers session).
 * Mirrors AdminClassifiedView's thin config-driven pattern.
 */

import { sortBy, type JsonArray } from "@mohasinac/appkit/client";
import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { ROUTES } from "../../../next/routing/route-map";

interface AdminProductsResponse {
  items?: JsonArray;
  total?: number;
}

interface ArtRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  image?: string;
}

const ADMIN_ART_CONFIG: ListingViewConfig<AdminProductsResponse, ArtRow> = {
  portal: "admin",
  title: "Art",
  searchPlaceholder: "Search art prints by name or seller",
  emptyLabel: "No art listings",
  filterKeys: [],
  defaultSort: sortBy("createdAt", "DESC"),
  queryKey: ["admin", "art", "listing"],
  endpoint: ADMIN_ENDPOINTS.PRODUCTS,
  sortOptions: [
    { value: sortBy("createdAt", "DESC"), label: "Newest" },
    { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    { value: "title", label: "Title A–Z" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => ({
      id: toStringValue(item.id, `art-${index}`),
      primary: toStringValue(item.title ?? item.productTitle, "Untitled print"),
      secondary: [
        toStringValue(item.sellerName, "Unknown seller"),
        toCurrency(item.price),
      ].join(" · "),
      status: toStringValue(item.status, "draft"),
      updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      image: toStringValue(item.mainImage, "") || undefined,
    })),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => "listingType==art",
  // Art listings are products (filtered by listingType) — reuse the real
  // admin product edit page rather than leaving rows non-navigable.
  rowHrefTemplate: String(ROUTES.ADMIN.PRODUCTS_EDIT("{id}")),
};

export type AdminArtViewProps = ListingLayoutProps;

export function AdminArtView({ children, ...props }: AdminArtViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_ART_CONFIG} />;
}
