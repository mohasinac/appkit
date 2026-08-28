"use client";
import React, { useState, useCallback } from "react";
import { ShoppingCart, Heart, Columns } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import { BulkActionBar, Div, FilterChipGroup, FilterDrawer, Grid, ListingToolbar, LoginRequiredModal, Pagination, Row, Stack, useToast, StickyToolbar } from "../../../ui";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import { ACTION_ID, ACTION_META, COMPARE_MAX_ITEMS } from "../constants/action-defs";
import { CompareOverlay } from "./CompareOverlay";
import { ROUTES } from "../../../next";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import { ProductGrid, ProductFilters, PRODUCT_PUBLIC_SORT_OPTIONS } from ".";
import { useGuestCart } from "../../cart/hooks/useGuestCart";
import { getGuestCartItems } from "../../cart/utils/guest-cart";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushCartOp, pushWishlistOp, dispatchCartUpdated, formatCartAddedMessage } from "../../cart/utils/pending-ops";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../hooks/useBrands";
import { useProductFeatures } from "./ProductFeaturesContext";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { useBottomActions } from "../../layout";
import { GENERIC_PRODUCT_LISTING_TYPES, PRODUCT_TYPE_FILTER_TABS } from "../constants/listing-tabs";
import { parseSelectedListingTypes } from "../utils/listing-type";
import { commonSortOptionsFor } from "../../../_internal/shared/listing-types/_registry";
import { AVAILABILITY_VALUES, type AvailabilityFilter } from "../../../constants/field-names";
import { AvailabilityTabs } from "./AvailabilityTabs";
import type { ListingType } from "../types";
import { TextLink } from "../../../ui";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);
const FILTER_KEYS = [TABLE_KEYS.CATEGORY, TABLE_KEYS.CONDITION, TABLE_KEYS.MIN_PRICE, TABLE_KEYS.MAX_PRICE, TABLE_KEYS.BRAND, TABLE_KEYS.STORE_ID, TABLE_KEYS.FREE_SHIPPING, TABLE_KEYS.TAGS, TABLE_KEYS.FEATURES, TABLE_KEYS.IS_PART_OF_BUNDLE];

export interface ProductsIndexListingProps {
  initialData?: any;
  /** Listing types this page's "All" tab spans. Defaults to the consolidated
   * generic set (standard/classified/digital-code/live). Pass a narrower set
   * (e.g. `["art", "stickers"]`) to reuse this component for a different
   * combined browse page. */
  listingTypes?: readonly string[];
  /** Type-filter chip tabs shown above the grid. Defaults to the generic
   * Products tabs; pass a matching set when overriding `listingTypes`. */
  typeTabs?: readonly { id: string; label: string }[];
  searchPlaceholder?: string;
}

