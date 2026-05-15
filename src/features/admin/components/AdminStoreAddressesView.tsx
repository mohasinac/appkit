"use client";

import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, ListingToolbar, Pagination } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import {
  toRecordArray,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

const PAGE_SIZE = 25;
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
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [view, setView] = useState<"grid" | "list" | "table">("table");

  const resetAll = useCallback(() => {
    table.setMany({ q: "", sort: "" });
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminStoreAddressesResponse, StoreAddressRow>({
    queryKey: ["admin", "store-addresses", "listing"],
    endpoint: ADMIN_ENDPOINTS.STORE_ADDRESSES,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    q: table.get("q") || undefined,
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

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows ?? [], keyExtractor: (r: { id: string }) => r.id });

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
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
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
