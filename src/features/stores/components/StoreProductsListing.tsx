"use client";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useProducts } from "../../products/hooks/useProducts";
import { Div, FilterDrawer, ListingToolbar, LoginRequiredModal, Pagination, Row, Stack, useToast, StickyToolbar } from "../../../ui";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../../products/constants/action-defs";
import type { ViewMode } from "../../../ui";
import { ROUTES } from "../../../next";
import { ProductGrid } from "../../products/components/ProductGrid";
import { ProductFilters, PRODUCT_PUBLIC_SORT_OPTIONS } from "../../products/components/ProductFilters";
import { useGuestCart } from "../../cart/hooks/useGuestCart";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushCartOp, pushWishlistOp } from "../../cart/utils/pending-ops";
import { AvailabilityTabs } from "../../products/components/AvailabilityTabs";
import { AVAILABILITY_VALUES, type AvailabilityFilter } from "../../../constants/field-names";
import { TABLE_KEYS } from "../../../constants/table-keys";
import type { ListingType } from "../../products/types";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const FILTER_KEYS = ["condition", "brand", "minPrice", "maxPrice"];

export interface StoreProductsListingProps {
  /** Store document ID — used for filtering */
  storeId?: string;
  /**
   * Listing types this tab spans. Defaults to `["standard"]`. The combined
   * Art & Stickers store tab passes both of its types so it renders real
   * content instead of the standard-only set it used to land on.
   */
  listingTypes?: readonly string[];
  initialData?: any;
}

export function StoreProductsListing({ storeId, listingTypes = ["standard"], initialData }: StoreProductsListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<ViewMode>((table.get("view") as ViewMode) || "card");
  const localCart = useGuestCart();
  const localWishlist = useGuestWishlist();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "product").map((i) => i.itemId),
  );

  const { pendingTable, filterActiveCount, onFilterApply, onFilterClear, onResetAll, onFilterReset } =
    usePendingTable(table, FILTER_KEYS);

  const openFilters = useCallback(() => {
    onFilterReset();
    setFilterOpen(true);
  }, [onFilterReset]);

  const applyFilters = useCallback(() => {
    onFilterApply();
    setFilterOpen(false);
  }, [onFilterApply]);

  const resetAll = useCallback(() => {
    onResetAll({ q: "", sort: "" });
    setSearchInput("");
  }, [onResetAll]);

  const hasActiveState =
    !!table.get("q") ||
    table.get("sort") !== "-createdAt" ||
    filterActiveCount > 0;

  // Absent means "available" — the same default `listStoreProducts`

  // resolves server-side. These six store tabs sent NO availability

  // param at all until 2026-08-24, while their SSR fetch did apply one,

  // so any client refetch silently widened the list (Root Cause #30).

  const availability =

    (table.get(TABLE_KEYS.AVAILABILITY) as AvailabilityFilter) ||

    AVAILABILITY_VALUES.AVAILABLE;


  const params = {
    q: table.get("q") || undefined,
    condition: table.get("condition") || undefined,
    brand: table.get("brand") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    sort: table.get("sort") || "-createdAt",
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    storeId: storeId || undefined,
    // Pipe-joined OR-group when the tab spans several types.
    listingType: listingTypes.join("|"),
    availability,
  };

  const { products, totalPages, page, isLoading } = useProducts(params as any, { initialData });

  const commitSearch = useCallback(() => {
    // table.set("q", v) already resets page to 1 — see root-cause #13.
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const handleViewToggle = (next: ViewMode) => {
    setView(next);
    table.set("view", next);
  };

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
        searchPlaceholder="Search store products..."
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

      {/* ── Availability scope ───────────────────────────── */}
      <Div padding="y-sm">
        <AvailabilityTabs types={listingTypes as readonly ListingType[]} />
      </Div>

      {totalPages > 1 && (
        <StickyToolbar offset="header+pagination" tone="translucent" border padding="toolbar">
          <Row justify="center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
          </Row>
        </StickyToolbar>
      )}

      <Div padding="y-lg">
        {isLoading ? (
          <Div layout="grid" gap="6" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Div
                key={i}
                className="overflow-hidden animate-pulse" border="subtle" rounded="xl"
              >
                <Div className="aspect-square" surface="subtle" />
                <Stack className={`${__P.p3}`} gap="sm">
                  <Div className="h-3 w-3/4" surface="subtle" rounded="default" />
                  <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
                  <Div className="h-4 w-1/3" surface="subtle" rounded="default" />
                </Stack>
              </Div>
            ))}
          </Div>
        ) : (
          <ProductGrid
            products={products as any[]}
            getProductHref={(p) =>
              String(ROUTES.PUBLIC.PRODUCT_DETAIL((p as any).slug || p.id))
            }
            view={view}
            emptyLabel="This store has no products yet."
            onWishlistToggle={handleWishlistToggle}
            wishlistedIds={wishlistedIds}
            onAddToCart={handleAddToCart}
          />
        )}
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
