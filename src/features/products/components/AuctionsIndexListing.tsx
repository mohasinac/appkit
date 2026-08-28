"use client";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import { BulkActionBar, Div, FilterDrawer, Grid, ListingToolbar, LoginRequiredModal, Pagination, Row, Stack, useToast, StickyToolbar } from "../../../ui";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { MarketplaceAuctionGrid } from "../../auctions/components/MarketplaceAuctionGrid";
import { AuctionFilters } from "../../auctions/components/AuctionFilters";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushWishlistOp } from "../../cart/utils/pending-ops";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../hooks/useBrands";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../constants/action-defs";
import { AUCTION_PUBLIC_SORT_OPTIONS } from "../constants/sieve";
import { useBottomActions } from "../../layout";
import { AVAILABILITY_VALUES, type AvailabilityFilter } from "../../../constants/field-names";
import { AvailabilityTabs } from "./AvailabilityTabs";
import type { ListingType } from "../types";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const DEFAULT_SORT = AUCTION_PUBLIC_SORT_OPTIONS[0].value;

const AUCTION_LISTING_TYPES: readonly ListingType[] = ["auction"];


const FILTER_KEYS = [TABLE_KEYS.CATEGORY, TABLE_KEYS.BRAND, TABLE_KEYS.MIN_BID, TABLE_KEYS.MAX_BID, TABLE_KEYS.STORE_ID, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO];

export interface AuctionsIndexListingProps {
  initialData?: any;
  categorySlug?: string;
  /** Filter auctions by brand name (for brand detail pages) */
  brandName?: string;
}

export function AuctionsIndexListing({ initialData, categorySlug, brandName }: AuctionsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const availability =
    (table.get(TABLE_KEYS.AVAILABILITY) as AvailabilityFilter) ||
    AVAILABILITY_VALUES.AVAILABLE;
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );
  const localWishlist = useGuestWishlist();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "auction").map((i) => i.itemId),
  );
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);
  const { brandOptions } = useBrands();

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
    onResetAll({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", [TABLE_KEYS.AVAILABILITY]: "" });
    setSearchInput("");
  }, [onResetAll]);
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    availability !== AVAILABILITY_VALUES.AVAILABLE ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    filterActiveCount > 0;

  const params = {
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    category: table.get(TABLE_KEYS.CATEGORY) || undefined,
    categorySlug: categorySlug || undefined,
    brand: brandName || table.get(TABLE_KEYS.BRAND) || undefined,
    minBid: table.get(TABLE_KEYS.MIN_BID) ? Number(table.get(TABLE_KEYS.MIN_BID)) : undefined,
    maxBid: table.get(TABLE_KEYS.MAX_BID) ? Number(table.get(TABLE_KEYS.MAX_BID)) : undefined,
    storeId: table.get(TABLE_KEYS.STORE_ID) || undefined,
    // Now purely the drawer's own end-date window. It used to double as the
    // hide-ended mechanism, which meant the drawer facet and the toggle fought
    // over one param; the scope tab owns that decision instead.
    dateFrom: table.get(TABLE_KEYS.DATE_FROM) || undefined,
    dateTo: table.get(TABLE_KEYS.DATE_TO) || undefined,
    sort: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    perPage: table.getNumber(TABLE_KEYS.PAGE_SIZE, 24),
    listingType: "auction" as const,
    availability,
  };

  const { products: auctions, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const selection = useBulkSelection({ items: auctions as any[], keyExtractor: (a: any) => a.id });

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
      requireAuth(ACTION_ID.WATCH_AUCTION, () => {
        localWishlist.add(productId, "auction");
        pushWishlistOp({ op: "add", itemId: productId, type: "auction" });
        showToast("Added to wishlist", "success");
      });
      return Promise.resolve();
    },
    removeFromWishlist: (productId: string) => {
      requireAuth(ACTION_ID.UNWATCH_AUCTION, () => {
        localWishlist.remove(productId, "auction");
        pushWishlistOp({ op: "remove", itemId: productId, type: "auction" });
        showToast("Removed from wishlist", "info");
      });
      return Promise.resolve();
    },
    isWishlisted: (productId: string) => wishlistedIds.has(productId),
  };

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: [
          {
            id: ACTION_ID.WATCH_AUCTION,
            label: "Add to Watchlist",
            variant: "primary",
            onClick: () => {
              const selected = (auctions as any[]).filter((a) => selection.selectedIdSet.has(a.id));
              selected.forEach((a) => { wishlistActions.addToWishlist(a.id); });
              selection.clearSelection();
            },
          },
          {
            id: ACTION_ID.UNWATCH_AUCTION,
            label: "Remove from Watchlist",
            variant: "secondary",
            onClick: () => {
              const selected = (auctions as any[]).filter((a) => selection.selectedIdSet.has(a.id));
              selected.forEach((a) => { wishlistActions.removeFromWishlist(a.id); });
              selection.clearSelection();
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
        searchPlaceholder="Search auctions..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={handleSearchKeyDown}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={AUCTION_PUBLIC_SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        bulkMode={selection.isSelecting}
        bulkSelectedCount={selection.selectedCount}
        bulkTotalCount={auctions.length}
        onBulkSelectAll={selection.toggleAll}
        onBulkClear={selection.clearSelection}
      />

      {/* ── Availability scope — Available / Ended / All ────────────────── */}
      <Div padding="y-sm">
        <AvailabilityTabs types={AUCTION_LISTING_TYPES} />
      </Div>

      {/* ── Bulk action bar ───────────────────────────────────────────── */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={[
          {
            id: ACTION_ID.WATCH_AUCTION,
            label: "Add to Watchlist",
            variant: "primary",
            onClick: () => {
              const selected = (auctions as any[]).filter((a) => selection.selectedIdSet.has(a.id));
              selected.forEach((a) => { wishlistActions.addToWishlist(a.id); });
              selection.clearSelection();
            },
          },
          {
            id: ACTION_ID.UNWATCH_AUCTION,
            label: "Remove from Watchlist",
            variant: "secondary",
            onClick: () => {
              const selected = (auctions as any[]).filter((a) => selection.selectedIdSet.has(a.id));
              selected.forEach((a) => { wishlistActions.removeFromWishlist(a.id); });
              selection.clearSelection();
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

      {/* ── Auction grid ───────────────────────────────────────────────── */}
      <Div padding="y-lg">
        {isLoading ? (
          <Grid cols="cards" gap="md">
            {Array.from({ length: 8 }).map((_, i) => (
              <Div key={i} className={`${__O.hidden} animate-pulse`} border="subtle" rounded="xl">
                <Div className="aspect-square" surface="subtle" />
                <Stack className={`${__P.p3}`} gap="sm">
                  <Div className="h-3 w-3/4" surface="subtle" rounded="default" />
                  <Div className="h-4 w-1/2" surface="subtle" rounded="default" />
                  <Div className="h-3 w-full" surface="subtle" rounded="default" />
                  <Div className="h-8" surface="subtle" rounded="default" />
                </Stack>
              </Div>
            ))}
          </Grid>
        ) : (
          <MarketplaceAuctionGrid
            auctions={auctions as any[]}
            variant={view === "list" ? "list" : "grid"}
            wishlistActions={wishlistActions}
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
        <AuctionFilters table={pendingTable as any} currencyPrefix="₹" categoryOptions={categoryOptions} brandOptions={brandOptions} />
      </FilterDrawer>
      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Div>
  );
}
