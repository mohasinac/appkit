"use client";
import React, { useState, useCallback, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import { Pagination, useToast, ListingToolbar, BulkActionBar } from "../../../ui";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { MarketplaceAuctionGrid } from "../../auctions/components/MarketplaceAuctionGrid";
import { AuctionFilters } from "../../auctions/components/AuctionFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushWishlistOp } from "../../cart/utils/pending-ops";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../hooks/useBrands";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.AUCTION_END_DATE, "ASC");

const AUCTION_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.AUCTION_END_DATE, "ASC"), label: "Ending Soonest" },
  { value: sortBy(PRODUCT_FIELDS.AUCTION_END_DATE), label: "Ending Latest" },
  { value: sortBy(PRODUCT_FIELDS.CURRENT_BID, "ASC"), label: "Bid: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.CURRENT_BID), label: "Bid: High to Low" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: "Newly Listed" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: "Oldest Listed" },
] as const;

const FILTER_KEYS = [TABLE_KEYS.CATEGORY, TABLE_KEYS.BRAND, TABLE_KEYS.MIN_BID, TABLE_KEYS.MAX_BID, TABLE_KEYS.STORE_ID, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO];

export interface AuctionsIndexListingProps {
  initialData?: any;
  categorySlug?: string;
  /** Filter auctions by brand name (for brand detail pages) */
  brandName?: string;
}

export function AuctionsIndexListing({ initialData, categorySlug, brandName }: AuctionsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const showEnded = table.get(TABLE_KEYS.SHOW_ENDED) === "true";
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );
  const localWishlist = useGuestWishlist();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "auction").map((i) => i.itemId),
  );
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);
  const { brandOptions } = useBrands();

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
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", [TABLE_KEYS.SHOW_ENDED]: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    table.get(TABLE_KEYS.SHOW_ENDED) === "true" ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    activeFilterCount > 0;

  const params = {
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    category: table.get(TABLE_KEYS.CATEGORY) || undefined,
    categorySlug: categorySlug || undefined,
    brand: brandName || table.get(TABLE_KEYS.BRAND) || undefined,
    minBid: table.get(TABLE_KEYS.MIN_BID) ? Number(table.get(TABLE_KEYS.MIN_BID)) : undefined,
    maxBid: table.get(TABLE_KEYS.MAX_BID) ? Number(table.get(TABLE_KEYS.MAX_BID)) : undefined,
    storeId: table.get(TABLE_KEYS.STORE_ID) || undefined,
    // When showEnded is false (default), force dateFrom=now so only live auctions appear.
    // When showEnded is true, respect the filter-drawer value (or show all if none set).
    dateFrom: showEnded
      ? (table.get(TABLE_KEYS.DATE_FROM) || undefined)
      : new Date().toISOString(),
    dateTo: table.get(TABLE_KEYS.DATE_TO) || undefined,
    sort: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    perPage: table.getNumber(TABLE_KEYS.PAGE_SIZE, 24),
    listingType: "auction" as const,
  };

  const { products: auctions, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const selection = useBulkSelection({ items: auctions as any[], keyExtractor: (a: any) => a.id });

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
  };

  const handleViewToggle = (next: "grid" | "list" | "table") => {
    if (next === VIEW_MODE.TABLE) return;
    setView(next as "grid" | "list");
    table.set(TABLE_KEYS.VIEW, next);
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
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={AUCTION_SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        bulkMode={selection.isSelecting}
        bulkSelectedCount={selection.selectedCount}
        bulkTotalCount={auctions.length}
        onBulkSelectAll={selection.toggleAll}
        onBulkClear={selection.clearSelection}
        extra={
          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <span className="hidden sm:inline text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
              Show ended
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showEnded}
              onClick={() => table.set(TABLE_KEYS.SHOW_ENDED, showEnded ? "" : "true")}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                showEnded ? "bg-primary" : "bg-zinc-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  showEnded ? "translate-x-[19px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </label>
        }
      />

      {/* ── Bulk action bar ───────────────────────────────────────────── */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={[
          {
            id: "watchlist",
            label: "Add to Watchlist",
            variant: "primary",
            onClick: () => {
              const selected = (auctions as any[]).filter((a) => selection.selectedIdSet.has(a.id));
              selected.forEach((a) => {
                wishlistActions.addToWishlist(a.id);
              });
              selection.clearSelection();
            },
          },
          {
            id: "remove-watchlist",
            label: "Remove from Watchlist",
            variant: "secondary",
            onClick: () => {
              const selected = (auctions as any[]).filter((a) => selection.selectedIdSet.has(a.id));
              selected.forEach((a) => {
                wishlistActions.removeFromWishlist(a.id);
              });
              selection.clearSelection();
            },
          },
        ] satisfies BulkActionItem[]}
      />

      {/* ── Sticky pagination (below toolbar) ─────────────────────────── */}
      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </div>
      )}

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
              <AuctionFilters table={pendingTable} currencyPrefix="₹" categoryOptions={categoryOptions} brandOptions={brandOptions} />
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
