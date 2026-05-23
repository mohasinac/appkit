"use client";

import React from "react";
import { ListingToolbar, Pagination } from "../../../ui";
import {
  toRecordArray,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

const DEFAULT_SORT = "storeId";
const SORT_OPTIONS = [
  { value: "storeId", label: "Store ID" },
  { value: "city", label: "City A–Z" },
];

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

export function AdminStoreAddressesView({ children: _children }: AdminStoreAddressesViewProps) {
  const listing = useAdminListing<AdminStoreAddressesResponse, StoreAddressRow>({
    filterKeys: [],
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "store-addresses", "listing"],
    endpoint: ADMIN_ENDPOINTS.STORE_ADDRESSES,
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
    buildFilters: () => undefined,
  });

  const { view, setView, table, searchInput, setSearchInput, commitSearch, hasActiveState, resetAll, rows, isLoading, errorMessage, currentPage, totalPages, selection } = listing;

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={0}
        searchValue={searchInput}
        searchPlaceholder="Search by label, city, or store ID"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
            {errorMessage}
          </div>
        )}
        {view === "table" ? (
          <DataTable rows={rows} isLoading={isLoading} emptyLabel="No store addresses found" />
        ) : (
          <AdminViewCards rows={rows} view={view} isLoading={isLoading} emptyLabel="No store addresses found" onRowClick={undefined} selectedIdSet={selection.selectedIdSet} onToggleSelect={selection.toggle} />
        )}
      </div>
    </div>
  );
}
