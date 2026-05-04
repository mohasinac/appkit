"use client";
import React, { useState, useCallback } from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import { Pagination, SortDropdown } from "../../../ui";
import type { ViewMode } from "../../../ui";
import { ROUTES } from "../../../next";
import { ProductGrid, ProductFilters, PRODUCT_PUBLIC_SORT_OPTIONS } from ".";
import { useSession } from "../../../react/contexts/SessionContext";
import { useWishlistWithGuest } from "../../wishlist/hooks/useWishlistWithGuest";
import { apiClient } from "../../../http";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";

export interface ProductsIndexListingProps {
  initialData?: any;
}

export function ProductsIndexListing({ initialData }: ProductsIndexListingProps) {
  const router = useRouter();
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<ViewMode>(
    (table.get("view") as ViewMode) || "card",
  );
  const { user } = useSession();
  const wl = useWishlistWithGuest(user?.uid ?? null);
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);

  const params = {
    q: table.get("q") || undefined,
    category: table.get("category") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    condition: table.get("condition") || undefined,
    brand: table.get("brand") || undefined,
    sort: table.get("sort") || "-createdAt",
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    isAuction: false,
  };

  const { products, total, totalPages, page, isLoading } = useProducts(
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

  const handleViewToggle = (next: ViewMode) => {
    setView(next);
    table.set("view", next);
  };

  const closeFilters = () => setFilterOpen(false);

  const handleWishlistToggle = useCallback(async (productId: string) => {
    const isWishlisted = wl.wishlistedIds?.has(productId) ?? false;
    if (wl.isGuest) {
      const guestWl = (wl as any).guestWishlist;
      if (isWishlisted) guestWl?.remove(productId, "product");
      else guestWl?.add(productId, "product");
    } else {
      if (isWishlisted) await apiClient.delete(`/api/user/wishlist/${productId}`);
      else await apiClient.post("/api/user/wishlist", { productId });
    }
  }, [wl]);

  const handleAddToCart = useCallback(async (product: any) => {
    try {
      await apiClient.post("/api/cart", { productId: product.id, quantity: 1 });
    } catch {
      // silently ignore cart errors on listing page
    }
  }, []);

  const handleBuyNow = useCallback(async (product: any) => {
    try {
      await apiClient.post("/api/cart", { productId: product.id, quantity: 1 });
    } catch {
      // silently ignore cart errors; still navigate
    }
    router.push("/cart");
  }, [router]);

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4`}>
        <div className="flex items-center gap-2.5 max-w-full">

          {/* Filters button */}
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 dark:border-slate-600 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* Search */}
          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search products..."
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

          {/* Sort by */}
          <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={table.get("sort") || "-createdAt"}
              onChange={(v) => { table.set("sort", v); table.setPage(1); }}
              options={PRODUCT_PUBLIC_SORT_OPTIONS as any}
            />
          </div>

          {/* Grid / List toggle */}
          <div className="flex shrink-0 items-center rounded-lg border border-zinc-300 dark:border-slate-600 overflow-hidden">
            <button
              type="button"
              onClick={() => handleViewToggle("card")}
              aria-label="Grid view"
              className={`p-2 transition-colors ${
                view === "card"
                  ? "bg-primary text-white"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-slate-800 dark:text-zinc-400"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewToggle("list")}
              aria-label="List view"
              className={`p-2 transition-colors ${
                view === "list"
                  ? "bg-primary text-white"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-slate-800 dark:text-zinc-400"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Product grid ───────────────────────────────────────────────── */}
      <div className="py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
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
            getProductHref={(p) =>
              String(ROUTES.PUBLIC.PRODUCT_DETAIL((p as any).slug || p.id))
            }
            view={view}
            onWishlistToggle={handleWishlistToggle}
            wishlistedIds={wl.wishlistedIds}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
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
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={closeFilters}
          />

          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            {/* Header */}
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

            {/* Scrollable filter body */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ProductFilters table={table as any} currencyPrefix="₹" categoryOptions={categoryOptions} />
            </div>

            {/* Apply button — sticky at bottom */}
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
