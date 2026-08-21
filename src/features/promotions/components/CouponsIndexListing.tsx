"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { Button, DateInput, IconButton, Input, ListingFilterDrawer, Pagination, RadioGroup, SortDropdown, Div, Grid, Row, Span, Stack, Text, Heading, StickyToolbar } from "../../../ui";
import { usePromotions } from "../hooks/usePromotions";
import { CouponCard } from "./CouponCard";
import { CouponHelpDetails } from "./CouponHelpDetails";
import type { CouponType } from "../types";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { COUPON_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";

const __O = {
  hidden: "overflow-hidden",
} as const;

const DEFAULT_SORT = sortBy(COUPON_FIELDS.CREATED_AT);

const CLS_CHIP_BTN = "p-[var(--appkit-space-0)] min-h-0 h-auto inline-flex";

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
  /** If set, only show coupons from this store (id, for filtering) */
  storeId?: string;
}

const FILTER_KEYS = [TABLE_KEYS.TYPE, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO] as const;

export function CouponsIndexListing({
  initialCoupons,
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

  // Build Sieve filter string from committed URL table values. `validity.isActive==true`
  // is enforced server-side by /api/coupons itself — don't duplicate it here.
  const buildFilters = () => {
    const parts: string[] = [];
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
  const baseCoupons =
    !isLoading && coupons.length > 0
      ? coupons
      : !isLoading && initialCoupons && !table.get(TABLE_KEYS.QUERY) && !table.get(TABLE_KEYS.TYPE)
        ? initialCoupons
        : coupons;

  // The coupons dataset is always small (a handful to a few dozen per scope), and
  // neither the sieve schema nor the listingProcessor "coupons" collection support
  // substring/full-text search server-side — so the toolbar search filters the
  // already-fetched page client-side against code/name/description instead of
  // silently doing nothing (the search input previously wrote to the URL but was
  // never read by buildFilters()).
  const committedQuery = table.get(TABLE_KEYS.QUERY).trim().toLowerCase();
  const displayCoupons = committedQuery
    ? baseCoupons.filter((c: any) =>
        [c.code, c.name, c.description]
          .filter(Boolean)
          .some((field: string) => field.toLowerCase().includes(committedQuery)),
      )
    : baseCoupons;

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
      <StickyToolbar offset="header" tone="default" border padding="md" z="above-toolbar" dismissible id="coupons-toolbar">
        <Row gap="xs" className="max-w-full">
          {/* Filters button */}
          <Button
            type="button"
            variant={hasActiveFilters ? "outline" : "ghost"}
            onClick={openFilters}
            gap="sm"
            rounded="lg"
            paddingX="md"
            paddingY="sm"
            textSize="sm"
            weight="medium"
            className={hasActiveFilters ? "border-primary bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shrink-0" : "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] shrink-0"}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <Span className="hidden sm:inline">Filters{hasActiveFilters ? " •" : ""}</Span>
          </Button>

          {/* Search */}
          <Row surface="default" className={`flex-1 ${__O.hidden}`} border="strong" rounded="lg">
            <Input
              bare
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or description…"
              className="min-w-0 flex-1 bg-transparent px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text)] placeholder-zinc-400 outline-none"
            />
            {searchInput && (
              <IconButton
                type="button"
                onClick={() => { setSearchInput(""); table.set(TABLE_KEYS.QUERY, ""); }}
                aria-label="Clear search"
                variant="ghost"
                size="sm"
              >
                <X className="h-3.5 w-3.5" />
              </IconButton>
            )}
            <IconButton
              type="button"
              onClick={commitSearch}
              aria-label="Search"
              variant="ghost"
              size="sm"
            >
              <Search className="h-4 w-4" />
            </IconButton>
          </Row>

          {/* Sort */}
          <Row color="muted" textSize="sm" gap="xs" className="shrink-0">
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
              <Span layout="flex" gap="xs" size="xs" weight="medium" className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" rounded="full" padding="pill-sm-tall">
                {COUPON_TYPES.find((t) => t.value === activeType)?.label ?? activeType}
                <Button variant="ghost" type="button" onClick={() => { table.set(TABLE_KEYS.TYPE, ""); }} aria-label="Remove type filter" className={CLS_CHIP_BTN}>
                  <X className="h-3 w-3" />
                </Button>
              </Span>
            )}
            {table.get(TABLE_KEYS.DATE_FROM) && (
              <Span layout="flex" gap="xs" size="xs" weight="medium" className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" rounded="full" padding="pill-sm-tall">
                From: {table.get(TABLE_KEYS.DATE_FROM)}
                <Button variant="ghost" type="button" onClick={() => { table.set(TABLE_KEYS.DATE_FROM, ""); }} aria-label="Remove from-date filter" className={CLS_CHIP_BTN}>
                  <X className="h-3 w-3" />
                </Button>
              </Span>
            )}
            {table.get(TABLE_KEYS.DATE_TO) && (
              <Span layout="flex" gap="xs" size="xs" weight="medium" className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" rounded="full" padding="pill-sm-tall">
                To: {table.get(TABLE_KEYS.DATE_TO)}
                <Button variant="ghost" type="button" onClick={() => { table.set(TABLE_KEYS.DATE_TO, ""); }} aria-label="Remove to-date filter" className={CLS_CHIP_BTN}>
                  <X className="h-3 w-3" />
                </Button>
              </Span>
            )}
            <Button
              variant="ghost"
              type="button"
              onClick={clearFilters}
              textSize="xs"
              textColor="muted"
              className="underline"
            >
              Clear all
            </Button>
          </Row>
        )}
      </StickyToolbar>

      {/* ── How coupons work ────────────────────────────────────────────── */}
      <Div paddingY="y-md" paddingX="x-md">
        <CouponHelpDetails />
      </Div>

      {/* ── Coupon grid ─────────────────────────────────────────────────── */}
      <Div paddingY="y-lg" paddingX="x-md">
        {isLoading ? (
          <Grid gap="sm" className="md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Stack border="skeleton"
                key={i}
                gap="sm"
                rounded="xl"
                padding="md"
                className="animate-pulse"
              >
                <Div className="h-6 w-2/3" surface="subtle" rounded="default" />
                <Div className="h-4 w-full" surface="subtle" rounded="default" />
                <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
              </Stack>
            ))}
          </Grid>
        ) : displayCoupons.length === 0 ? (
          <Div className="text-left" padding="y-4xl">
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
          <Div className="mt-4 text-left">
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
            <RadioGroup
              name="coupon-type"
              variant="classic"
              options={COUPON_TYPES}
              value={pendingTable.get(TABLE_KEYS.TYPE)}
              onChange={(v) => { pendingTable.set(TABLE_KEYS.TYPE, v); }}
            />
            {pendingTable.get(TABLE_KEYS.TYPE) && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => { pendingTable.set(TABLE_KEYS.TYPE, ""); }}
                textSize="xs"
                textColor="faint"
                className="underline w-fit"
              >
                Clear type
              </Button>
            )}
          </Stack>
        </>

        {/* Date range */}
        <>
          <Heading level={6} className="tracking-wider mb-3" color="muted" size="xs" weight="semibold" transform="uppercase">
            Valid Date Range
          </Heading>
          <Stack gap="sm">
            <DateInput
              label="From date"
              value={pendingTable.get(TABLE_KEYS.DATE_FROM) || ""}
              onChange={(v) => { pendingTable.set(TABLE_KEYS.DATE_FROM, v); }}
            />
            <DateInput
              label="To date"
              value={pendingTable.get(TABLE_KEYS.DATE_TO) || ""}
              onChange={(v) => { pendingTable.set(TABLE_KEYS.DATE_TO, v); }}
            />
          </Stack>
        </>
      </ListingFilterDrawer>
    </Div>
  );
}
