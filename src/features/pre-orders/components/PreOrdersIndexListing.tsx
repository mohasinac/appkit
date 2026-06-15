"use client";
import React, { useState, useCallback } from "react";
import { Columns, Heart, ShoppingCart } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../../products/hooks/useProducts";
import { BulkActionBar, Div, FilterDrawer, ListingToolbar, LoginRequiredModal, Pagination, Row, Stack, Text, useToast } from "../../../ui";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import { ACTION_ID, ACTION_META, COMPARE_MAX_ITEMS } from "../../products/constants/action-defs";
import { CompareOverlay } from "../../products/components/CompareOverlay";
import { ROUTES } from "../../../next";
import { MarketplacePreorderCard } from "./MarketplacePreorderCard";
import { PreOrderFilters } from "./PreOrderFilters";
import { useGuestCart } from "../../cart/hooks/useGuestCart";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushCartOp, pushWishlistOp } from "../../cart/utils/pending-ops";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../../products/hooks/useBrands";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { PREORDER_SORT_OPTIONS } from "../../products/constants/sieve";
import { useBottomActions } from "../../layout";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const DEFAULT_SORT = PREORDER_SORT_OPTIONS[2].value;

const FILTER_KEYS = [TABLE_KEYS.CATEGORY, TABLE_KEYS.BRAND, TABLE_KEYS.MIN_PRICE, TABLE_KEYS.MAX_PRICE, TABLE_KEYS.STORE_ID, TABLE_KEYS.PREORDER_STATUS, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO];

export interface PreOrdersIndexListingProps {
  initialData?: any;
  categorySlug?: string;
  /** Filter pre-orders by brand name (for brand detail pages) */
  brandName?: string;
}

