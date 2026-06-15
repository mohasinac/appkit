"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { Button, Label, ListingFilterDrawer, Pagination, SortDropdown, Div, Grid, Row, Span, Stack, Text, Heading } from "../../../ui";
import { usePromotions } from "../hooks/usePromotions";
import { CouponCard } from "./CouponCard";
import type { CouponType } from "../types";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { COUPON_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";

const __O = {
  hidden: "overflow-hidden",
} as const;

const DEFAULT_SORT = sortBy(COUPON_FIELDS.CREATED_AT);

const CLS_CHIP_BTN = "p-0 min-h-0 h-auto inline-flex";

const COUPON_SORT_OPTIONS = [
  { value: sortBy(COUPON_FIELDS.NAME, "ASC"), label: "Name A–Z" },
  { value: sortBy(COUPON_FIELDS.NAME), label: "Name Z–A" },
  { value: sortBy(COUPON_FIELDS.VALIDITY_FIELDS.END_DATE, "ASC"), label: "Expiring Soon" },
  { value: sortBy(COUPON_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(COUPON_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
];

const COUPON_TYPES: { value: CouponType; label: string }[] = [
  { value: COUPON_FIELDS.TYPE_VALUES.PERCENTAGE, label: "% Off" },
  { value: COUPON_FIELDS.TYPE_VALUES.FIXED, label: "Fixed Amount" },
  { value: COUPON_FIELDS.TYPE_VALUES.FREE_SHIPPING, label: "Free Shipping" },
  { value: COUPON_FIELDS.TYPE_VALUES.BUY_X_GET_Y, label: "Buy X Get Y" },
];

export interface CouponsIndexListingProps {
  /** Pre-fetched coupons to show on first render */
  initialCoupons?: any[];
  /** If set, only show coupons from this store (slug, for display) */
  storeSlug?: string;
  /** If set, only show coupons from this store (id, for filtering) */
  storeId?: string;
}

const FILTER_KEYS = [TABLE_KEYS.TYPE, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO] as const;

export function CouponsIndexListing({
  initialCoupons,
  storeSlug,
  storeId,
}: CouponsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "12", sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);

  // Pending filter state — buffered until "Apply Filters" clicked
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const pendingTable = useMemo(() => ({
    get: (key: string) => pendingFilters[key] ?? "",
    set: (key: string, value: string) =>
      setPendingFilters((p) => ({ ...p, [key]: value })),
  }), [pendingFilters]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { [TABLE_KEYS.PAGE]: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearPending = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  // Build Sieve filter string from committed URL table values
  const buildFilters = () => {
    const parts: string[] = [`${COUPON_FIELDS.VALIDITY_FIELDS.IS_ACTIVE}==true`];
    const typeFilter = table.get(TABLE_KEYS.TYPE);
    if (typeFilter) parts.push(`${COUPON_FIELDS.TYPE}==${typeFilter}`);
    const dateFrom = table.get(TABLE_KEYS.DATE_FROM);
    if (dateFrom) parts.push(`${COUPON_FIELDS.VALIDITY_FIELDS.START_DATE}>=${dateFrom}`);
    const dateTo = table.get(TABLE_KEYS.DATE_TO);
    if (dateTo) parts.push(`${COUPON_FIELDS.VALIDITY_FIELDS.END_DATE}<=${dateTo}`);
    if (storeId) parts.push(`${COUPON_FIELDS.STORE_ID}==${storeId}`);
    return parts.join(",");
  };

  const { promotions: coupons, total, totalPages, isLoading } = usePromotions({
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    pageSize: table.getNumber(TABLE_KEYS.PAGE_SIZE, 12),
    sort: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    filters: buildFilters(),
  });

  // Use initial data on first load if available and no search/filter active
  const displayCoupons =
    !isLoading && coupons.length > 0
      ? coupons
      : !isLoading && initialCoupons && !table.get(TABLE_KEYS.QUERY) && !table.get(TABLE_KEYS.TYPE)
        ? initialCoupons
        : coupons;

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
  };

  const activeType = table.get(TABLE_KEYS.TYPE) as CouponType | "";
  const hasActiveFilters = !!activeType || !!table.get(TABLE_KEYS.DATE_FROM) || !!table.get(TABLE_KEYS.DATE_TO);

  const clearFilters = () => {
    table.setMany({ type: "", [TABLE_KEYS.DATE_FROM]: "", [TABLE_KEYS.DATE_TO]: "" });
  };

  return (
    <Div className="min-h-[40vh]">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <Div className="sticky top-[var(--header-height,0px)] z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <Row gap="xs" className="max-w-full">
          {/* Filters button */}
          <button
            type="button"
            onClick={openFilters}
            className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
              hasActiveFilters
                ? "border-primary bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <Span className="hidden sm:inline">Filters{hasActiveFilters ? " •" : ""}</Span>
          </button>

          {/* Search */}
          <Row surface="default" className={`flex-1 ${__O.hidden} rounded-lg border border-zinc-300 dark:border-slate-600`}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or description…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); table.set(TABLE_KEYS.QUERY, ""); }}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={commitSearch}
              className="flex shrink-0 items-center justify-center px-3 py-2 text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </Row>

          {/* Sort */}
          <Row gap="xs" className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
            <Span className="hidden md:inline whitespace-nowrap">Sort by</Span>
            <SortDropdown
              value={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
              onChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
              options={COUPON_SORT_OPTIONS as any}
            />
          </Row>
        </Row>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <Row gap="xs" wrap className="mt-2">
            {activeType && (
              <Span size="xs" weight="medium" className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2.5 py-1">
                {COUPON_TYPES.find((t) => t.value === activeType)?.label ?? activeType}
                <Button variant="ghost" type="button" onClick={() => { table.set(TABLE_KEYS.TYPE, ""); }} aria-label="Remove type filter" className={CLS_CHIP_BTN}>
                  <X className="h-3 w-3" />
                </Button>
              </Span>
            )}
            {table.get(TABLE_KEYS.DATE_FROM) && (
              <Span size="xs" weight="medium" className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2.5 py-1">
                From: {table.get(TABLE_KEYS.DATE_FROM)}
                <Button variant="ghost" type="button" onClick={() => { table.set(TABLE_KEYS.DATE_FROM, ""); }} aria-label="Remove from-date filter" className={CLS_CHIP_BTN}>
                  <X className="h-3 w-3" />
                </Button>
              </Span>
            )}
            {table.get(TABLE_KEYS.DATE_TO) && (
              <Span size="xs" weight="medium" className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2.5 py-1">
                To: {table.get(TABLE_KEYS.DATE_TO)}
                <Button variant="ghost" type="button" onClick={() => { table.set(TABLE_KEYS.DATE_TO, ""); }} aria-label="Remove to-date filter" className={CLS_CHIP_BTN}>
                  <X className="h-3 w-3" />
                </Button>
              </Span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
            >
              Clear all
            </button>
          </Row>
        )}
      </Div>

      {/* ── Coupon grid ─────────────────────────────────────────────────── */}
      <Div className="px-4" padding="y-lg">
        {isLoading ? (
          <Grid gap="sm" className="md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Stack
                key={i}
                gap="sm"
                rounded="xl"
                padding="md"
                className="border-2 border-zinc-100 dark:border-slate-700 animate-pulse"
              >
                <Div className="h-6 w-2/3" surface="subtle" rounded="default" />
                <Div className="h-4 w-full" surface="subtle" rounded="default" />
                <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
              </Stack>
            ))}
          </Grid>
        ) : displayCoupons.length === 0 ? (
          <Div className="text-center" padding="y-4xl">
            <Text color="faint">No coupons match your search.</Text>
          </Div>
        ) : (
          <Grid gap="sm" className="md:grid-cols-2 lg:grid-cols-3">
            {displayCoupons.map((coupon: any) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                labels={{
                  copy: "Copy",
                  copied: "Copied!",
                  expires: "Expires",
                  minOrder: "Min. order",
                  off: "OFF",
                  freeShipping: "Free Shipping",
                }}
              />
            ))}
          </Grid>
        )}

        {totalPages > 1 && (
          <Row justify="center" className="mt-8">
            <Pagination
              currentPage={table.getNumber("page", 1)}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </Row>
        )}

        {!isLoading && total > 0 && (
          <Div className="mt-4 text-center">
            <Text size="xs" color="faint">{total} coupon{total !== 1 ? "s" : ""} available</Text>
          </Div>
        )}
      </Div>

      {/* ── Filter Drawer ──────────────────────────────────────────────── */}
      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearPending} activeCount={activeFilterCount}>
        {/* Coupon type */}
        <>
          <Heading level={6} className="tracking-wider mb-3" color="muted" size="xs" weight="semibold" transform="uppercase">
            Discount Type
          </Heading>
          <Stack gap="xs">
            {COUPON_TYPES.map((t) => (
              <Label key={t.value} className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300" size="sm">
                <input
                  type="radio"
                  name="coupon-type"
                  value={t.value}
                  checked={pendingTable.get(TABLE_KEYS.TYPE) === t.value}
                  onChange={() => { pendingTable.set(TABLE_KEYS.TYPE, t.value); }}
                  className="accent-primary"
                />
                {t.label}
              </Label>
            ))}
            {pendingTable.get(TABLE_KEYS.TYPE) && (
              <button
                type="button"
                onClick={() => { pendingTable.set(TABLE_KEYS.TYPE, ""); }}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
              >
                Clear type
              </button>
            )}
          </Stack>
        </>

        {/* Date range */}
        <>
          <Heading level={6} className="tracking-wider mb-3" color="muted" size="xs" weight="semibold" transform="uppercase">
            Valid Date Range
          </Heading>
          <Stack gap="sm">
            <>
              <Label className="block text-zinc-500 dark:text-zinc-400 mb-1" size="xs">From date</Label>
              <input
                type="date"
                value={pendingTable.get(TABLE_KEYS.DATE_FROM) || ""}
                onChange={(e) => { pendingTable.set(TABLE_KEYS.DATE_FROM, e.target.value); }}
                className="w-full rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary"
              />
            </>
            <>
              <Label className="block text-zinc-500 dark:text-zinc-400 mb-1" size="xs">To date</Label>
              <input
                type="date"
                value={pendingTable.get(TABLE_KEYS.DATE_TO) || ""}
                onChange={(e) => { pendingTable.set(TABLE_KEYS.DATE_TO, e.target.value); }}
                className="w-full rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary"
              />
            </>
          </Stack>
        </>
      </ListingFilterDrawer>
    </Div>
  );
}
