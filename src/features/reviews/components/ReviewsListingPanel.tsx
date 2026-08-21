"use client";
import React, { useCallback, useMemo, useState } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import {
  Div,
  ListingFilterDrawer,
  ListingToolbar,
  Pagination,
  Row,
  Span,
  Stack,
  StickyToolbar,
  Text,
} from "../../../ui";
import { ReviewCard } from "./ReviewsList";
import { ReviewFilters, REVIEW_PUBLIC_SORT_OPTIONS } from "./ReviewFilters";
import { useReviews } from "../hooks/useReviews";
import { useStoreReviews } from "../../stores/hooks/useStores";
import type { Review, ReviewListResponse } from "../types";
import type { ReviewCardContext } from "./ReviewsList";
import type { UrlTable } from "../../filters/FilterPanel";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { REVIEW_FIELDS } from "../../../constants/field-names";
import {
  REVIEWS_DETAIL_PAGE_SIZE,
  REVIEWS_PAGE_SIZE,
} from "../../../_internal/shared/features/reviews/config";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const DEFAULT_SORT = sortBy(REVIEW_FIELDS.CREATED_AT);

const SORT_OPTION_LABELS: Record<string, string> = {
  sortNewest: "Newest First",
  sortOldest: "Oldest First",
  sortHighestRated: "Highest Rated",
  sortLowestRated: "Lowest Rated",
};

/**
 * Which reviews this panel lists. `product` and `all` go through `/api/reviews`;
 * `store` goes through `/api/stores/[slug]/reviews`, which is the only endpoint that
 * can fan a store's reviews out across its products.
 */
export type ReviewsSource =
  | { kind: "product"; productId: string }
  | { kind: "store"; storeSlug: string }
  | { kind: "all" };

/**
 * Filter keys per source — these are the filters the panel actually applies, and
 * `ReviewFilters` is handed the same list so the drawer can never render a control
 * that silently does nothing.
 *
 * `product` drops the helpful-vote range: that is a Firestore inequality, and an
 * inequality filter forces the first `orderBy` onto the same field, which would break
 * every sort this panel offers. `hasImages` is only offered on `store`, whose route
 * filters in memory — the `productId`-scoped query has no index for it.
 */
const FILTER_KEYS_BY_KIND: Record<ReviewsSource["kind"], string[]> = {
  product: [TABLE_KEYS.RATING, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO],
  store: [TABLE_KEYS.RATING, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO, "hasImages"],
  all: [TABLE_KEYS.RATING, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO, "hasImages"],
};

/** Sorts that keep `createdAt` as the first ordering field. */
const CREATED_AT_SORTS: readonly string[] = [
  sortBy(REVIEW_FIELDS.CREATED_AT),
  sortBy(REVIEW_FIELDS.CREATED_AT, "ASC"),
];

export interface ReviewsListingPanelProps {
  source: ReviewsSource;
  pageSize?: number;
  context?: ReviewCardContext;
  /**
   * `"url"` writes page/sort/filters to the query string — right for the dedicated
   * review pages (shareable, SEO route segments read them back).
   *
   * `"local"` keeps that state in the component. Detail pages must use this: `useUrlTable`
   * calls `router.replace()` on every change, which re-runs the whole product/auction RSC
   * tree just to turn a page of reviews.
   */
  stateMode?: "url" | "local";
  /** SSR-seeded page 1. Only applied while the panel is genuinely at its default query. */
  initialData?: ReviewListResponse;
  /** Rating + count line above the toolbar. */
  showSummary?: boolean;
  /** Free-text search over product titles — meaningless on a single-product list. */
  showSearch?: boolean;
  variant?: "admin" | "seller" | "public";
  emptyLabel?: string;
  className?: string;
}

