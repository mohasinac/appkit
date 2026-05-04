"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../../products/hooks/useProducts";
import { Pagination, SortDropdown, useToast } from "../../../ui";
import type { ViewMode } from "../../../ui";
import { ROUTES } from "../../../next";
import { ProductGrid } from "../../products/components/ProductGrid";
import { ProductFilters, PRODUCT_PUBLIC_SORT_OPTIONS } from "../../products/components/ProductFilters";
import { useSession } from "../../../react/contexts/SessionContext";
import { useWishlistWithGuest } from "../../wishlist/hooks/useWishlistWithGuest";
import { apiClient } from "../../../http";

const FILTER_KEYS = ["condition", "brand", "minPrice", "maxPrice"];

export interface StoreProductsListingProps {
  sellerId: string;
  initialData?: any;
}

export function StoreProductsListing({ sellerId, initialData }: StoreProductsListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<ViewMode>((table.get("view") as ViewMode) || "card");
  const { user } = useSession();
  const wl = useWishlistWithGuest(user?.uid ?? null);

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
  }), [pendingFilters]) as any;

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
    condition: table.get("condition") || undefined,
    brand: table.get("brand") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    sort: table.get("sort") || "-createdAt",
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    sellerId,
    isAuction: false,
  };

  const { products, totalPages, page, isLoading } = useProducts(params as any, { initialData });

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
    table.setPage(1);
  }, [searchInput, table]);

  const handleViewToggle = (next: ViewMode) => {
    setView(next);
    table.set("view", next);
  };

  const handleWishlistToggle = useCallback(async (productId: string) => {
    const isWishlisted = wl.wishlistedIds?.has(productId) ?? false;
    if (wl.isGuest) {
      const guestWl = (wl as any).guestWishlist;
      if (isWishlisted) {
        guestWl?.remove(productId, "product");
        showToast("Removed from wishlist", "info");
      } else {
        guestWl?.add(productId, "product");
        showToast("Added to wishlist", "success");
      }
    } else {
      if (isWishlisted) {
        await apiClient.delete(`/api/user/wishlist/${productId}`);
        showToast("Removed from wishlist", "info");
      } else {
        await apiClient.post("/api/user/wishlist", { productId });
        showToast("Added to wishlist", "success");
      }
    }
  }, [wl, showToast]);

  const handleAddToCart = useCallback(async (product: any) => {
    try {
      await apiClient.post("/api/cart", { productId: product.id, quantity: 1 });
      showToast("Added to cart", "success");
    } catch {
      showToast("Could not add to cart", "error");
    }
  }, [showToast]);

  return (
    <div className="min-h-[200px]">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-[var(--header-height,0px)] z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <div className="flex items-center gap-2.5 max-w-full">

          <button
            type="button"
            onClick={openFilters}
            className="relative flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 dark:border-slate-600 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch()}
              placeholder="Search store products..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            <button
              type="button"
              onClick={commitSearch}
              className="flex shrink-0 items-center justify-center px-3 py-2 text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={table.get("sort") || "-createdAt"}
              onChange={(v) => { table.set("sort", v); table.setPage(1); }}
              options={PRODUCT_PUBLIC_SORT_OPTIONS as any}
            />
          </div>

          <div className="flex shrink-0 items-center rounded-lg border border-zinc-300 dark:border-slate-600 overflow-hidden">
            <button
              type="button"
              onClick={() => handleViewToggle("card")}
              aria-label="Grid view"
              className={`p-2 transition-colors ${view === "card" ? "bg-primary text-white" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-slate-800 dark:text-zinc-400"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewToggle("list")}
              aria-label="List view"
              className={`p-2 transition-colors ${view === "list" ? "bg-primary text-white" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-slate-800 dark:text-zinc-400"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Product grid ───────────────────────────────────────────────── */}
      <div className="py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
                <div className="aspect-square bg-zinc-200 dark:bg-slate-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
                  <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ProductGrid
            products={products as any[]}
            getProductHref={(p) => String(ROUTES.PUBLIC.PRODUCT_DETAIL((p as any).slug || p.id))}
            view={view}
            emptyLabel="This store has no products yet."
            onWishlistToggle={handleWishlistToggle}
            wishlistedIds={wl.wishlistedIds}
            onAddToCart={handleAddToCart}
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
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
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
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close filters" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ProductFilters table={pendingTable} currencyPrefix="₹" />
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
