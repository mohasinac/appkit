"use client";

/**
 * CategoryBundlesListing — SB-UNI-D + V replacement for the deleted
 * BundlesByCategoryListing. Renders a sortable, searchable, paginated list of
 * bundles that live as `categoryType:"bundle"` rows on the categories collection.
 *
 * All data is server-fetched; this component owns URL-state driven
 * sort/search/filter/pagination on top of the initial snapshot.
 */

import React, { useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { Badge, Div, Row, Text } from "../../../ui";
import { ListingToolbar, Pagination, FilterDrawer } from "../../../ui";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { ROUTES } from "../../../next/routing/route-map";
import { formatCurrency } from "../../../utils/number.formatter";
import type { CategoryDocument } from "../schemas";
import { BundleBuyNowCta } from "./BundleBuyNowCta";
import { TABLE_KEYS } from "../../../constants/table-keys";

const PAGE_SIZE = 12;
const FILTER_KEYS = ["showOutOfStock"];
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
] as const;
const DEFAULT_SORT = "-createdAt";

type StockKey = NonNullable<CategoryDocument["bundleStockStatus"]>;

const STOCK_BADGE_TEXT: Record<StockKey, string> = {
  in_stock: "",
  out_of_stock: "Not active",
};

const STOCK_BADGE_VARIANT: Record<StockKey, "success" | "warning"> = {
  in_stock: "success",
  out_of_stock: "warning",
};

const PLACEHOLDER_EMOJI = "📦" as const;

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
      <Div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
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
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </div>
      )}

      <div className="py-6">
        {pageItems.length === 0 ? (
          <Text className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No bundles match your search{brandName ? ` for ${brandName}` : ""}.
          </Text>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} onBuyNow={onBuyNow} />
            ))}
          </div>
        )}
      </div>

      <FilterDrawer
        open={filterOpen}
        onOpen={openFilters}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onReset={() => setPendingShowOutOfStock(false)}
        activeCount={filterActiveCount}
        hideTrigger
      >
        <div className="space-y-4 p-4">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Show out-of-stock bundles</span>
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
        </div>
      </FilterDrawer>
    </Div>
  );
}

interface BundleCardProps {
  bundle: CategoryDocument;
  onBuyNow?: (input: { bundleSlug: string }) => Promise<unknown>;
}

function BundleCard({ bundle, onBuyNow }: BundleCardProps) {
  const memberCount = bundle.bundleProductIds?.length ?? 0;
  const stock = bundle.bundleStockStatus ?? "in_stock";
  const badge = STOCK_BADGE_TEXT[stock];
  const cover = bundle.display?.coverImage;
  const href = String(ROUTES.PUBLIC.BUNDLE_DETAIL?.(bundle.slug) ?? "#");
  const price = bundle.bundlePriceInPaise;

  // Plan §8 — render a 2x2 collage of member product images when the bundle's
  // bundleItemDetails carry denormalised imageURLs. Falls back to the single
  // hero cover (or emoji placeholder) when fewer than 2 are available.
  const collageTiles = (bundle.bundleItemDetails ?? [])
    .filter((d) => Boolean(d.imageURL))
    .slice(0, 4);
  const showCollage = collageTiles.length >= 2;
  const overflow = memberCount - collageTiles.length;

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Link href={href} className="group block flex-1 p-3 hover:no-underline">
        <Div className="mb-2 aspect-video overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {showCollage ? (
            <Div
              className={`grid h-full w-full gap-0.5 ${
                collageTiles.length === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2"
              }`}
            >
              {collageTiles.map((tile, i) => (
                <Div key={`${tile.productId}-${i}`} className="relative overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tile.imageURL}
                    alt={tile.title ?? `${bundle.name} item ${i + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {i === collageTiles.length - 1 && overflow > 0 && (
                    <Div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                      +{overflow}
                    </Div>
                  )}
                </Div>
              ))}
            </Div>
          ) : cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={bundle.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <Div className="flex h-full w-full items-center justify-center text-3xl">
              {PLACEHOLDER_EMOJI}
            </Div>
          )}
        </Div>
        <Text className="line-clamp-2 text-sm font-semibold">{bundle.name}</Text>
        <Row gap="sm" align="center" className="mt-1">
          <Text size="sm" weight="bold">
            {price ? formatCurrency(price / 100, "INR") : "—"}
          </Text>
          <Text size="xs" color="muted">
            {memberCount} item{memberCount !== 1 ? "s" : ""}
          </Text>
        </Row>
        {badge && (
          <Badge variant={STOCK_BADGE_VARIANT[stock]} className="mt-1">
            {badge}
          </Badge>
        )}
      </Link>
      {onBuyNow && (
        <Div className="border-t border-zinc-100 p-3 pt-2 dark:border-zinc-800">
          <BundleBuyNowCta
            bundleSlug={bundle.slug}
            outOfStock={stock === "out_of_stock"}
            onBuyNow={onBuyNow}
            compact
          />
        </Div>
      )}
    </div>
  );
}
