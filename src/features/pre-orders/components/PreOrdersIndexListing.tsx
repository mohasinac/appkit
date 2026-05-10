"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Heart, ShoppingCart, SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../../products/hooks/useProducts";
import { Pagination, useToast, BulkActionsBar, ListingToolbar } from "../../../ui";
import { ACTION_ID, ACTION_META } from "../../products/constants/action-defs";
import { ROUTES } from "../../../next";
import { MarketplacePreorderCard } from "./MarketplacePreorderCard";
import { PreOrderFilters } from "./PreOrderFilters";
import { useGuestCart } from "../../cart/hooks/useGuestCart";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushCartOp, pushWishlistOp } from "../../cart/utils/pending-ops";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../../products/hooks/useBrands";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";

const PREORDER_SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "preOrderDeliveryDate", label: "Delivery: Soonest" },
  { value: "-preOrderDeliveryDate", label: "Delivery: Furthest" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
] as const;

const FILTER_KEYS = ["category", "brand", "minPrice", "maxPrice", "storeId", "preOrderProductionStatus", "dateFrom", "dateTo"];

export interface PreOrdersIndexListingProps {
  initialData?: any;
  categorySlug?: string;
  /** Filter pre-orders by brand name (for brand detail pages) */
  brandName?: string;
}

export function PreOrdersIndexListing({ initialData, categorySlug, brandName }: PreOrdersIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const showClosed = table.get("showClosed") === "true";
  const [view, setView] = useState<"grid" | "list">(
    (table.get("view") as "grid" | "list") || "grid",
  );
  const localCart = useGuestCart();
  const localWishlist = useGuestWishlist();
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);
  const { brandOptions } = useBrands();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "preorder").map((i) => i.itemId),
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
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { q: "", sort: "", showClosed: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!table.get("q") ||
    table.get("showClosed") === "true" ||
    table.get("sort") !== "-createdAt" ||
    activeFilterCount > 0;

  const params = {
    q: table.get("q") || undefined,
    category: table.get("category") || undefined,
    categorySlug: categorySlug || undefined,
    brand: brandName || table.get("brand") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    storeId: table.get("storeId") || undefined,
    preOrderProductionStatus: (table.get("preOrderProductionStatus") || undefined) as "upcoming" | "in_production" | "ready_to_ship" | undefined,
    dateFrom: table.get("dateFrom") || undefined,
    dateTo: table.get("dateTo") || undefined,
    sort: table.get("sort") || "-createdAt",
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    isPreOrder: true,
    status: showClosed ? undefined : ("published" as const),
  };

  const { products: preOrders, totalPages, page, isLoading } = useProducts(
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
      localWishlist.add(productId, "preorder");
      pushWishlistOp({ op: "add", itemId: productId, type: "preorder" });
      showToast("Added to wishlist", "success");
      return Promise.resolve();
    },
    removeFromWishlist: (productId: string) => {
      localWishlist.remove(productId, "preorder");
      pushWishlistOp({ op: "remove", itemId: productId, type: "preorder" });
      showToast("Removed from wishlist", "info");
      return Promise.resolve();
    },
    isWishlisted: (productId: string) => wishlistedIds.has(productId),
  };

  const handleAddToCart = useCallback((product: any) => {
    localCart.add(product.id, 1, {
      productTitle: product.title,
      productImage: product.mainImage,
      price: product.price,
    });
    pushCartOp({ op: "add", productId: product.id, quantity: 1, productTitle: product.title, productImage: product.mainImage, price: product.price });
    showToast("Added to cart", "success");
  }, [localCart, showToast]);

  const selection = useBulkSelection({ items: preOrders as any[], keyExtractor: (p: any) => p.id });
  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search pre-orders..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={handleSearchKeyDown}
        sortValue={table.get("sort") || "-createdAt"}
        sortOptions={PREORDER_SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        bulkMode={selection.isSelecting}
        bulkSelectedCount={selection.selectedCount}
        bulkTotalCount={preOrders.length}
        onBulkSelectAll={selection.toggleAll}
        onBulkClear={selection.clearSelection}
        extra={
          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <span className="hidden sm:inline text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
              Show closed
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showClosed}
              onClick={() => table.set("showClosed", showClosed ? "" : "true")}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                showClosed ? "bg-primary" : "bg-zinc-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  showClosed ? "translate-x-[19px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </label>
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

      {/* ── Pre-order grid ─────────────────────────────────────────────── */}
      <div className="py-6">
        {isLoading ? (
          <div className={gridClass}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
                <div className="aspect-square bg-zinc-200 dark:bg-slate-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
                  <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-1/3" />
                  <div className="h-8 bg-zinc-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : preOrders.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No pre-orders found.
          </p>
        ) : view === "list" ? (
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
            {(preOrders as any[]).map((product) => (
              <MarketplacePreorderCard
                key={product.id}
                product={product}
                variant="list"
                hrefBuilder={(p) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(p.id))}
                onAddToCart={handleAddToCart}
                wishlistActions={wishlistActions}
                selectable={selection.isSelecting}
                isSelected={selection.isSelected(product.id)}
                onSelect={(id) => selection.toggle(id)}
              />
            ))}
          </div>
        ) : (
          <div className={gridClass}>
            {(preOrders as any[]).map((product) => (
              <MarketplacePreorderCard
                key={product.id}
                product={product}
                variant="grid"
                hrefBuilder={(p) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(p.id))}
                onAddToCart={handleAddToCart}
                wishlistActions={wishlistActions}
                selectable={selection.isSelecting}
                isSelected={selection.isSelected(product.id)}
                onSelect={(id) => selection.toggle(id)}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── Bulk actions bar ──────────────────────────────────────────── */}
      <BulkActionsBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={[
          {
            key: ACTION_ID.ADD_TO_CART,
            label: ACTION_META[ACTION_ID.ADD_TO_CART].label,
            icon: <ShoppingCart className="h-3.5 w-3.5" />,
            variant: "primary",
            onClick: () => {
              const selected = (preOrders as any[]).filter((p) => selection.selectedIdSet.has(p.id));
              selected.forEach((p) => {
                localCart.add(p.id, 1, { productTitle: p.title, productImage: p.mainImage, price: p.price });
                pushCartOp({ op: "add", productId: p.id, quantity: 1, productTitle: p.title, productImage: p.mainImage, price: p.price });
              });
              showToast(`${selected.length} items added to cart`, "success");
              selection.clearSelection();
            },
          },
          {
            key: ACTION_ID.ADD_TO_WISHLIST,
            label: ACTION_META[ACTION_ID.ADD_TO_WISHLIST].label,
            icon: <Heart className="h-3.5 w-3.5" />,
            variant: "secondary",
            onClick: () => {
              const selected = (preOrders as any[]).filter((p) => selection.selectedIdSet.has(p.id));
              selected.forEach((p) => {
                localWishlist.add(p.id, "preorder");
                pushWishlistOp({ op: "add", itemId: p.id, type: "preorder" });
              });
              showToast(`${selected.length} items added to wishlist`, "success");
              selection.clearSelection();
            },
          },
        ]}
      />

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
              <PreOrderFilters table={pendingTable} currencyPrefix="₹" categoryOptions={categoryOptions} brandOptions={brandOptions} />
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
