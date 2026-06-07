"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { Div, ListingFilterDrawer, ListingToolbar, Pagination, Row, Span, Text } from "../../../ui";
import { ReviewCard } from "../../reviews/components/ReviewsList";
import { ReviewFilters, REVIEW_PUBLIC_SORT_OPTIONS } from "../../reviews/components/ReviewFilters";
import { useStoreReviews } from "../hooks/useStores";
import type { UrlTable } from "../../filters/FilterPanel";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { REVIEW_FIELDS } from "../../../constants/field-names";

const __P = {
  p4: "p-4",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const PAGE_SIZE = 12;
const DEFAULT_SORT = sortBy(REVIEW_FIELDS.CREATED_AT);
const FILTER_KEYS = ["rating", TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO, "hasImages"];

const SORT_OPTION_LABELS: Record<string, string> = {
  sortNewest: "Newest First",
  sortOldest: "Oldest First",
  sortHighestRated: "Highest Rated",
  sortLowestRated: "Lowest Rated",
};

export interface StoreReviewsListingProps {
  storeSlug: string;
}

export function StoreReviewsListing({ storeSlug }: StoreReviewsListingProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );

  const handleViewToggle = (next: "grid" | "list" | "table") => {
    if (next === VIEW_MODE.TABLE) return;
    setView(next as "grid" | "list");
    table.set(TABLE_KEYS.VIEW, next);
  };

  const sort = table.get(TABLE_KEYS.SORT) || DEFAULT_SORT;
  const currentPage = table.getNumber(TABLE_KEYS.PAGE, 1);

  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const pendingTable = useMemo(() => ({
    get: (key: string) => pendingFilters[key] ?? "",
    getNumber: (key: string, fallback = 0) => {
      const v = pendingFilters[key];
      if (!v) return fallback;
      const n = Number(v);
      return isNaN(n) ? fallback : n;
    },
    set: (key: string, value: string) =>
      setPendingFilters((p) => ({ ...p, [key]: value })),
    setMany: (updates: Record<string, string>) =>
      setPendingFilters((p) => ({ ...p, ...updates })),
    clear: (keys?: string[]) => {
      const ks = keys ?? FILTER_KEYS;
      setPendingFilters((p) => ({
        ...p,
        ...Object.fromEntries(ks.map((k) => [k, ""])),
      }));
    },
    setPage: (_: number) => {},
    setPageSize: (_: number) => {},
    setSort: (_: string) => {},
    buildSieveParams: () => "",
    buildSearchParams: () => "",
    params: new URLSearchParams(),
  }), [pendingFilters]) as unknown as UrlTable;

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const ratingRaw = table.get("rating");
  const ratingNum = ratingRaw ? Number(ratingRaw.split("|")[0]) : undefined;
  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    activeFilterCount > 0;

  const { reviews, averageRating, totalReviews, totalPages, isLoading } = useStoreReviews(
    storeSlug,
    {
      rating: ratingNum,
      page: currentPage,
      pageSize: PAGE_SIZE,
      sort,
      q: table.get(TABLE_KEYS.QUERY) || undefined,
      dateFrom: table.get(TABLE_KEYS.DATE_FROM) || undefined,
      dateTo: table.get(TABLE_KEYS.DATE_TO) || undefined,
      hasImages: table.get("hasImages") === "true" ? true : undefined,
    },
  );

  const sortOptions = REVIEW_PUBLIC_SORT_OPTIONS.map((opt) => ({
    value: opt.value,
    label: SORT_OPTION_LABELS[opt.key] ?? opt.key,
  }));

  return (
    <Div className="min-h-screen">
      {/* ── Rating summary ───────────────────────────────────────────────── */}
      {totalReviews > 0 && (
        <Row align="center" gap="sm" className="px-4 py-3 border-b border-zinc-200 dark:border-slate-700">
          <Span weight="bold" className="text-2xl text-zinc-900 dark:text-zinc-100">
            {averageRating.toFixed(1)}
          </Span>
          <Span size="sm" className="text-zinc-500 dark:text-zinc-400">/ 5 · {totalReviews} reviews</Span>
        </Row>
      )}

      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search reviews..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={sort}
        sortOptions={sortOptions}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {/* ── Sticky pagination (below toolbar) ─────────────────────────── */}
      {totalPages > 1 && (
        <Div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Div>
      )}

      {/* ── Reviews grid ───────────────────────────────────────────────── */}
      <Div className="py-6 px-4">
        {isLoading ? (
          <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Div key={i} className={`rounded-xl border border-zinc-100 dark:border-slate-700 ${__O.hidden} animate-pulse`}>
                <Div className={`${__P.p4} space-y-3`}>
                  <Div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                  <Div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                  <Div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
                </Div>
              </Div>
            ))}
          </Div>
        ) : reviews.length === 0 ? (
          <Text className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No reviews found.
          </Text>
        ) : view === "list" ? (
          <Div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review as any} context="store" />
            ))}
          </Div>
        ) : (
          <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review as any} context="store" />
            ))}
          </Div>
        )}
      </Div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <ReviewFilters table={pendingTable} variant="public" />
      </ListingFilterDrawer>
    </Div>
  );
}
