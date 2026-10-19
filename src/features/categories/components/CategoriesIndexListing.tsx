"use client";
import React, { useState, useCallback, useMemo } from "react";


import { useCategoriesFiltered } from "../hooks/useCategories";
import {
  CATEGORY_TABS,
  DEFAULT_CATEGORY_TAB,
  matchesCategoryTab,
  type CategoryTabKey,
} from "../constants/category-tabs";
import { ROUTES } from "../../../next/routing/route-map";
import { Button, Div, Grid, ListingFilterDrawer, ListingToolbar, OverflowRow, Pagination, Row, Stack, Text, StickyToolbar } from "../../../ui";
import { CategoryCard } from "./CategoryGrid";
import type { CategoryItem } from "../types";
import { CategoryFilters } from "./CategoryFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { CATEGORY_FIELDS } from "../../../constants/field-names";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const PAGE_SIZE = 24;

function renderCategoryGrid(props: {
  isLoading: boolean; categories: CategoryItem[]; view: "grid" | "list";
  activeSearch: string; activeTab: string; brandsOnly: boolean;
}) {
  const { isLoading, categories, view, activeSearch, activeTab, brandsOnly } = props;
  const isBrandView = activeTab === "brands" || brandsOnly;
  /* The empty state names the tab the visitor is actually on. It said
   * "categories" on all five, so an empty Parts tab reported the wrong thing. */
  const noun = brandsOnly
    ? "brands"
    : (CATEGORY_TABS.find((t) => t.key === activeTab)?.label ?? "categories").toLowerCase();
  if (isLoading) {
    return (
      <Grid cols="categoryCards" gap="md">
        {Array.from({ length: 10 }).map((_, i) => (
          <Div key={i} className={`${__O.hidden} animate-pulse`} border="subtle" rounded="xl">
            <Div className="aspect-[4/3]" surface="subtle" />
            <Stack className={`${__P.p3}.5`} gap="sm">
              <Div className="h-3.5 w-3/4" surface="subtle" rounded="default" />
              <Div className="h-3 w-full" surface="subtle" rounded="default" />
            </Stack>
          </Div>
        ))}
      </Grid>
    );
  }
  if (categories.length === 0) {
    return (
      <Text paddingY="3xl" color="muted" size="sm" align="start">
        {activeSearch ? `No ${noun} matching "${activeSearch}"` : `No ${noun} found`}
      </Text>
    );
  }
  if (view === "list") {
    return (
      <Stack className="divide-y divide-zinc-100 divide-[var(--appkit-color-border-subtle)]" border="subtle" rounded="xl">
        {categories.map((category) => <CategoryCard key={category.id} category={category} href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug))} />)}
      </Stack>
    );
  }
  return (
    <Grid cols="categoryCards" gap="md">
      {categories.map((category) => <CategoryCard key={category.id} category={category} href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug))} />)}
    </Grid>
  );
}

function renderCategoryFilterDrawer(props: {
  filterOpen: boolean; setFilterOpen: (v: boolean) => void;
  activeFilterCount: number; clearFilters: () => void;
  applyFilters: () => void; pendingTable: UrlTable;
}) {
  const { filterOpen, setFilterOpen, activeFilterCount, clearFilters, applyFilters, pendingTable } = props;
  return (
    <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
      <CategoryFilters table={pendingTable} variant="public" />
    </ListingFilterDrawer>
  );
}

function getNumericParam(table: UrlTable, key: string): number | undefined {
  return table.get(key) ? Number(table.get(key)) : undefined;
}
/*
 * 🛑 TIER FIRST, NOT NAME. Found by
 * checklist-happy-path-guest-browse-categories-index-lists-roots, 2026-09-29.
 *
 * This was `name ASC`, which sorts 47 categories alphabetically with no
 * awareness of the tree — so BOTH roots fell off page 1. "Spinning Tops" sorts
 * under S onto page 3 and "Living Collectibles" under L onto page 2, while
 * their own descendants filled page 1: Bits, Blades, Discs, Drivers, Energy
 * Rings. A visitor opening /categories met component-level leaves, eight of
 * them reading "0 items", and never saw either root.
 *
 * `tier` is already `canSort: true` in the repository's SIEVE_FIELDS, and a
 * single-field sort needs no composite index, so this costs nothing to deploy.
 * Deliberately NOT `tier ASC, name ASC`: that pairing has no
 * `(tier, name)` index and a missing composite fails as an empty page rather
 * than an error (Root Cause #59).
 */
const DEFAULT_SORT = sortBy(CATEGORY_FIELDS.TIER, "ASC");
const FILTER_KEYS = [TABLE_KEYS.IS_FEATURED, "isBrand", "rootOnly", "tier", "minItemCount", "maxItemCount"];

const SORT_OPTIONS = [
  { value: sortBy(CATEGORY_FIELDS.TIER, "ASC"), label: "Top level first" },
  { value: sortBy(CATEGORY_FIELDS.NAME, "ASC"), label: "Name A–Z" },
  { value: sortBy(CATEGORY_FIELDS.NAME), label: "Name Z–A" },
  { value: sortBy("metrics.productCount", "DESC"), label: "Most Products" },
];

