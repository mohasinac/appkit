"use client";

import { sortBy, type JsonArray } from "@mohasinac/appkit";
import React from "react";
import {
  toRecordArray,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

interface AdminStoreAddressesResponse {
  items?: JsonArray;
  total?: number;
}

interface StoreAddressRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const ADMIN_STORE_ADDRESSES_CONFIG: ListingViewConfig<AdminStoreAddressesResponse, StoreAddressRow> = {
  portal: "admin",
  title: "Store Addresses",
  searchPlaceholder: "Search by label, city, or store ID",
  emptyLabel: "No store addresses found",
  filterKeys: [],
  defaultSort: sortBy("storeId", "ASC"),
  queryKey: ["admin", "store-addresses", "listing"],
  endpoint: ADMIN_ENDPOINTS.STORE_ADDRESSES,
  sortOptions: [
    { value: "storeId", label: "Store ID" },
    { value: "city", label: "City A–Z" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => ({
      id: toStringValue(item.id, `addr-${index}`),
      primary: [
        toStringValue(item.label, "Address"),
        toStringValue(item.city, ""),
        toStringValue(item.state, ""),
      ]
        .filter(Boolean)
        .join(", "),
      secondary: [
        toStringValue(item.storeId ?? item.storeName, "Unknown store"),
        toStringValue(item.postalCode, ""),
      ]
        .filter(Boolean)
        .join(" · "),
      status: item.isDefault ? "default" : "standard",
      updatedAt: toStringValue(item.storeId, ""),
    })),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => undefined,
};

export interface AdminStoreAddressesViewProps {
  children?: React.ReactNode;
}

export function AdminStoreAddressesView(_props: AdminStoreAddressesViewProps) {
  return <DataListingView config={ADMIN_STORE_ADDRESSES_CONFIG} />;
}
