"use client";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useProducts } from "../../products/hooks/useProducts";
import { Div, FilterDrawer, ListingToolbar, LoginRequiredModal, Pagination, Row, Stack, useToast } from "../../../ui";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../../products/constants/action-defs";
import { MarketplaceAuctionGrid } from "../../auctions/components/MarketplaceAuctionGrid";
import { AuctionFilters } from "../../auctions/components/AuctionFilters";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushWishlistOp } from "../../cart/utils/pending-ops";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";

const __P = {
  p3: "p-3",
} as const;

const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.AUCTION_END_DATE, "ASC");

const AUCTION_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.AUCTION_END_DATE, "ASC"), label: "Ending Soonest" },
  { value: sortBy(PRODUCT_FIELDS.AUCTION_END_DATE), label: "Ending Latest" },
  { value: sortBy(PRODUCT_FIELDS.CURRENT_BID), label: "Highest Bid" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Price: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Price: High to Low" },
] as const;

const FILTER_KEYS = ["minBid", "maxBid", "dateFrom", "dateTo"];

export interface StoreAuctionsListingProps {
  /** Store document ID — used for filtering */
  storeId?: string;
  initialData?: any;
}

export function StoreAuctionsListing({ storeId, initialData }: StoreAuctionsListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">(
    (table.get("view") as "grid" | "list") || "grid",
  );
  const localWishlist = useGuestWishlist();
  const wishlistedIds = new Set(
    localWishlist.items.filter((i) => i.type === "auction").map((i) => i.itemId),
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
    table.get("sort") !== DEFAULT_SORT ||
    filterActiveCount > 0;

  const params = {
    q: table.get("q") || undefined,
    minBid: table.get("minBid") ? Number(table.get("minBid")) : undefined,
    maxBid: table.get("maxBid") ? Number(table.get("maxBid")) : undefined,
    dateFrom: table.get("dateFrom") || undefined,
    dateTo: table.get("dateTo") || undefined,
    sort: table.get("sort") || DEFAULT_SORT,
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    storeId: storeId || undefined,
    listingType: "auction" as const,
  };

  const { products: rawAuctions, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const auctions = rawAuctions.map((p: any) => ({
    id: p.id,
    title: p.title ?? p.name ?? "",
    description: p.description,
    price: p.price ?? 0,
    currency: p.currency || getDefaultCurrency(),
    mainImage: p.mainImage ?? p.images?.[0],
    images: p.images,
    listingType: "auction" as const,
    auctionEndDate: p.auctionEndDate,
    startingBid: p.startingBid ?? p.price,
    currentBid: p.currentBid,
    bidCount: p.bidCount,
    featured: p.featured,
    status: p.status,
    slug: p.slug,
    buyNowPrice: p.buyNowPrice,
  }));

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
    table.setPage(1);
  }, [searchInput, table]);

  const wishlistActions = {
    addToWishlist: (productId: string) => {
      requireAuth(ACTION_ID.WATCH_AUCTION, () => {
        localWishlist.add(productId, "auction");
        pushWishlistOp({ op: "add", itemId: productId, type: "auction" });
        showToast("Added to watchlist", "success");
      });
      return Promise.resolve();
    },
    removeFromWishlist: (productId: string) => {
      requireAuth(ACTION_ID.UNWATCH_AUCTION, () => {
        localWishlist.remove(productId, "auction");
        pushWishlistOp({ op: "remove", itemId: productId, type: "auction" });
        showToast("Removed from watchlist", "info");
      });
      return Promise.resolve();
    },
    isWishlisted: (productId: string) => wishlistedIds.has(productId),
  };

  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <Div className="min-h-[200px]">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search store auctions..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={AUCTION_SORT_OPTIONS}
        onSortChange={(v) => {
          table.set("sort", v);
        }}
        view={view}
        onViewChange={(v) => {
          if (v === "table") return;
          setView(v);
          table.set("view", v);
        }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {totalPages > 1 && (
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 backdrop-blur-sm border-b border-zinc-200 py-1.5" surface="default" padding="x-sm" justify="center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Row>
      )}

      <Div padding="y-lg">
        {isLoading ? (
          <Div className={gridClass}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Div
                key={i}
                className="dark:border-slate-700 overflow-hidden animate-pulse" border="subtle" rounded="xl"
              >
                <Div className="aspect-square" surface="subtle" />
                <Stack className={`${__P.p3}`} gap="sm">
                  <Div className="h-3 w-3/4" surface="subtle" rounded="default" />
                  <Div className="h-4 w-1/2" surface="subtle" rounded="default" />
                  <Div className="h-8" surface="subtle" rounded="default" />
                </Stack>
              </Div>
            ))}
          </Div>
        ) : (
          <MarketplaceAuctionGrid
            auctions={auctions as any[]}
            variant={view === "list" ? "list" : "grid"}
            gridClassName={view === "list" ? "flex flex-col gap-4" : gridClass}
            wishlistActions={wishlistActions}
            labels={{
              emptyTitle: "No auctions yet",
              emptyDescription: "This store has no active auctions.",
            }}
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
        <AuctionFilters table={pendingTable as any} currencyPrefix="₹" />
      </FilterDrawer>

      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Div>
  );
}