export interface CategoriesIndexListingProps {
  /*
   * 🛑 `initialData` was REMOVED 2026-10-09, not deprecated.
   *
   * It was destructured as `initialData: _` and discarded — this component has
   * always fetched through `useCategoriesFiltered` regardless — while
   * `CategoriesIndexPageView` paid a 200-document Firestore read on every render
   * to produce it. Removing the prop rather than ignoring it is deliberate: a
   * prop that exists invites someone to pass it again, and the compiler is the
   * only thing that reliably prevents that.
   */
  /** When true, filters to brands only (for the standalone /brands page) */
  brandsOnly?: boolean;
}

export function CategoriesIndexListing({ brandsOnly = false }: CategoriesIndexListingProps) {
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
  const page = table.getNumber(TABLE_KEYS.PAGE, 1);

  // Pending filter state — buffered until "Apply Filters" clicked
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

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    activeFilterCount > 0;

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  /*
   * Tab state. Five tabs, no "All" — see `category-tabs.ts`: "All" was the
   * default and it was what rendered 1,185 undifferentiated rows.
   */
  const rawTab = brandsOnly ? "brands" : table.get(TABLE_KEYS.TAB) || DEFAULT_CATEGORY_TAB;
  const activeTab = (CATEGORY_TABS.some((t) => t.key === rawTab)
    ? rawTab
    : DEFAULT_CATEGORY_TAB) as CategoryTabKey;

  /*
   * 🛑 The fetch stays unfiltered (`?flat=true`) and the TABS partition that one
   * cached response — a per-tab query would turn one request into five for the
   * same data. `isBrand` is still sent for the brands tab because the API has a
   * dedicated clause for it; everything else is partitioned below.
   */
  const isBrandParam: boolean | undefined = activeTab === "brands" ? true : undefined;

  const switchTab = (key: string) => {
    table.set(TABLE_KEYS.TAB, key);
  };

  const { categories, totalPages, isLoading } = useCategoriesFiltered({
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    isFeatured: table.get(TABLE_KEYS.IS_FEATURED) === "true" || undefined,
    isBrand: isBrandParam,
    // The tab partition — applied before pagination inside the hook.
    predicate: (c) => matchesCategoryTab(c as never, activeTab),
    rootOnly: table.get("rootOnly") === "true" || undefined,
    tier: getNumericParam(table, "tier"),
    minProductCount: getNumericParam(table, "minItemCount"),
    maxProductCount: getNumericParam(table, "maxItemCount"),
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const activeSearch = table.get(TABLE_KEYS.QUERY) || "";

  /*
   * 🛑 `<OverflowRow>`, not a hand-rolled row of ghost Buttons.
   *
   * This was five `<Button variant="ghost">`s in a `<Row>` with a hand-written
   * underline — no `role="tablist"`, no `role="tab"`, and no overflow
   * behaviour at all, so on a narrow viewport the last tabs simply ran past
   * the right edge with no scrollbar and no affordance. The Known-TS-Patterns
   * table bans exactly that shape ("A hand-rolled overflow-x-auto row of
   * pills/tabs → <OverflowRow>"), and the primitive built for it had shipped
   * three weeks earlier without this surface being migrated.
   *
   * `variant="tabs"` because these swap a panel in place — they rewrite the
   * `tab` URL param and re-partition one already-cached payload; they do not
   * navigate. That is also why the items carry `onSelect` rather than `href`,
   * and therefore why `linkProps`/`scroll` do not apply here.
   */
  const tabItems = CATEGORY_TABS.map((tab) => ({
    id: tab.key,
    label: tab.label,
    onSelect: () => switchTab(tab.key),
  }));

  return (
    <Div className="min-h-screen">
      {/* ── Tab bar — only shown on the combined /categories page ──────── */}
      {!brandsOnly && (
        <Div className="mb-2">
          <OverflowRow
            items={tabItems}
            activeId={activeTab}
            variant="tabs"
            ariaLabel="Category index sections"
            searchPlaceholder="Search sections…"
          />
        </Div>
      )}

      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder={activeTab === "brands" || brandsOnly ? "Search brands..." : "Search categories..."}
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        toggles={[
          { label: "Featured only", active: table.get(TABLE_KEYS.IS_FEATURED) === "true", onChange: (next) => table.set(TABLE_KEYS.IS_FEATURED, next ? "true" : "") },
        ]}
      />

      {/* ── Sticky pagination (below toolbar) ─────────────────────────── */}
      {totalPages > 1 && (
        <StickyToolbar offset="header+pagination" tone="translucent" border padding="toolbar">
          <Row justify="center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
          </Row>
        </StickyToolbar>
      )}

      {/* ── Category / brand grid ──────────────────────────────────────── */}
      <Div padding="y-lg">{renderCategoryGrid({ isLoading, categories, view, activeSearch, activeTab, brandsOnly })}</Div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {renderCategoryFilterDrawer({ filterOpen, setFilterOpen, activeFilterCount, clearFilters, applyFilters, pendingTable })}
    </Div>
  );
}
