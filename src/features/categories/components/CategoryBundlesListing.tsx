"use client";

/**
 * CategoryBundlesListing — SB-UNI-D + V replacement for the deleted
 * BundlesByCategoryListing. Renders a sortable, searchable, paginated list of
 * bundles that live as `categoryType:"bundle"` rows on the categories collection.
 *
 * All data is server-fetched; this component owns URL-state driven
 * sort/search/filter/pagination on top of the initial snapshot.
 */

import { Row, Stack, sortBy } from "@mohasinac/appkit";
import React, { useMemo, useCallback, useState } from "react";
import { Div, Span, Text } from "../../../ui";
import { ListingToolbar, Pagination, FilterDrawer } from "../../../ui";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import type { CategoryDocument } from "../schemas";
import { BundleBuyNowCta } from "./BundleBuyNowCta";
import { MarketplaceBundleCard } from "../../products/components/MarketplaceBundleCard";
import { TABLE_KEYS } from "../../../constants/table-keys";

const __P = {
  p4: "p-4",
} as const;

const PAGE_SIZE = 12;
const FILTER_KEYS = ["showOutOfStock"];
const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest First" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest First" },
  { value: sortBy("price", "ASC"), label: "Price: Low to High" },
  { value: sortBy("price", "DESC"), label: "Price: High to Low" },
] as const;
const DEFAULT_SORT = "-createdAt";


export interface CategoryBundlesListingProps {
  initialBundles: CategoryDocument[];
  brandName?: string;
  onBuyNow?: (input: { bundleSlug: string }) => Promise<unknown>;
}

export function CategoryBundlesListing({
  initialBundles,
  brandName,
  onBuyNow,
}: CategoryBundlesListingProps) {
  const table = useUrlTable({ defaults: { sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingShowOutOfStock, setPendingShowOutOfStock] = useState(
    table.get("showOutOfStock") === "true",
  );

  const sort = table.get(TABLE_KEYS.SORT) || DEFAULT_SORT;
  const query = table.get(TABLE_KEYS.QUERY) || "";
  const showOutOfStock = table.get("showOutOfStock") === "true";
  const page = table.getNumber(TABLE_KEYS.PAGE, 1);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const openFilters = useCallback(() => {
    setPendingShowOutOfStock(table.get("showOutOfStock") === "true");
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    table.setMany({ showOutOfStock: pendingShowOutOfStock ? "true" : "", page: "1" });
    setFilterOpen(false);
  }, [pendingShowOutOfStock, table]);

  const resetAll = useCallback(() => {
    table.setMany({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", showOutOfStock: "" });
    setSearchInput("");
  }, [table]);

  const hasActiveState =
    !!query ||
    sort !== DEFAULT_SORT ||
    showOutOfStock;

  const filtered = useMemo(() => {
    let list = initialBundles.filter((c) => c.categoryType === "bundle");
    if (!showOutOfStock) list = list.filter((c) => c.bundleStockStatus !== "out_of_stock");
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sort === "price") return (a.bundlePriceInPaise ?? 0) - (b.bundlePriceInPaise ?? 0);
      if (sort === "-price") return (b.bundlePriceInPaise ?? 0) - (a.bundlePriceInPaise ?? 0);
      if (sort === "createdAt") {
        const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return aT - bT;
      }
      const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bT - aT;
    });
    return list;
  }, [initialBundles, showOutOfStock, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const filterActiveCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;

  if (filtered.length === 0 && !query && !showOutOfStock) {
    return (
      <Div className="border-dashed text-center" padding="y-4xl" rounded="2xl" border="default">
        <Text color="muted">
          No bundles available{brandName ? ` for ${brandName}` : ""} yet.
        </Text>
      </Div>
    );
  }

  return (
    <Div className="min-h-[40vh]">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search bundles..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={(e) => { if (e.key === "Enter") commitSearch(); }}
        sortValue={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {totalPages > 1 && (
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 py-1.5" padding="x-sm" justify="center">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Row>
      )}

      <Div padding="y-lg">
        {pageItems.length === 0 ? (
          <Text className="py-16" color="muted" size="sm" align="center">
            No bundles match your search{brandName ? ` for ${brandName}` : ""}.
          </Text>
        ) : (
          <Div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((bundle) => (
              <Stack key={bundle.id}>
                <MarketplaceBundleCard bundle={bundle} />
                {onBuyNow && (
                  <Div surface="default" className="border-t border-zinc-100 pt-2 pb-3 dark:border-zinc-800 -mt-px rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800" padding="x-sm">
                    <BundleBuyNowCta
                      bundleSlug={bundle.slug}
                      outOfStock={bundle.bundleStockStatus === "out_of_stock"}
                      onBuyNow={onBuyNow}
                      compact
                    />
                  </Div>
                )}
              </Stack>
            ))}
          </Div>
        )}
      </Div>

      <FilterDrawer
        open={filterOpen}
        onOpen={openFilters}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onReset={() => setPendingShowOutOfStock(false)}
        activeCount={filterActiveCount}
        hideTrigger
      >
        <Stack className={`${__P.p4}`} gap="md">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <Span size="sm" weight="medium" color="muted">Show out-of-stock bundles</Span>
            <button
              type="button"
              role="switch"
              aria-checked={pendingShowOutOfStock}
              onClick={() => setPendingShowOutOfStock((v) => !v)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                pendingShowOutOfStock ? "bg-primary" : "bg-zinc-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  pendingShowOutOfStock ? "translate-x-[19px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </label>
        </Stack>
      </FilterDrawer>
    </Div>
  );
}

