"use client";
import React, { useState, useCallback } from "react";
import { ShoppingCart, Heart, Columns } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import { Div, Pagination, useToast, BulkActionBar, ListingToolbar, LoginRequiredModal, FilterDrawer } from "../../../ui";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import { ACTION_ID, ACTION_META, COMPARE_MAX_ITEMS } from "../constants/action-defs";
import { CompareOverlay } from "./CompareOverlay";
import { ROUTES } from "../../../next";
import { ProductGrid, ProductFilters, PRODUCT_PUBLIC_SORT_OPTIONS } from ".";
import { useGuestCart } from "../../cart/hooks/useGuestCart";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushCartOp, pushWishlistOp } from "../../cart/utils/pending-ops";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../hooks/useBrands";
import { useProductFeatures } from "./ProductFeaturesContext";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { useBottomActions } from "../../layout";

type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);
const FILTER_KEYS = [TABLE_KEYS.CATEGORY, TABLE_KEYS.CONDITION, TABLE_KEYS.MIN_PRICE, TABLE_KEYS.MAX_PRICE, TABLE_KEYS.BRAND, TABLE_KEYS.STORE_ID, TABLE_KEYS.FREE_SHIPPING, TABLE_KEYS.TAGS, TABLE_KEYS.FEATURES, TABLE_KEYS.IS_PART_OF_BUNDLE];

export interface ProductsIndexListingProps {
  initialData?: any;
}

