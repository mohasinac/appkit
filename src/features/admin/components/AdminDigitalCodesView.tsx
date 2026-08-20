"use client";

/**
 * AdminDigitalCodesView — admin browse of digital-code listings (W1-29).
 */

import { sortBy, type JsonArray } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit/client";
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

interface DigitalCodeRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  image?: string;
}

const ADMIN_DIGITAL_CODES_CONFIG: ListingViewConfig<AdminProductsResponse, DigitalCodeRow> = {
  portal: "admin",
  title: "Digital Codes",
  searchPlaceholder: "Search digital code listings",
  emptyLabel: "No digital code listings",
  filterKeys: [],
  defaultSort: sortBy("createdAt", "DESC"),
  queryKey: ["admin", "digital-codes", "listing"],
  endpoint: ADMIN_ENDPOINTS.PRODUCTS,
  sortOptions: [
    { value: sortBy("createdAt", "DESC"), label: "Newest" },
    { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    { value: "title", label: "Title A–Z" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => {
      const dc = (item.digitalCode ?? {}) as Record<string, JsonValue>;
      return {
        id: toStringValue(item.id, `dc-${index}`),
        primary: toStringValue(item.title ?? item.productTitle, "Untitled digital code"),
        secondary: [
          toStringValue(item.sellerName, "Unknown seller"),
          toCurrency(item.price),
          typeof dc.codesAvailable === "number"
            ? `${dc.codesAvailable} avail`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        status: toStringValue(item.status, "draft"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        image: toStringValue(item.mainImage, "") || undefined,
      };
    }),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => "listingType==digital-code",
  // Digital-code listings are products (filtered by listingType) — reuse
  // the real admin product edit page rather than leaving rows non-navigable.
  rowHrefTemplate: String(ROUTES.ADMIN.PRODUCTS_EDIT("{id}")),
};

export type AdminDigitalCodesViewProps = ListingLayoutProps;

export function AdminDigitalCodesView({ children, ...props }: AdminDigitalCodesViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_DIGITAL_CODES_CONFIG} />;
}
