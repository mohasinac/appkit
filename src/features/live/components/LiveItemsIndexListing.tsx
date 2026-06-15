"use client";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../../products/hooks/useProducts";
import { BulkActionBar, Div, FilterDrawer, ListingToolbar, LoginRequiredModal, Pagination, Row, Text, useToast } from "../../../ui";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushWishlistOp } from "../../cart/utils/pending-ops";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { ROUTES } from "../../../next";
import { InteractiveProductCard } from "../../products/components/InteractiveProductCard";
import { LiveItemFilters } from "./LiveItemFilters";
import { ACTION_ID } from "../../products/constants/action-defs";
import { useBottomActions } from "../../layout";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

const SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Price: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Price: High to Low" },
] as const;

const FILTER_KEYS = [
  TABLE_KEYS.CATEGORY,
  TABLE_KEYS.SPECIES,
  TABLE_KEYS.JURISDICTION,
  TABLE_KEYS.MIN_PRICE,
  TABLE_KEYS.MAX_PRICE,
];

export interface LiveItemsIndexListingProps {
  initialData?: any;
}

export function LiveItemsIndexListing({ initialData }: LiveItemsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );

  const localWishlist = useGuestWishlist();
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "live").map((i) => i.itemId),
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
    onResetAll({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "" });
    setSearchInput("");
  }, [onResetAll]);

  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    filterActiveCount > 0;

  const params = {
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    category: table.get(TABLE_KEYS.CATEGORY) || undefined,
    minPrice: table.get(TABLE_KEYS.MIN_PRICE) ? Number(table.get(TABLE_KEYS.MIN_PRICE)) : undefined,
    maxPrice: table.get(TABLE_KEYS.MAX_PRICE) ? Number(table.get(TABLE_KEYS.MAX_PRICE)) : undefined,
    sort: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    perPage: table.getNumber(TABLE_KEYS.PAGE_SIZE, 24),
    listingType: "live" as const,
  };

  const { products, totalPages, page, isLoading } = useProducts(params as any, { initialData });

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const selection = useBulkSelection({ items: products as any[], keyExtractor: (p: any) => p.id });
  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  const wishlistActions = {
    addToWishlist: (productId: string) => {
      requireAuth(ACTION_ID.ADD_TO_WISHLIST, () => {
        localWishlist.add(productId, "live");
        pushWishlistOp({ op: "add", itemId: productId, type: "live" });
        showToast("Added to wishlist", "success");
      });
      return Promise.resolve();
    },
    removeFromWishlist: (productId: string) => {
      requireAuth(ACTION_ID.REMOVE_FROM_WISHLIST, () => {
        localWishlist.remove(productId, "live");
        pushWishlistOp({ op: "remove", itemId: productId, type: "live" });
        showToast("Removed from wishlist", "info");
      });
      return Promise.resolve();
    },
    isWishlisted: (productId: string) => wishlistedIds.has(productId),
  };

  function handleToggleWishlist(id: string) {
    if (wishlistActions.isWishlisted(id)) {
      wishlistActions.removeFromWishlist(id);
    } else {
      wishlistActions.addToWishlist(id);
    }
  }

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: [] } } : {});

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search live items…"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={(e) => { if (e.key === "Enter") commitSearch(); }}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={(v) => { if (v !== "table") setView(v as "grid" | "list"); }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        bulkMode={selection.isSelecting}
        bulkSelectedCount={selection.selectedCount}
        bulkTotalCount={products.length}
        onBulkSelectAll={selection.toggleAll}
        onBulkClear={selection.clearSelection}
      />

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={[]}
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

      <Div className="py-6">
        {isLoading ? (
          <Div className={gridClass}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Div key={i} className={`rounded-xl border border-zinc-100 dark:border-slate-700 ${__O.hidden} animate-pulse`}>
                <Div className="aspect-square bg-zinc-200 dark:bg-slate-700" />
                <Div className={`${__P.p3} space-y-2`}>
                  <Div className="h-3 bg-zinc-200 dark:bg-slate-700 w-3/4" rounded="default" />
                  <Div className="h-4 bg-zinc-200 dark:bg-slate-700 w-1/3" rounded="default" />
                </Div>
              </Div>
            ))}
          </Div>
        ) : products.length === 0 ? (
          <Text className="py-12" color="muted" size="sm" align="center">
            No live item listings found.
          </Text>
        ) : (
          <Div className={view === "list" ? "flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800" : gridClass}>
            {(products as any[]).map((product) => (
              <InteractiveProductCard
                key={product.id}
                product={product}
                href={String(ROUTES.PUBLIC.LIVE_DETAIL(product.id))}
                variant={view === "list" ? "list" : "grid"}
                isWishlisted={wishlistActions.isWishlisted(product.id)}
                onToggleWishlist={handleToggleWishlist}
                selectable={selection.isSelecting}
                isSelected={selection.isSelected(product.id)}
                onSelect={(id) => selection.toggle(id)}
              />
            ))}
          </Div>
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
        <LiveItemFilters table={pendingTable as any} categoryOptions={categoryOptions} />
      </FilterDrawer>

      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Div>
  );
}
