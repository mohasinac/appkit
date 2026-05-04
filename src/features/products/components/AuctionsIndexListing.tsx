"use client";
import React, { useState, useCallback, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import { Pagination, useToast, ListingToolbar } from "../../../ui";
import { MarketplaceAuctionGrid } from "../../auctions/components/MarketplaceAuctionGrid";
import { AuctionFilters } from "../../auctions/components/AuctionFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushWishlistOp } from "../../cart/utils/pending-ops";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";

const AUCTION_SORT_OPTIONS = [
  { value: "auctionEndDate", label: "Ending Soonest" },
  { value: "-currentBid", label: "Highest Bid" },
  { value: "-createdAt", label: "Newest" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
] as const;

const FILTER_KEYS = ["category", "minBid", "maxBid", "storeId", "dateFrom", "dateTo", "condition"];

export interface AuctionsIndexListingProps {
  initialData?: any;
  categorySlug?: string;
}

export function AuctionsIndexListing({ initialData, categorySlug }: AuctionsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "auctionEndDate" } });
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">(
    (table.get("view") as "grid" | "list") || "grid",
  );
  const localWishlist = useGuestWishlist();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "auction").map((i) => i.itemId),
  );
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);

  // Pending filter state — buffered until "Apply Filters" clicked
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
    const updates: Record<string, string> = { page: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    const empty = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));
    setPendingFilters(empty);
    table.setMany({ ...empty, page: "1" });
  }, [table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;

  const params = {
    q: table.get("q") || undefined,
    category: table.get("category") || undefined,
    categorySlug: categorySlug || undefined,
    minBid: table.get("minBid") ? Number(table.get("minBid")) : undefined,
    maxBid: table.get("maxBid") ? Number(table.get("maxBid")) : undefined,
    storeId: table.get("storeId") || undefined,
    dateFrom: table.get("dateFrom") || undefined,
    dateTo: table.get("dateTo") || undefined,
    sort: table.get("sort") || "auctionEndDate",
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    isAuction: true,
  };

  const { products: auctions, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
    table.setPage(1);
  }, [searchInput, table]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
  };

  const handleViewToggle = (next: "grid" | "list") => {
    setView(next);
    table.set("view", next);
  };

  const wishlistActions = {
    addToWishlist: (productId: string) => {
      localWishlist.add(productId, "auction");
      pushWishlistOp({ op: "add", itemId: productId, type: "auction" });
      showToast("Added to wishlist", "success");
      return Promise.resolve();
    },
    removeFromWishlist: (productId: string) => {
      localWishlist.remove(productId, "auction");
      pushWishlistOp({ op: "remove", itemId: productId, type: "auction" });
      showToast("Removed from wishlist", "info");
      return Promise.resolve();
    },
    isWishlisted: (productId: string) => wishlistedIds.has(productId),
  };

  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4";

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search auctions..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={handleSearchKeyDown}
        sortValue={table.get("sort") || "auctionEndDate"}
        sortOptions={AUCTION_SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
        view={view}
        onViewChange={handleViewToggle}
      />

      {/* ── Auction grid ───────────────────────────────────────────────── */}
      <div className="py-6">
        {isLoading ? (
          <div className={gridClass}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
                <div className="aspect-square bg-zinc-200 dark:bg-slate-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-8 bg-zinc-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <MarketplaceAuctionGrid
            auctions={auctions as any[]}
            variant={view === "list" ? "list" : "grid"}
            gridClassName={view === "list" ? "flex flex-col gap-4" : gridClass}
            wishlistActions={wishlistActions}
          />
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </div>
        )}
      </div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setFilterOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  aria-label="Close filters"
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AuctionFilters table={pendingTable} currencyPrefix="₹" categoryOptions={categoryOptions} />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button
                type="button"
                onClick={applyFilters}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]"
              >
                Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
