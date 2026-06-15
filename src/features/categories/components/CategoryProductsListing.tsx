"use client";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useProducts } from "../../products/hooks/useProducts";
import { Div, FilterDrawer, ListingToolbar, LoginRequiredModal, Pagination, Row, useToast } from "../../../ui";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../../products/constants/action-defs";
import type { ViewMode } from "../../../ui";
import { ROUTES } from "../../../next";
import { ProductGrid } from "../../products/components/ProductGrid";
import { ProductFilters, PRODUCT_PUBLIC_SORT_OPTIONS } from "../../products/components/ProductFilters";
import { useGuestCart } from "../../cart/hooks/useGuestCart";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushCartOp, pushWishlistOp } from "../../cart/utils/pending-ops";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const FILTER_KEYS = ["condition", "brand", "minPrice", "maxPrice"];

 
function renderCategoryProductGrid(props: { isLoading: boolean; products: any[]; view: ViewMode; getProductHref: (p: any) => string; onWishlistToggle: (id: string) => void; wishlistedIds: Set<string>; onAddToCart: (p: any) => void }) {
  const { isLoading, products, view, getProductHref, onWishlistToggle, wishlistedIds, onAddToCart } = props;
  if (isLoading) {
    return (
      <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Div key={i} className={`rounded-xl border border-zinc-100 dark:border-slate-700 ${__O.hidden} animate-pulse`}>
            <Div className="aspect-square dark:bg-slate-700" surface="subtle" />
            <Div className={`${__P.p3} space-y-2`}>
              <Div className="h-3 dark:bg-slate-700 w-3/4" surface="subtle" rounded="default" />
              <Div className="h-3 dark:bg-slate-700 w-1/2" surface="subtle" rounded="default" />
              <Div className="h-4 dark:bg-slate-700 w-1/3" surface="subtle" rounded="default" />
            </Div>
          </Div>
        ))}
      </Div>
    );
  }
  return (
    <ProductGrid
      products={products}
      getProductHref={getProductHref}
      view={view}
      emptyLabel="No products found in this category."
      onWishlistToggle={onWishlistToggle}
      wishlistedIds={wishlistedIds}
      onAddToCart={onAddToCart}
    />
  );
}

export interface CategoryProductsListingProps {
  categorySlug: string;
  categoryId?: string;
  /** Filter products by brand name (for brand detail pages) */
  brandName?: string;
  initialData?: any;
}

export function CategoryProductsListing({
  categorySlug,
  categoryId,
  brandName,
  initialData,
}: CategoryProductsListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<ViewMode>(
    (table.get("view") as ViewMode) || "card",
  );
  const localCart = useGuestCart();
  const localWishlist = useGuestWishlist();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "product").map((i) => i.itemId),
  );

  const { pendingTable, filterActiveCount, onFilterApply, onFilterClear, onResetAll, onFilterReset } =
    usePendingTable(table, FILTER_KEYS);

  const params = {
    q: table.get("q") || undefined,
    category: categoryId || undefined,
    condition: table.get("condition") || undefined,
    brand: brandName || table.get("brand") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    sort: table.get("sort") || "-createdAt",
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    listingType: "standard" as const,
  };

  const { products, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const openFilters = useCallback(() => {
    onFilterReset();
    setFilterOpen(true);
  }, [onFilterReset]);

  const applyFilters = useCallback(() => {
    onFilterApply();
    setFilterOpen(false);
  }, [onFilterApply]);

  const handleViewToggle = (next: ViewMode) => {
    setView(next);
    table.set("view", next);
  };

  const resetAll = useCallback(() => {
    onResetAll({ q: "", sort: "" });
    setSearchInput("");
  }, [onResetAll]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!table.get("q") ||
    table.get("sort") !== "-createdAt" ||
    activeFilterCount > 0;

  const handleWishlistToggle = useCallback(
    (productId: string) => {
      const isWishlisted = wishlistedIds.has(productId);
      requireAuth(
        isWishlisted ? ACTION_ID.REMOVE_FROM_WISHLIST : ACTION_ID.ADD_TO_WISHLIST,
        () => {
          if (isWishlisted) {
            localWishlist.remove(productId, "product");
            pushWishlistOp({ op: "remove", itemId: productId, type: "product" });
            showToast("Removed from wishlist", "info");
          } else {
            localWishlist.add(productId, "product");
            pushWishlistOp({ op: "add", itemId: productId, type: "product" });
            showToast("Added to wishlist", "success");
          }
        },
      );
    },
    [wishlistedIds, localWishlist, showToast, requireAuth],
  );

  const handleAddToCart = useCallback(
    (product: any) => {
      const snapshot = {
        productTitle: product.title,
        productImage: product.mainImage,
        price: product.price,
        storeId: product.storeId,
        storeName: product.storeName,
      };
      localCart.add(product.id, 1, snapshot);
      pushCartOp({ op: "add", productId: product.id, quantity: 1, ...snapshot });
      showToast("Added to cart", "success");
    },
    [localCart, showToast],
  );

  return (
    <Div className="min-h-[200px]">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder={`Search in ${categorySlug.replace(/-/g, " ")}...`}
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || "-createdAt"}
        sortOptions={PRODUCT_PUBLIC_SORT_OPTIONS}
        onSortChange={(v) => {
          table.set("sort", v);
        }}
        view={view === "card" ? "grid" : "list"}
        onViewChange={(v) => handleViewToggle(v === "grid" ? "card" : "list")}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {totalPages > 1 && (
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5" justify="center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Row>
      )}

      <Div padding="y-lg">
        {renderCategoryProductGrid({
          isLoading, products: products as any[], view,
           
          getProductHref: (p: any) => String(ROUTES.PUBLIC.PRODUCT_DETAIL((p as any).slug || p.id)),
          onWishlistToggle: handleWishlistToggle, wishlistedIds, onAddToCart: handleAddToCart,
        })}
      </Div>

      <FilterDrawer
        open={filterOpen}
        onOpen={openFilters}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onReset={onFilterClear}
        activeCount={filterActiveCount}
        hideTrigger
      >
        <ProductFilters table={pendingTable as any} currencyPrefix="₹" />
      </FilterDrawer>

      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Div>
  );
}
