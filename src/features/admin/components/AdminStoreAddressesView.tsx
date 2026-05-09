"use client";

import React from "react";
import {
  toRecordArray,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

interface AdminStoreAddressesResponse {
  items?: unknown[];
  total?: number;
}

interface StoreAddressRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export interface AdminStoreAddressesViewProps {
  children?: React.ReactNode;
}

export function AdminStoreAddressesView({ children }: AdminStoreAddressesViewProps) {
  const [storeFilter, setStoreFilter] = React.useState("");

  const endpoint = storeFilter
    ? `${ADMIN_ENDPOINTS.STORE_ADDRESSES}?storeId=${encodeURIComponent(storeFilter)}`
    : ADMIN_ENDPOINTS.STORE_ADDRESSES;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminStoreAddressesResponse,
    StoreAddressRow
  >({
    queryKey: ["admin", "store-addresses", "listing", storeFilter],
    endpoint,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `addr-${index}`),
        primary: [
          toStringValue(item.label, "Address"),
          toStringValue(item.city, ""),
          toStringValue(item.state, ""),
        ].filter(Boolean).join(", "),
        secondary: [
          toStringValue(item.storeId ?? item.storeName, "Unknown store"),
          toStringValue(item.pincode, ""),
        ].filter(Boolean).join(" · "),
        status: item.isPickupLocation ? "pickup" : "standard",
        updatedAt: toStringValue(item.storeId, ""),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  return (
    <AdminListingScaffold
      portal="admin"
      title="Store Addresses"
      searchPlaceholder="Search by label, city, or store ID"
      subtitle="Read-only overview of store pickup locations and shipping addresses across all stores."
      emptyLabel="No store addresses found"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      resultSummary={`${total} address${total === 1 ? "" : "es"}`}
    />
  );
}