export function PreOrdersIndexListing({ initialData, categorySlug, brandName }: PreOrdersIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const showClosed = table.get(TABLE_KEYS.SHOW_CLOSED) === "true";
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );

  const localCart = useGuestCart();
  const localWishlist = useGuestWishlist();
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);
  const { brandOptions } = useBrands();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "preorder").map((i) => i.itemId),
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
    onResetAll({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", [TABLE_KEYS.SHOW_CLOSED]: "" });
    setSearchInput("");
  }, [onResetAll]);
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    table.get(TABLE_KEYS.SHOW_CLOSED) === "true" ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    filterActiveCount > 0;

  const params = {
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    category: table.get(TABLE_KEYS.CATEGORY) || undefined,
    categorySlug: categorySlug || undefined,
    brand: brandName || table.get(TABLE_KEYS.BRAND) || undefined,
    minPrice: table.get(TABLE_KEYS.MIN_PRICE) ? Number(table.get(TABLE_KEYS.MIN_PRICE)) : undefined,
    maxPrice: table.get(TABLE_KEYS.MAX_PRICE) ? Number(table.get(TABLE_KEYS.MAX_PRICE)) : undefined,
    storeId: table.get(TABLE_KEYS.STORE_ID) || undefined,
    preOrderProductionStatus: (table.get(TABLE_KEYS.PREORDER_STATUS) || undefined) as "upcoming" | "in_production" | "ready_to_ship" | undefined,
    dateFrom: table.get(TABLE_KEYS.DATE_FROM) || undefined,
    dateTo: table.get(TABLE_KEYS.DATE_TO) || undefined,
    sort: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    perPage: table.getNumber(TABLE_KEYS.PAGE_SIZE, 24),
    listingType: "pre-order" as const,
    // Hide out-of-stock pre-orders by default. Uses stockQuantity>0 (always-present field).
    // Quota over-sign is intentional — never block pre-orders by availability.
    inStock: showClosed ? undefined : true,
  };

  const { products: preOrders, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

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
      requireAuth(ACTION_ID.ADD_TO_WISHLIST, () => {
        localWishlist.add(productId, "preorder");
        pushWishlistOp({ op: "add", itemId: productId, type: "preorder" });
        showToast("Added to wishlist", "success");
      });
      return Promise.resolve();
    },
    removeFromWishlist: (productId: string) => {
      requireAuth(ACTION_ID.REMOVE_FROM_WISHLIST, () => {
        localWishlist.remove(productId, "preorder");
        pushWishlistOp({ op: "remove", itemId: productId, type: "preorder" });
        showToast("Removed from wishlist", "info");
      });
      return Promise.resolve();
    },
    isWishlisted: (productId: string) => wishlistedIds.has(productId),
  };

  const handleAddToCart = useCallback((product: any) => {
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
  }, [localCart, showToast]);

  const selection = useBulkSelection({ items: preOrders as any[], keyExtractor: (p: any) => p.id });
  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  const handleBulkAddToCart = useCallback(() => {
    const selected = (preOrders as any[]).filter((p) => selection.selectedIdSet.has(p.id));
    selected.forEach((p) => {
      const snapshot = { productTitle: p.title, productImage: p.mainImage, price: p.price, storeId: p.storeId, storeName: p.storeName };
      localCart.add(p.id, 1, snapshot);
      pushCartOp({ op: "add", productId: p.id, quantity: 1, ...snapshot });
    });
    showToast(`${selected.length} items added to cart`, "success");
    selection.clearSelection();
  }, [preOrders, selection, localCart, showToast]);

  const handleBulkAddToWishlist = useCallback(() => {
    requireAuth(ACTION_ID.ADD_TO_WISHLIST, () => {
      const selected = (preOrders as any[]).filter((p) => selection.selectedIdSet.has(p.id));
      selected.forEach((p) => {
        localWishlist.add(p.id, "preorder");
        pushWishlistOp({ op: "add", itemId: p.id, type: "preorder" });
      });
      showToast(`${selected.length} items added to wishlist`, "success");
      selection.clearSelection();
    });
  }, [preOrders, selection, localWishlist, showToast, requireAuth]);

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: [
          {
            id: ACTION_ID.ADD_TO_CART,
            label: ACTION_META[ACTION_ID.ADD_TO_CART].label,
            icon: <ShoppingCart className="h-3.5 w-3.5" />,
            variant: "primary",
            onClick: handleBulkAddToCart,
          },
          {
            id: ACTION_ID.ADD_TO_WISHLIST,
            label: ACTION_META[ACTION_ID.ADD_TO_WISHLIST].label,
            icon: <Heart className="h-3.5 w-3.5" />,
            variant: "secondary",
            onClick: handleBulkAddToWishlist,
          },
          {
            id: ACTION_ID.COMPARE,
            label: ACTION_META[ACTION_ID.COMPARE].label,
            icon: <Columns className="h-3.5 w-3.5" />,
            variant: "secondary",
            disabled: selection.selectedCount < 2 || selection.selectedCount > COMPARE_MAX_ITEMS,
            onClick: () => {
              const ids = Array.from(selection.selectedIdSet).slice(0, COMPARE_MAX_ITEMS);
              setCompareIds(ids);
            },
          },
        ] } } : {});

  return (
    <Div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search pre-orders..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={handleSearchKeyDown}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={PREORDER_SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        bulkMode={selection.isSelecting}
        bulkSelectedCount={selection.selectedCount}
        bulkTotalCount={preOrders.length}
        onBulkSelectAll={selection.toggleAll}
        onBulkClear={selection.clearSelection}
        toggles={[
          { label: "Show closed", active: showClosed, onChange: (next) => table.set(TABLE_KEYS.SHOW_CLOSED, next ? "true" : "") },
        ]}
      />

      {/* ── Bulk action bar ───────────────────────────────────────────── */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={[
          {
            id: ACTION_ID.ADD_TO_CART,
            label: ACTION_META[ACTION_ID.ADD_TO_CART].label,
            icon: <ShoppingCart className="h-3.5 w-3.5" />,
            variant: "primary",
            onClick: () => {
              const selected = (preOrders as any[]).filter((p) => selection.selectedIdSet.has(p.id));
              selected.forEach((p) => {
                const snapshot = { productTitle: p.title, productImage: p.mainImage, price: p.price, storeId: p.storeId, storeName: p.storeName };
                localCart.add(p.id, 1, snapshot);
                pushCartOp({ op: "add", productId: p.id, quantity: 1, ...snapshot });
              });
              showToast(`${selected.length} items added to cart`, "success");
              selection.clearSelection();
            },
          },
          {
            id: ACTION_ID.ADD_TO_WISHLIST,
            label: ACTION_META[ACTION_ID.ADD_TO_WISHLIST].label,
            icon: <Heart className="h-3.5 w-3.5" />,
            variant: "secondary",
            onClick: () => {
              requireAuth(ACTION_ID.ADD_TO_WISHLIST, () => {
                const selected = (preOrders as any[]).filter((p) => selection.selectedIdSet.has(p.id));
                selected.forEach((p) => {
                  localWishlist.add(p.id, "preorder");
                  pushWishlistOp({ op: "add", itemId: p.id, type: "preorder" });
                });
                showToast(`${selected.length} items added to wishlist`, "success");
                selection.clearSelection();
              });
            },
          },
          {
            id: ACTION_ID.COMPARE,
            label: ACTION_META[ACTION_ID.COMPARE].label,
            icon: <Columns className="h-3.5 w-3.5" />,
            variant: "secondary",
            disabled: selection.selectedCount < 2 || selection.selectedCount > COMPARE_MAX_ITEMS,
            onClick: () => {
              const ids = Array.from(selection.selectedIdSet).slice(0, COMPARE_MAX_ITEMS);
              setCompareIds(ids);
            },
          },
        ] satisfies BulkActionItem[]}
      />

      {/* ── Sticky pagination (below toolbar) ─────────────────────────── */}
      {totalPages > 1 && (
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 backdrop-blur-sm border-b border-zinc-200 py-1.5" surface="default" padding="x-sm" justify="center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Row>
      )}

      {/* ── Pre-order grid ─────────────────────────────────────────────── */}
      <Div padding="y-lg">
        {isLoading ? (
          <Div className={gridClass}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Div key={i} className={`border border-zinc-100 dark:border-slate-700 ${__O.hidden} animate-pulse`} rounded="xl">
                <Div className="aspect-square" surface="subtle" />
                <Stack className={`${__P.p3}`} gap="sm">
                  <Div className="h-3 w-3/4" surface="subtle" rounded="default" />
                  <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
                  <Div className="h-4 w-1/3" surface="subtle" rounded="default" />
                  <Div className="h-8" surface="subtle" rounded="default" />
                </Stack>
              </Div>
            ))}
          </Div>
        ) : preOrders.length === 0 ? (
          <Text className="py-12" color="muted" size="sm" align="center">
            No pre-orders found.
          </Text>
        ) : view === "list" ? (
          <Stack className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800" rounded="xl">
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
          </Stack>
        ) : (
          <Div className={gridClass}>
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
          </Div>
        )}

      </Div>


      <CompareOverlay
        isOpen={compareIds.length > 0}
        productIds={compareIds}
        productType="preorder"
        onClose={() => {
          setCompareIds([]);
          selection.clearSelection();
        }}
        onRemove={(id) =>
          setCompareIds((ids) => ids.filter((i) => i !== id))
        }
      />

      <FilterDrawer
        open={filterOpen}
        onOpen={openFilters}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onReset={onFilterClear}
        activeCount={filterActiveCount}
        hideTrigger
      >
        <PreOrderFilters table={pendingTable as any} currencyPrefix="₹" categoryOptions={categoryOptions} brandOptions={brandOptions} />
      </FilterDrawer>
      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Div>
  );
}
