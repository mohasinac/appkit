"use client";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useProducts } from "../../products/hooks/useProducts";
import { Div } from "../../../ui/components/Div";
import { FilterDrawer } from "../../../ui/components/FilterDrawer";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { ListingToolbar } from "../../../ui/components/ListingToolbar";
import { LoginRequiredModal } from "../../../ui/components/LoginRequiredModal";
import { Pagination } from "../../../ui/components/Pagination";
import { useToast } from "../../../ui/components/toast-context";
import { StickyToolbar } from "../../../ui/components/StickyToolbar";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../../products/constants/action-defs";
import { MarketplaceCollectorDropGrid } from "../../collector-drops/components/MarketplaceCollectorDropGrid";
import { CollectorDropFilters } from "../../collector-drops/components/CollectorDropFilters";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { useGuestWishlist } from "../../wishlist/hooks/useGuestWishlist";
import { pushWishlistOp } from "../../cart/utils/pending-ops";

import { COLLECTOR_DROP_PUBLIC_SORT_OPTIONS } from "../../products/constants/sieve";
import { AvailabilityTabs } from "../../products/components/AvailabilityTabs";
import { AVAILABILITY_VALUES, type AvailabilityFilter } from "../../../constants/field-names";
import { TABLE_KEYS } from "../../../constants/table-keys";
import type { ListingType } from "../../products/types";
import { productImageUrls } from "../../products/schemas/firestore";

const STORE_COLLECTOR_DROP_TYPES: readonly ListingType[] = ["collector-drop"];

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

// Shared with /collector-drops — a local copy here drifted ("Ending Soonest" vs
// "Ending Soon", and it silently omitted Most Bids / Buy It Now).
const DEFAULT_SORT = COLLECTOR_DROP_PUBLIC_SORT_OPTIONS[0].value;

const FILTER_KEYS = ["minBid", "maxBid", "dateFrom", "dateTo"];

export interface StoreCollectorDropsListingProps {
  /** Store document ID — used for filtering */
  storeId?: string;
  initialData?: any;
}

export function StoreCollectorDropsListing({ storeId, initialData }: StoreCollectorDropsListingProps) {
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
    localWishlist.items.filter((i) => i.type === "collector-drop" || i.type === "auction").map((i) => i.itemId),
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

  // Absent means "available" — the same default `listStoreProducts`

  // resolves server-side. These six store tabs sent NO availability

  // param at all until 2026-08-24, while their SSR fetch did apply one,

  // so any client refetch silently widened the list (Root Cause #30).

  const availability =

    (table.get(TABLE_KEYS.AVAILABILITY) as AvailabilityFilter) ||

    AVAILABILITY_VALUES.AVAILABLE;

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
    listingType: "collector-drop" as const,
    availability,
  };

  const { products: rawCollectorDrops, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const collectorDrops = rawCollectorDrops.map((p: any) => ({
    id: p.id,
    title: p.title ?? p.name ?? "",
    description: p.description,
    price: p.price ?? 0,
    currency: p.currency || getDefaultCurrency(),
    mainImage: p.mainImage || productImageUrls(p.images)[0],
    images: p.images,
    listingType: "collector-drop" as const,
    collectorDropEndDate: p.collectorDropEndDate,
    startingBid: p.startingBid ?? p.price,
    currentBid: p.currentBid,
    bidCount: p.bidCount,
    featured: p.featured,
    status: p.status,
    slug: p.slug,
    buyNowPrice: p.buyNowPrice,
    // Read by isBuyNowAvailable() on the card — without it a sold collector drop still
    // offers a Buyout chip.
    isSold: p.isSold,
    // Renders the card's "by <seller>" line.
    storeId: p.storeId,
    storeName: p.storeName,
  }));

  const commitSearch = useCallback(() => {
    // table.set("q", v) already resets page to 1 — see root-cause #13.
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const wishlistActions = {
    addToWishlist: (productId: string) => {
      requireAuth(ACTION_ID.WATCH_COLLECTOR_DROP, () => {
        localWishlist.add(productId, "collector-drop");
        pushWishlistOp({ op: "add", itemId: productId, type: "collector-drop" });
        showToast("Added to watchlist", "success");
      });
      return Promise.resolve();
    },
    removeFromWishlist: (productId: string) => {
      requireAuth(ACTION_ID.UNWATCH_COLLECTOR_DROP, () => {
        localWishlist.remove(productId, "collector-drop");
        pushWishlistOp({ op: "remove", itemId: productId, type: "collector-drop" });
        showToast("Removed from watchlist", "info");
      });
      return Promise.resolve();
    },
    isWishlisted: (productId: string) => wishlistedIds.has(productId),
  };

  return (
    <Div className="min-h-[200px]">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search store collector drops..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={COLLECTOR_DROP_PUBLIC_SORT_OPTIONS}
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

      {/* ── Availability scope ───────────────────────────── */}
      <Div padding="y-sm">
        <AvailabilityTabs types={STORE_COLLECTOR_DROP_TYPES} />
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
          <Grid cols="cards" gap="md">
            {Array.from({ length: 8 }).map((_, i) => (
              <Div
                key={i}
                className="overflow-hidden animate-pulse" border="subtle" rounded="xl"
              >
                <Div className="aspect-square" surface="subtle" />
                <Stack className={`${__P.p3}`} gap="sm">
                  <Div className="h-3 w-3/4" surface="subtle" rounded="default" />
                  <Div className="h-4 w-1/2" surface="subtle" rounded="default" />
                  <Div className="h-8" surface="subtle" rounded="default" />
                </Stack>
              </Div>
            ))}
          </Grid>
        ) : (
          <MarketplaceCollectorDropGrid
            collectorDrops={collectorDrops as any[]}
            variant={view === "list" ? "list" : "grid"}
            wishlistActions={wishlistActions}
            labels={{
              emptyTitle: "No collector drops yet",
              emptyDescription: "This store has no active collector drops.",
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
        <CollectorDropFilters table={pendingTable as any} currencyPrefix="₹" />
      </FilterDrawer>

      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Div>
  );
}