export function ProductsIndexListing({
  initialData,
  listingTypes = GENERIC_PRODUCT_LISTING_TYPES,
  typeTabs = PRODUCT_TYPE_FILTER_TABS,
  searchPlaceholder = "Search products...",
}: ProductsIndexListingProps) {
  const router = useRouter();
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>(
    (table.get(TABLE_KEYS.VIEW) as ViewMode) || VIEW_MODE.GRID,
  );

  // ── Type filter (multi-select) ───────────────────────────────────────────
  // The URL value is a pipe-joined set; empty means "every type this page
  // spans". Unknown tokens are dropped rather than passed through to a
  // Firestore `==` that could never match (Root Cause #33).
  const typeParam = table.get(TABLE_KEYS.LISTING_TYPE);
  const selectedTypes = parseSelectedListingTypes(typeParam).filter((t) =>
    listingTypes.includes(t),
  );
  const effectiveTypes = (
    selectedTypes.length > 0 ? selectedTypes : listingTypes
  ) as readonly ListingType[];

  // Sorts valid across every selected type. Pick Auctions alone and you get
  // "Ending Soon"; pick Auctions + Products and you get only what both
  // support, because a sort on `auctionEndDate` would order the products
  // arbitrarily (and needs an index nobody declares for that shape).
  const sortOptions = commonSortOptionsFor(effectiveTypes, "public");
  const sortValue = table.get(TABLE_KEYS.SORT) || DEFAULT_SORT;
  // Guard against a sort carried over from a previous selection that the new
  // one can't satisfy — that combination throws FAILED_PRECONDITION in
  // Firestore and surfaces as a bare empty page (Root Cause #2).
  const effectiveSort = sortOptions.some((o) => o.value === sortValue)
    ? sortValue
    : DEFAULT_SORT;

  // The availability scope. Absent means "available" — the same default
  // `defaultAvailabilityForListingTypes` resolves server-side, which is what
  // keeps the SSR paint and the first refetch in agreement (Root Cause #30).
  const availability =
    (table.get(TABLE_KEYS.AVAILABILITY) as AvailabilityFilter) ||
    AVAILABILITY_VALUES.AVAILABLE;

  // "Full <type> filters →" — a single selected type with a dedicated browse
  // page gets a link to it, since that page carries facets this generic one
  // can't (bid range, delivery-date window, reveal status).
  const dedicatedPage =
    selectedTypes.length === 1 && pluginFor(selectedTypes[0]).browseRoute
      ? {
          href: pluginFor(selectedTypes[0]).browseRoute as string,
          label: `Full ${pluginFor(selectedTypes[0]).pluralLabel} filters →`,
        }
      : null;

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
    onResetAll({
      [TABLE_KEYS.QUERY]: "",
      [TABLE_KEYS.SORT]: "",
      [TABLE_KEYS.AVAILABILITY]: "",
      [TABLE_KEYS.LISTING_TYPE]: "",
    });
    setSearchInput("");
  }, [onResetAll]);
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    availability !== AVAILABILITY_VALUES.AVAILABLE ||
    !!typeParam ||
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
    // These three are in FILTER_KEYS (so they count toward the filter badge)
    // but were never put on the wire — the drawer sections were inert.
    tags: table.get(TABLE_KEYS.TAGS) || undefined,
    sublistingCategory: table.get(TABLE_KEYS.SUBLISTING_CATEGORY) || undefined,
    features: table.get(TABLE_KEYS.FEATURES) || undefined,
    sort: effectiveSort,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    perPage: table.getNumber(TABLE_KEYS.PAGE_SIZE, 24),
    // Pipe-joined OR-group — sievejs parses it as a same-field OR and the
    // Firebase adapter upgrades it to a `.where(…, "in", …)` query.
    listingType: effectiveTypes.join("|"),
    // One scope for every type. The per-type meaning of "unavailable" — sold
    // out, ended, closed, depleted — is resolved server-side from the listing
    // -type registry, which is why this no longer needs the old
    // "only when exactly one type is selected" caveat that let ended auctions
    // leak into the default /products view.
    availability,
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
    const items = getGuestCartItems();
    const detail = {
      productTitle: product.title,
      itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
      totalValue: items.reduce((sum, it) => sum + (it.price ?? 0) * it.quantity, 0),
    };
    showToast(formatCartAddedMessage(detail, (amount) => formatCurrency(amount, getDefaultCurrency())), "success");
    dispatchCartUpdated(detail);
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

  const handleBulkAddToCart = useCallback(() => {
    const selected = (products as any[]).filter((p) => selection.selectedIdSet.has(p.id));
    selected.forEach((p) => {
      const snapshot = { productTitle: p.title, productImage: p.mainImage, price: p.price, storeId: p.storeId, storeName: p.storeName };
      localCart.add(p.id, 1, snapshot);
      pushCartOp({ op: "add", productId: p.id, quantity: 1, ...snapshot });
    });
    showToast(`${selected.length} items added to cart`, "success");
    selection.clearSelection();
  }, [products, selection, localCart, showToast]);

  const handleBulkAddToWishlist = useCallback(() => {
    requireAuth(ACTION_ID.ADD_TO_WISHLIST, () => {
      const selected = (products as any[]).filter((p) => selection.selectedIdSet.has(p.id));
      selected.forEach((p) => {
        localWishlist.add(p.id, "product");
        pushWishlistOp({ op: "add", itemId: p.id, type: "product" });
      });
      showToast(`${selected.length} items added to wishlist`, "success");
      selection.clearSelection();
    });
  }, [products, selection, localWishlist, showToast, requireAuth]);

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
        searchPlaceholder={searchPlaceholder}
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={handleSearchKeyDown}
        sortValue={effectiveSort}
        sortOptions={sortOptions}
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
          // "Show sold" / "Show ended" used to live here. They WIDENED the
          // list rather than scoping it, so live and dead rows arrived mixed
          // together and the archive was unbrowsable — replaced by the
          // <AvailabilityTabs> scope bar below.
          //
          // Inline quick-filter: the highest-frequency drawer-only facet promoted
          // to the sticky toolbar so it doesn't require open-drawer → check → Apply
          // → close for every toggle. The full facet set (category/price/brand/…)
          // remains in <FilterDrawer> below.
          { label: "Free shipping", active: table.get(TABLE_KEYS.FREE_SHIPPING) === "true", onChange: (next: boolean) => table.set(TABLE_KEYS.FREE_SHIPPING, next ? "true" : "") },
        ]}
      />

      {/* ── Availability scope — Available / Sold & Ended / All ─────────── */}
      <Div padding="y-sm">
        <AvailabilityTabs types={effectiveTypes} />
      </Div>

      {/* ── Product-type chips — multi-select, spans every listing type ──── */}
      <Div padding="y-sm">
        <Row justify="between" align="center" wrap gap="sm">
          <FilterChipGroup
            multiple
            label="Type"
            tabs={typeTabs}
            value={selectedTypes.join("|")}
            onChange={(next) => {
              // Clear `sort` alongside the type change: a sort valid for the
              // old selection (say -auctionEndDate) can be invalid for the new
              // one, and useUrlTable's single router.replace means we must set
              // both in ONE call — a follow-up setPage/set would read stale
              // searchParams and overwrite this update (Root Cause #13).
              table.setMany({
                [TABLE_KEYS.LISTING_TYPE]: next,
                [TABLE_KEYS.SORT]: "",
              });
            }}
          />
          {dedicatedPage && (
            <TextLink href={dedicatedPage.href} size="sm" weight="medium">
              {dedicatedPage.label}
            </TextLink>
          )}
        </Row>
      </Div>

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

      {/* ── Product grid ───────────────────────────────────────────────── */}
      <Div padding="y-lg">
        {isLoading ? (
          <Grid cols="cards" gap="md">
            {Array.from({ length: 10 }).map((_, i) => (
              <Div key={i} className={`${__O.hidden} animate-pulse`} border="subtle" rounded="xl">
                <Div className="aspect-square" surface="subtle" />
                <Stack className={`${__P.p3}`} gap="sm">
                  <Div className="h-3 w-3/4" surface="subtle" rounded="default" />
                  <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
                  <Div className="h-4 w-1/3" surface="subtle" rounded="default" />
                </Stack>
              </Div>
            ))}
          </Grid>
        ) : (
          <ProductGrid
            products={products as any[]}
            getProductHref={(p) =>
              pluginFor((p as any).listingType ?? "standard").detailRoute((p as any).slug || p.id)
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
