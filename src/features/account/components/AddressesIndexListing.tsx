"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useAddresses } from "../hooks/useAddresses";
import { BulkActionBar, Div, ListingFilterDrawer, ListingToolbar, Stack, Text } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { AddressBook } from "./AddressBook";
import { AddressFilters } from "./AddressFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";

const FILTER_KEYS = ["addressType", "verified", "activeOnly"];

export interface AddressesIndexListingProps {
  onAdd?: () => void;
  onEdit?: (address: any) => void;
  onDelete?: (id: string) => void;
}

export function AddressesIndexListing({
  onAdd,
  onEdit,
  onDelete,
}: AddressesIndexListingProps) {
  const table = useUrlTable({ defaults: {} });
  const [view, setView] = useState<"grid" | "list">((table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID);
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);

  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const pendingTable = useMemo(() => ({
    get: (key: string) => pendingFilters[key] ?? "",
    getNumber: (key: string, fallback = 0) => {
      const v = pendingFilters[key];
      if (!v) return fallback;
      const n = Number(v);
      return isNaN(n) ? fallback : n;
    },
    set: (key: string, value: string) =>
      setPendingFilters((p) => ({ ...p, [key]: value })),
    setMany: (updates: Record<string, string>) =>
      setPendingFilters((p) => ({ ...p, ...updates })),
    clear: (keys?: string[]) => {
      const ks = keys ?? FILTER_KEYS;
      setPendingFilters((p) => ({
        ...p,
        ...Object.fromEntries(ks.map((k) => [k, ""])),
      }));
    },
    setPage: (_: number) => {},
    setPageSize: (_: number) => {},
    setSort: (_: string) => {},
    buildSieveParams: () => "",
    buildSearchParams: () => "",
    params: new URLSearchParams(),
  }), [pendingFilters]) as unknown as UrlTable;

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = {};
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { [TABLE_KEYS.QUERY]: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get(TABLE_KEYS.QUERY) || activeFilterCount > 0;

  const { data: addresses = [], isLoading } = useAddresses({
    filters: {
      q: table.get(TABLE_KEYS.QUERY) || undefined,
      addressType: table.get("addressType") || undefined,
      verified: table.get("verified") === "true" || undefined,
      activeOnly: table.get("activeOnly") === "true" || undefined,
    },
  });

  return (
    <Stack gap="md">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search by address, postcode or label..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        view={view}
        onViewChange={(v) => { if (v === "table") return; setView(v as "grid" | "list"); }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {/* ── Address list ────────────────────────────────────────────────── */}
      <Div className="px-3 sm:px-4">
        {isLoading ? (
          <Div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 dark:border-slate-700 animate-pulse p-4 space-y-2"
              >
                <Div className="h-4 w-1/3" surface="subtle" rounded="default" />
                <Div className="h-3 w-3/4" surface="subtle" rounded="default" />
                <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
              </div>
            ))}
          </Div>
        ) : addresses.length === 0 ? (
          <Text className="py-8" color="muted" size="sm" align="center">
            {table.get(TABLE_KEYS.QUERY) ? `No addresses matching "${table.get(TABLE_KEYS.QUERY)}"` : "No saved addresses."}
          </Text>
        ) : (
          <AddressBook
            addresses={addresses as any}
            onEdit={onEdit}
            onDelete={onDelete}
            onAdd={onAdd}
          />
        )}
      </Div>

      {/* ── Filter drawer ───────────────────────────────────────────────── */}
      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <AddressFilters table={pendingTable} />
      </ListingFilterDrawer>
    </Stack>
  );
}
