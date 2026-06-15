"use client";
import React, { useState, useCallback, useMemo } from "react";


import { useCategoriesFiltered } from "../hooks/useCategories";
import { ROUTES } from "../../../next";
import { Div, ListingFilterDrawer, ListingToolbar, Pagination, Row, Stack, Text } from "../../../ui";
import { CategoryCard } from "./CategoryGrid";
import type { CategoryItem } from "../types";
import { CategoryFilters } from "./CategoryFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { CATEGORY_FIELDS } from "../../../constants/field-names";

const __P = {
  p3: "p-3",
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
  if (isLoading) {
    return (
      <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Div key={i} className={`dark:border-slate-700 ${__O.hidden} animate-pulse`} border="subtle" rounded="xl">
            <Div className="aspect-[4/3]" surface="subtle" />
            <Stack className={`${__P.p3}.5`} gap="sm">
              <Div className="h-3.5 w-3/4" surface="subtle" rounded="default" />
              <Div className="h-3 w-full" surface="subtle" rounded="default" />
            </Stack>
          </Div>
        ))}
      </Div>
    );
  }
  if (categories.length === 0) {
    return (
      <Text className="py-12" color="muted" size="sm" align="center">
        {activeSearch ? `No ${isBrandView ? "brands" : "categories"} matching "${activeSearch}"` : isBrandView ? "No brands found" : "No categories found"}
      </Text>
    );
  }
  if (view === "list") {
    return (
      <Stack className="divide-y divide-zinc-100 dark:divide-zinc-800" border="subtle" rounded="xl">
        {categories.map((category) => <CategoryCard key={category.id} category={category} href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug))} />)}
      </Stack>
    );
  }
  return (
    <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {categories.map((category) => <CategoryCard key={category.id} category={category} href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug))} />)}
    </Div>
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
const DEFAULT_SORT = sortBy(CATEGORY_FIELDS.NAME, "ASC");
const FILTER_KEYS = [TABLE_KEYS.IS_FEATURED, "isBrand", "rootOnly", "tier", "minItemCount", "maxItemCount"];

const SORT_OPTIONS = [
  { value: sortBy(CATEGORY_FIELDS.NAME, "ASC"), label: "Name A–Z" },
  { value: sortBy(CATEGORY_FIELDS.NAME), label: "Name Z–A" },
  { value: sortBy("productCount", "DESC"), label: "Most Products" },
];

export interface CategoriesIndexListingProps {
  initialData?: CategoryItem[];
  /** When true, filters to brands only (for the standalone /brands page) */
  brandsOnly?: boolean;
}

export function CategoriesIndexListing({ initialData: _, brandsOnly = false }: CategoriesIndexListingProps) {
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

  const clearSearch = () => {
    setSearchInput("");
    table.set(TABLE_KEYS.QUERY, "");
  };

  // Tab state — "all" | "categories" | "brands" (not used when brandsOnly=true)
  const activeTab = brandsOnly ? "brands" : (table.get(TABLE_KEYS.TAB) || "all");

  const isBrandParam: boolean | undefined =
    brandsOnly ? true :
    activeTab === "brands" ? true :
    activeTab === "categories" ? false :
    undefined;

  const switchTab = (key: string) => {
    table.set(TABLE_KEYS.TAB, key);
  };

  const { categories, total, totalPages, isLoading } = useCategoriesFiltered({
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    isFeatured: table.get(TABLE_KEYS.IS_FEATURED) === "true" || undefined,
    isBrand: isBrandParam,
    rootOnly: table.get("rootOnly") === "true" || undefined,
    tier: getNumericParam(table, "tier"),
    minProductCount: getNumericParam(table, "minItemCount"),
    maxProductCount: getNumericParam(table, "maxItemCount"),
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const activeSearch = table.get(TABLE_KEYS.QUERY) || "";

  const TABS = [
    { key: "all", label: "All" },
    { key: "categories", label: "Categories" },
    { key: "brands", label: "Brands" },
  ] as const;

  return (
    <Div className="min-h-screen">
      {/* ── Tab bar — only shown on the combined /categories page ──────── */}
      {!brandsOnly && (
        <Div className="flex gap-1 border-b border-zinc-200 dark:border-slate-700 mb-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={[
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary dark:text-primary-400 dark:border-primary-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
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
      />

      {/* ── Sticky pagination (below toolbar) ─────────────────────────── */}
      {totalPages > 1 && (
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 backdrop-blur-sm border-b border-zinc-200 py-1.5" surface="default" padding="x-sm" justify="center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </Row>
      )}

      {/* ── Category / brand grid ──────────────────────────────────────── */}
      <Div padding="y-lg">{renderCategoryGrid({ isLoading, categories, view, activeSearch, activeTab, brandsOnly })}</Div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {renderCategoryFilterDrawer({ filterOpen, setFilterOpen, activeFilterCount, clearFilters, applyFilters, pendingTable })}
    </Div>
  );
}
