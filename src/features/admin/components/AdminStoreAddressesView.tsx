"use client";

import { sortBy, type JsonArray } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import {
  toRecordArray,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { RecordDetailModal } from "../../../ui";
import type { JsonValue } from "../../../schemas/types";

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
  _raw: Record<string, JsonValue>;
}

const ADMIN_STORE_ADDRESSES_CONFIG: ListingViewConfig<AdminStoreAddressesResponse, StoreAddressRow> = {
  portal: "admin",
  title: "Store Addresses",
  // Search intentionally absent: this endpoint does not read `q`, so the box accepted typing and changed nothing. Restore it when the collection gains searchTxt — audit-listing-search-capability tracks it.
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
      _raw: item,
    })),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: () => undefined,
};

export interface AdminStoreAddressesViewProps {
  children?: React.ReactNode;
}

export function AdminStoreAddressesView(_props: AdminStoreAddressesViewProps) {
  const [selected, setSelected] = useState<StoreAddressRow | null>(null);
  const raw = selected?._raw ?? {};

  return (
    <>
      <DataListingView
        config={{ ...ADMIN_STORE_ADDRESSES_CONFIG, onRowClick: (row) => setSelected(row) }}
      />
      <RecordDetailModal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={toStringValue(raw.label, "Store Address")}
        badges={
          raw.isDefault
            ? [{ label: "Default pickup location", variant: "info" as const }]
            : undefined
        }
        fields={[
          { label: "Store", value: toStringValue(raw.storeName ?? raw.storeId, "—") },
          { label: "Contact", value: toStringValue(raw.fullName, "—") },
          { label: "Phone", value: toStringValue(raw.phone, "—") },
          { label: "Address", value: toStringValue(raw.addressLine1, "—") },
          ...(raw.addressLine2
            ? [{ label: "Address line 2", value: toStringValue(raw.addressLine2, "—") }]
            : []),
          ...(raw.landmark ? [{ label: "Landmark", value: toStringValue(raw.landmark, "—") }] : []),
          { label: "City", value: toStringValue(raw.city, "—") },
          { label: "State", value: toStringValue(raw.state, "—") },
          { label: "Postal code", value: toStringValue(raw.postalCode ?? raw.pincode, "—") },
          { label: "Country", value: toStringValue(raw.country, "India") },
        ]}
      />
    </>
  );
}
