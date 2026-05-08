"use client";
import React, { useState, useCallback, useMemo } from "react";
import { X, ShoppingCart, Heart, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import { Pagination, useToast, BulkActionsBar, ListingToolbar } from "../../../ui";
import type { ViewMode } from "../../../ui";
import { ROUTES } from "../../../next";
import { ProductGrid, ProductFilters, PRODUCT_PUBLIC_SORT_OPTIONS } from ".";
import { useGuestCart } from "../../cart/hooks/useGuestCart";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushCartOp, pushWishlistOp } from "../../cart/utils/pending-ops";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";

const FILTER_KEYS = ["category", "condition", "minPrice", "maxPrice", "brand", "storeId", "freeShipping", "tags"];

export interface ProductsIndexListingProps {
  initialData?: any;
}

export function ProductsIndexListing({ initialData }: ProductsIndexListingProps) {
  const router = useRouter();
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showSold, setShowSold] = useState(false);
  const [view, setView] = useState<ViewMode>(
    (table.get("view") as ViewMode) || "card",
  );

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
  }), [pendingFilters]);

  const openFilters = useCallback(() => {
    // Sync pending state from current URL when drawer opens
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

  const localCart = useGuestCart();
  const localWishlist = useGuestWishlist();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "product").map((i) => i.itemId),
  );
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);

  const params = {
    q: table.get("q") || undefined,
    category: table.get("category") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    condition: table.get("condition") || undefined,
    brand: table.get("brand") || undefined,
    storeId: table.get("storeId") || undefined,
    freeShipping: table.get("freeShipping") === "true" ? true : undefined,
    sort: table.get("sort") || "-createdAt",
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    isAuction: false,
    isPreOrder: false,
    status: showSold ? undefined : ("published" as const),
  };

  const { products, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const [selectionMode, setSelectionMode] = useState(false);
  const selection = useBulkSelection({ items: products as any[], keyExtractor: (p: any) => p.id });
  const selectedSet = new Set(selection.selectedIds);

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

  const handleWishlistToggle = useCallback((productId: string) => {
    const isWishlisted = wishlistedIds.has(productId);
    if (isWishlisted) {
      localWishlist.remove(productId, "product");
      pushWishlistOp({ op: "remove", itemId: productId, type: "product" });
      showToast("Removed from wishlist", "info");
    } else {
      localWishlist.add(productId, "product");
      pushWishlistOp({ op: "add", itemId: productId, type: "product" });
      showToast("Added to wishlist", "success");
    }
  }, [wishlistedIds, localWishlist, showToast]);

  const handleAddToCart = useCallback((product: any) => {
    localCart.add(product.id, 1, {
      productTitle: product.title,
      productImage: product.mainImage,
      price: product.price,
    });
    pushCartOp({ op: "add", productId: product.id, quantity: 1, productTitle: product.title, productImage: product.mainImage, price: product.price });
    showToast("Added to cart", "success");
  }, [localCart, showToast]);

  const handleBuyNow = useCallback((product: any) => {
    localCart.add(product.id, 1, {
      productTitle: product.title,
      productImage: product.mainImage,
      price: product.price,
    });
    pushCartOp({ op: "add", productId: product.id, quantity: 1, productTitle: product.title, productImage: product.mainImage, price: product.price });
    router.push(String(ROUTES.USER.CART));
  }, [localCart, router]);

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search products..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={handleSearchKeyDown}
        sortValue={table.get("sort") || "-createdAt"}
        sortOptions={PRODUCT_PUBLIC_SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
        view={view === "card" ? "grid" : "list"}
        onViewChange={(v) => handleViewToggle(v === "grid" ? "card" : "list")}
        extra={
          <div className="flex items-center gap-2">
            {/* Show sold toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
              <span className="hidden sm:inline text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Show sold
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showSold}
                onClick={() => setShowSold((v) => !v)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  showSold ? "bg-primary" : "bg-zinc-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    showSold ? "translate-x-[19px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </label>
            {/* Select mode toggle */}
            <button
              type="button"
              onClick={() => { setSelectionMode((m) => !m); selection.clearSelection(); }}
              className={`shrink-0 rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium transition-colors ${
                selectionMode
                  ? "border-primary bg-primary/10 text-primary dark:text-primary-400"
                  : "border-zinc-300 dark:border-slate-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
              }`}
            >
              {selectionMode ? "Cancel" : "Select"}
            </button>
          </div>
        }
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
            wishlistedIds={wishlistedIds}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            selectionMode={selectionMode}
            selectedIds={selectedSet}
            onToggleSelect={selection.toggle}
          />
        )}

      </div>

      {/* ── Bulk actions bar ──────────────────────────────────────────── */}
      <BulkActionsBar
        selectedCount={selection.selectedCount}
        onClearSelection={() => { selection.clearSelection(); setSelectionMode(false); }}
        actions={[
          {
            label: "Add to Cart",
            icon: <ShoppingCart className="h-3.5 w-3.5" />,
            variant: "primary",
            onClick: () => {
              const selected = (products as any[]).filter((p) => selectedSet.has(p.id));
              selected.forEach((p) => {
                localCart.add(p.id, 1, { productTitle: p.title, productImage: p.mainImage, price: p.price });
                pushCartOp({ op: "add", productId: p.id, quantity: 1, productTitle: p.title, productImage: p.mainImage, price: p.price });
              });
              showToast(`${selected.length} items added to cart`, "success");
              selection.clearSelection();
              setSelectionMode(false);
            },
          },
          {
            label: "Wishlist",
            icon: <Heart className="h-3.5 w-3.5" />,
            variant: "secondary",
            onClick: () => {
              const selected = (products as any[]).filter((p) => selectedSet.has(p.id));
              selected.forEach((p) => {
                localWishlist.add(p.id, "product");
                pushWishlistOp({ op: "add", itemId: p.id, type: "product" });
              });
              showToast(`${selected.length} items added to wishlist`, "success");
              selection.clearSelection();
              setSelectionMode(false);
            },
          },
        ]}
      />

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setFilterOpen(false)}
          />

          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            {/* Header */}
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

            {/* Scrollable filter body */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ProductFilters table={pendingTable as any} currencyPrefix="₹" categoryOptions={categoryOptions} />
            </div>

            {/* Apply button — sticky at bottom */}
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