export function ReviewsListingPanel({
  source,
  pageSize,
  context = "general",
  stateMode = "url",
  initialData,
  showSummary = true,
  showSearch,
  variant = "public",
  emptyLabel = "No reviews found.",
  className = "",
}: ReviewsListingPanelProps) {
  const filterKeys = FILTER_KEYS_BY_KIND[source.kind];
  const effectivePageSize =
    pageSize ?? (stateMode === "local" ? REVIEWS_DETAIL_PAGE_SIZE : REVIEWS_PAGE_SIZE);
  const searchEnabled = showSearch ?? source.kind !== "product";

  // --- state backing: URL or local ------------------------------------------
  const urlTable = useUrlTable({
    defaults: { pageSize: String(effectivePageSize), sort: DEFAULT_SORT },
  });
  const [localState, setLocalState] = useState<Record<string, string>>({});

  const localTable = useMemo(() => {
    const get = (key: string) => localState[key] ?? "";
    const setMany = (updates: Record<string, string>) =>
      setLocalState((prev) => ({ ...prev, ...updates }));
    return {
      get,
      getNumber: (key: string, fallback = 0) => {
        const raw = localState[key];
        if (!raw) return fallback;
        const n = Number(raw);
        return Number.isNaN(n) ? fallback : n;
      },
      // Mirrors useUrlTable's NON_RESETTING_KEYS behaviour so paging semantics match
      // between the two state modes.
      set: (key: string, value: string) =>
        setLocalState((prev) => ({
          ...prev,
          [key]: value,
          ...(key === TABLE_KEYS.PAGE ||
          key === TABLE_KEYS.PAGE_SIZE ||
          key === TABLE_KEYS.VIEW
            ? {}
            : { [TABLE_KEYS.PAGE]: "1" }),
        })),
      setMany,
      clear: (keys?: string[]) => {
        const ks = keys ?? filterKeys;
        setMany(Object.fromEntries(ks.map((k) => [k, ""])));
      },
      setPage: (page: number) =>
        setLocalState((prev) => ({ ...prev, [TABLE_KEYS.PAGE]: String(page) })),
      setPageSize: (_: number) => {},
      setSort: (value: string) =>
        setLocalState((prev) => ({ ...prev, [TABLE_KEYS.SORT]: value, [TABLE_KEYS.PAGE]: "1" })),
      buildSieveParams: () => "",
      buildSearchParams: () => "",
      params: new URLSearchParams(),
    };
  }, [localState, filterKeys]) as unknown as ReturnType<typeof useUrlTable>;

  const table = stateMode === "url" ? urlTable : localTable;

  const [searchInput, setSearchInput] = useState(() => table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );

  const sort = table.get(TABLE_KEYS.SORT) || DEFAULT_SORT;
  const currentPage = table.getNumber(TABLE_KEYS.PAGE, 1);
  const query = table.get(TABLE_KEYS.QUERY) || undefined;
  const ratingRaw = table.get(TABLE_KEYS.RATING);
  const dateFrom = table.get(TABLE_KEYS.DATE_FROM) || undefined;
  const dateTo = table.get(TABLE_KEYS.DATE_TO) || undefined;
  const hasImages = table.get("hasImages") === "true" ? true : undefined;
  const isStore = source.kind === "store";

  /**
   * A date range is a Firestore inequality on `createdAt`, and Firestore requires the
   * first `orderBy` to be that same field — so "Highest/Lowest rated" cannot be served
   * while a date range is active. Withdraw those options and fall back to newest-first
   * instead of letting the query throw FAILED_PRECONDITION. Store-sourced reviews are
   * sorted in memory by their route, so they are exempt.
   */
  const dateRangeActive = !isStore && (!!dateFrom || !!dateTo);
  const effectiveSort =
    dateRangeActive && !CREATED_AT_SORTS.includes(sort) ? DEFAULT_SORT : sort;

  const activeFilterCount = filterKeys.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!query || sort !== DEFAULT_SORT || activeFilterCount > 0;

  /**
   * `useReviews` pins `staleTime: Infinity` whenever `initialData` is present, and its
   * query key includes the full query string — so handing SSR page-1 rows to a filtered
   * or later page would freeze the wrong rows into that key forever (Root Cause #30).
   * Only seed the exact query the SSR builder actually ran.
   */
  const isDefaultQuery =
    currentPage === 1 && sort === DEFAULT_SORT && activeFilterCount === 0 && !query;
  const seed = isDefaultQuery ? initialData : undefined;

  const handleViewToggle = (next: "grid" | "list" | "table") => {
    if (next === VIEW_MODE.TABLE) return;
    setView(next as "grid" | "list");
    table.set(TABLE_KEYS.VIEW, next);
  };

  // --- pending (buffered) filter state for the drawer -----------------------
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(filterKeys.map((k) => [k, table.get(k)])),
  );

  const pendingTable = useMemo(
    () =>
      ({
        get: (key: string) => pendingFilters[key] ?? "",
        getNumber: (key: string, fallback = 0) => {
          const raw = pendingFilters[key];
          if (!raw) return fallback;
          const n = Number(raw);
          return Number.isNaN(n) ? fallback : n;
        },
        set: (key: string, value: string) =>
          setPendingFilters((p) => ({ ...p, [key]: value })),
        setMany: (updates: Record<string, string>) =>
          setPendingFilters((p) => ({ ...p, ...updates })),
        clear: (keys?: string[]) => {
          const ks = keys ?? filterKeys;
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
      }) as unknown as UrlTable,
    [pendingFilters, filterKeys],
  );

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(filterKeys.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table, filterKeys]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { [TABLE_KEYS.PAGE]: "1" };
    for (const k of filterKeys) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table, filterKeys]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(filterKeys.map((k) => [k, ""])));
  }, [filterKeys]);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = {
      [TABLE_KEYS.QUERY]: "",
      [TABLE_KEYS.SORT]: "",
      [TABLE_KEYS.PAGE]: "1",
    };
    for (const k of filterKeys) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table, filterKeys]);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  // --- data -----------------------------------------------------------------
  // Both hooks are always called (hooks can't be conditional); the inactive one is
  // disabled, so react-query never fires its request.
  const reviewsQuery = useReviews(
    {
      productId: source.kind === "product" ? source.productId : undefined,
      status: source.kind === "product" ? "approved" : undefined,
      q: query,
      rating: ratingRaw || undefined,
      dateFrom,
      dateTo,
      minVotes: table.get("minVotes") ? Number(table.get("minVotes")) : undefined,
      maxVotes: table.get("maxVotes") ? Number(table.get("maxVotes")) : undefined,
      hasImages,
      sort: effectiveSort,
      page: currentPage,
      pageSize: effectivePageSize,
    },
    { initialData: seed, enabled: !isStore },
  );

  const storeQuery = useStoreReviews(
    isStore ? source.storeSlug : "",
    {
      rating: ratingRaw ? Number(ratingRaw.split("|")[0]) : undefined,
      page: currentPage,
      pageSize: effectivePageSize,
      sort,
      q: query,
      dateFrom,
      dateTo,
      hasImages,
    },
    { enabled: isStore },
  );

  const reviews = (isStore ? storeQuery.reviews : reviewsQuery.reviews) as Review[];
  const totalPages = isStore ? storeQuery.totalPages : reviewsQuery.totalPages;
  const isLoading = isStore ? storeQuery.isLoading : reviewsQuery.isLoading;
  const averageRating = isStore ? storeQuery.averageRating : reviewsQuery.averageRating;
  const totalReviews = isStore
    ? storeQuery.totalReviews
    : (reviewsQuery.totalApproved ?? reviewsQuery.total);

  const sortOptions = REVIEW_PUBLIC_SORT_OPTIONS.filter(
    (opt) => !dateRangeActive || CREATED_AT_SORTS.includes(opt.value),
  ).map((opt) => ({
    value: opt.value,
    label: SORT_OPTION_LABELS[opt.key] ?? opt.key,
  }));

  const paginationBlock =
    totalPages > 1 ? (
      <Row justify="center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => table.setPage(p)}
        />
      </Row>
    ) : null;

  return (
    <Div className={className}>
      {showSummary && (totalReviews ?? 0) > 0 && (
        <Row border="default" align="center" gap="sm" className="border-b" padding="inline">
          <Span weight="bold" size="2xl" color="primary">
            {(averageRating ?? 0).toFixed(1)}
          </Span>
          <Span size="sm" color="muted">
            / 5 · {totalReviews} review{totalReviews === 1 ? "" : "s"}
          </Span>
        </Row>
      )}

      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchEnabled ? searchInput : undefined}
        searchPlaceholder="Search reviews by product name..."
        onSearchChange={searchEnabled ? setSearchInput : undefined}
        onSearchCommit={searchEnabled ? commitSearch : undefined}
        sortValue={effectiveSort}
        sortOptions={sortOptions}
        onSortChange={(v) => {
          table.set(TABLE_KEYS.SORT, v);
        }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {/*
        Sticky pagination only makes sense when the panel owns the page. Inside a detail
        page's Reviews tab it would compete with that page's own sticky chrome, so the
        embedded (local-state) variant renders pagination inline under the list instead.
      */}
      {stateMode === "url" && paginationBlock && (
        <StickyToolbar offset="header+pagination" tone="translucent" border padding="toolbar">
          {paginationBlock}
        </StickyToolbar>
      )}

      <Div padding="y-lg">
        {isLoading ? (
          <Div layout="grid" gap="6" className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Div key={i} className={`${__O.hidden} animate-pulse`} border="subtle" rounded="xl">
                <Stack className={`${__P.p4}`} gap="3">
                  <Div className="h-4 w-3/4" surface="subtle" rounded="default" />
                  <Div className="h-3 w-full" surface="subtle" rounded="default" />
                  <Div className="h-3 w-2/3" surface="subtle" rounded="default" />
                </Stack>
              </Div>
            ))}
          </Div>
        ) : reviews.length === 0 ? (
          <Text paddingY="3xl" color="muted" size="sm" align="start">
            {emptyLabel}
          </Text>
        ) : view === "list" ? (
          <Stack
            className="divide-y divide-zinc-100 divide-[var(--appkit-color-border-subtle)]"
            border="subtle"
            rounded="xl"
          >
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} context={context} />
            ))}
          </Stack>
        ) : (
          <Div layout="grid" gap="6" className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} context={context} />
            ))}
          </Div>
        )}
      </Div>

      {stateMode === "local" && paginationBlock}

      <ListingFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      >
        <ReviewFilters table={pendingTable} variant={variant} keys={filterKeys} />
      </ListingFilterDrawer>
    </Div>
  );
}
