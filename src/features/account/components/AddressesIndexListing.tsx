"use client";
import React, { useState, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useAddresses } from "../hooks/useAddresses";
import { BulkActionBar, ListingToolbar } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { AddressBook } from "./AddressBook";
import { AddressFilters } from "./AddressFilters";
import type { UrlTable } from "../../filters/FilterPanel";

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
  const [view, setView] = useState<"grid" | "list">((table.get("view") as "grid" | "list") || "grid");
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
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
    const updates: Record<string, string> = { q: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || activeFilterCount > 0;

  const { data: addresses = [], isLoading } = useAddresses({
    filters: {
      q: table.get("q") || undefined,
      addressType: table.get("addressType") || undefined,
      verified: table.get("verified") === "true" || undefined,
      activeOnly: table.get("activeOnly") === "true" || undefined,
    },
  });

  return (
    <div className="space-y-4">
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
      <div className="px-3 sm:px-4">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 dark:border-slate-700 animate-pulse p-4 space-y-2"
              >
                <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {table.get("q") ? `No addresses matching "${table.get("q")}"` : "No saved addresses."}
          </p>
        ) : (
          <AddressBook
            addresses={addresses as any}
            onEdit={onEdit}
            onDelete={onDelete}
            onAdd={onAdd}
          />
        )}
      </div>

      {/* ── Filter drawer ───────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Filters
              </span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">
                    Clear all
                  </button>
                )}
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close filters" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AddressFilters table={pendingTable} />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]">
                Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
