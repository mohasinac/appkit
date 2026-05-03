"use client";
import React, { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useAddresses } from "../hooks/useAddresses";
import { AddressBook } from "./AddressBook";
import { AddressFilters } from "./AddressFilters";
import type { UrlTable } from "../../filters/FilterPanel";

function createLocalTable(
  params: Record<string, string>,
  setParams: (p: Record<string, string>) => void,
): UrlTable {
  return {
    get: (key: string) => params[key] ?? "",
    set: (key: string, value: string) => setParams({ ...params, [key]: value }),
    setMany: (updates: Record<string, string>) => setParams({ ...params, ...updates }),
    getNumber: (key: string, def: number) => {
      const v = params[key];
      return v ? Number(v) : def;
    },
    setPage: (page: number) => setParams({ ...params, page: String(page) }),
    setSort: (sort: string) => setParams({ ...params, sort }),
    setPageSize: (size: number) => setParams({ ...params, pageSize: String(size) }),
    clear: (keys: string | string[]) => {
      const next = { ...params };
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete next[k]);
      setParams(next);
    },
    buildSieveParams: () => ({}),
    buildSearchParams: () => new URLSearchParams(),
  } as unknown as UrlTable;
}

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
  const { data: addresses = [], isLoading } = useAddresses();
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterParams, setFilterParams] = useState<Record<string, string>>({});

  const table = createLocalTable(filterParams, setFilterParams);

  const filtered = useMemo(() => {
    let result = [...addresses];
    const q = activeSearch.toLowerCase();

    if (q) {
      result = result.filter((a) => {
        const line1 = (a.addressLine1 ?? "").toLowerCase();
        const line2 = (a.addressLine2 ?? "").toLowerCase();
        const postal = (a.postalCode ?? "").toLowerCase();
        const label = (a.label ?? "").toLowerCase();
        return (
          line1.includes(q) ||
          line2.includes(q) ||
          postal.includes(q) ||
          label.includes(q)
        );
      });
    }

    const types = filterParams.addressType
      ? filterParams.addressType.split("|").filter(Boolean)
      : [];
    if (types.length > 0) {
      result = result.filter((a) => {
        const t = ((a as any).type ?? (a as any).addressType ?? "").toLowerCase();
        return types.includes(t);
      });
    }

    if (filterParams.verified === "true") {
      result = result.filter((a) => (a as any).verified === true);
    }

    if (filterParams.activeOnly === "true") {
      result = result.filter((a) => (a as any).active !== false);
    }

    return result;
  }, [addresses, activeSearch, filterParams]);

  const commitSearch = () => {
    setActiveSearch(searchInput.trim());
  };

  const closeFilters = () => setFilterOpen(false);

  if (isLoading) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>

        <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitSearch()}
            placeholder="Search by address, postcode or label..."
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setActiveSearch(""); }}
              className="px-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={commitSearch}
            className="flex shrink-0 items-center justify-center px-3 py-2 text-zinc-400 hover:text-primary transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Address list ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {activeSearch ? `No addresses matching "${activeSearch}"` : "No saved addresses."}
        </p>
      ) : (
        <AddressBook
          addresses={filtered as any}
          onEdit={onEdit}
          onDelete={onDelete}
          onAdd={onAdd}
        />
      )}

      {/* ── Filter drawer ───────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={closeFilters}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <button
                type="button"
                onClick={closeFilters}
                aria-label="Close filters"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AddressFilters table={table} />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button
                type="button"
                onClick={closeFilters}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