export function ProductsIndexListing({ initialData }: ProductsIndexListingProps) {
  const router = useRouter();
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const showSold = table.get(TABLE_KEYS.SHOW_SOLD) === "true";
  const [view, setView] = useState<ViewMode>(
    (table.get(TABLE_KEYS.VIEW) as ViewMode) || VIEW_MODE.GRID,
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
    onResetAll({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", [TABLE_KEYS.SHOW_SOLD]: "" });
    setSearchInput("");
  }, [onResetAll]);
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    table.get(TABLE_KEYS.SHOW_SOLD) === "true" ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    filterActiveCount > 0;

  const localCart = useGuestCart();
  const localWishlist = useGuestWishlist();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "product").map((i) => i.itemId),
  );
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);
  const { brandOptions } = useBrands();
  const features = useProductFeatures() ?? [];
  const featureOptions = features.map((f) => ({ value: f.id, label: f.label }));

  const params = {
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    category: table.get(TABLE_KEYS.CATEGORY) || undefined,
    minPrice: table.get(TABLE_KEYS.MIN_PRICE) ? Number(table.get(TABLE_KEYS.MIN_PRICE)) : undefined,
    maxPrice: table.get(TABLE_KEYS.MAX_PRICE) ? Number(table.get(TABLE_KEYS.MAX_PRICE)) : undefined,
    condition: table.get(TABLE_KEYS.CONDITION) || undefined,
    brand: table.get(TABLE_KEYS.BRAND) || undefined,
    storeId: table.get(TABLE_KEYS.STORE_ID) || undefined,
    freeShipping: table.get(TABLE_KEYS.FREE_SHIPPING) === "true" ? true : undefined,
    sort: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    perPage: table.getNumber(TABLE_KEYS.PAGE_SIZE, 24),
    listingType: "standard" as const,
    // Hide sold-out items by default. Uses stockQuantity>0 (always-present field)
    // instead of status=="published" because sellers don't actively transition status.
    inStock: showSold ? undefined : true,
  };

  const { products, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const selection = useBulkSelection({ items: products as any[], keyExtractor: (p: any) => p.id });

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
  };

  const handleViewToggle = (next: "grid" | "list" | "table") => {
    if (next === VIEW_MODE.TABLE) return;
    setView(next as ViewMode);
    table.set(TABLE_KEYS.VIEW, next);
  };

  const handleWishlistToggle = useCallback((productId: string) => {
    const isWishlisted = wishlistedIds.has(productId);
    requireAuth(isWishlisted ? ACTION_ID.REMOVE_FROM_WISHLIST : ACTION_ID.ADD_TO_WISHLIST, () => {
      if (isWishlisted) {
        localWishlist.remove(productId, "product");
        pushWishlistOp({ op: "remove", itemId: productId, type: "product" });
        showToast("Removed from wishlist", "info");
      } else {
        localWishlist.add(productId, "product");
        pushWishlistOp({ op: "add", itemId: productId, type: "product" });
        showToast("Added to wishlist", "success");
      }
    });
  }, [wishlistedIds, localWishlist, showToast, requireAuth]);

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

  const handleBuyNow = useCallback((product: any) => {
    requireAuth(ACTION_ID.BUY_NOW, () => {
      const snapshot = {
        productTitle: product.title,
        productImage: product.mainImage,
        price: product.price,
        storeId: product.storeId,
        storeName: product.storeName,
      };
      localCart.add(product.id, 1, snapshot);
      pushCartOp({ op: "add", productId: product.id, quantity: 1, ...snapshot });
      router.push(String(ROUTES.USER.CART));
    });
  }, [localCart, router, requireAuth]);

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: [
          {
            id: ACTION_ID.ADD_TO_CART,
            label: ACTION_META[ACTION_ID.ADD_TO_CART].label,
            icon: <ShoppingCart className="h-3.5 w-3.5" />,
            variant: "primary",
            onClick: () => {
              const selected = (products as any[]).filter((p) => selection.selectedIdSet.has(p.id));
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
                const selected = (products as any[]).filter((p) => selection.selectedIdSet.has(p.id));
                selected.forEach((p) => {
                  localWishlist.add(p.id, "product");
                  pushWishlistOp({ op: "add", itemId: p.id, type: "product" });
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
        ] } } : {});

  return (
    <Div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search products..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={handleSearchKeyDown}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={PRODUCT_PUBLIC_SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        bulkMode={selection.isSelecting}
        bulkSelectedCount={selection.selectedCount}
        bulkTotalCount={products.length}
        onBulkSelectAll={selection.toggleAll}
        onBulkClear={selection.clearSelection}
        toggles={[
          { label: "Show sold", active: showSold, onChange: (next) => table.set(TABLE_KEYS.SHOW_SOLD, next ? "true" : "") },
        ]}
      />

      {/* ── Bulk action bar (inline, replaces fixed bottom bar) ────────── */}
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
              const selected = (products as any[]).filter((p) => selection.selectedIdSet.has(p.id));
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
                const selected = (products as any[]).filter((p) => selection.selectedIdSet.has(p.id));
                selected.forEach((p) => {
                  localWishlist.add(p.id, "product");
                  pushWishlistOp({ op: "add", itemId: p.id, type: "product" });
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
        <Div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Div>
      )}

      {/* ── Product grid ───────────────────────────────────────────────── */}
      <Div className="py-6">
        {isLoading ? (
          <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Div key={i} className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
                <Div className="aspect-square bg-zinc-200 dark:bg-slate-700" />
                <Div className="p-3 space-y-2">
                  <Div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                  <Div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
                  <Div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-1/3" />
                </Div>
              </Div>
            ))}
          </Div>
        ) : (
          <ProductGrid
            products={products as any[]}
            getProductHref={(p) =>
              String(ROUTES.PUBLIC.PRODUCT_DETAIL((p as any).slug || p.id))
            }
            view={view === "grid" ? "card" : "list"}
            onWishlistToggle={handleWishlistToggle}
            wishlistedIds={wishlistedIds}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            selectionMode={selection.isSelecting}
            selectedIds={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
          />
        )}

      </Div>


      <CompareOverlay
        isOpen={compareIds.length > 0}
        productIds={compareIds}
        productType="product"
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
        <ProductFilters
          table={pendingTable as any}
          currencyPrefix="₹"
          categoryOptions={categoryOptions}
          brandOptions={brandOptions}
          featureOptions={featureOptions}
        />
      </FilterDrawer>
      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Div>
  );
}
