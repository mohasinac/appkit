"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBlogPosts } from "../hooks/useBlog";
import { Div, ListingFilterDrawer, ListingToolbar, Pagination, Row, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next";
import { BlogCard } from "./BlogListView";
import { BlogFilters, BLOG_PUBLIC_SORT_OPTIONS } from "./BlogFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import type { BlogPostCategory } from "../types";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { BLOG_FIELDS } from "../../../constants/field-names";

const __P = {
  p5: "p-5",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

type BlogPost = Parameters<typeof BlogCard>[0]["post"];

function renderBlogGrid(props: { isLoading: boolean; posts: BlogPost[]; view: "grid" | "list" }) {
  const { isLoading, posts, view } = props;
  if (isLoading) {
    return (
      <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Div key={i} className={`rounded-xl border border-zinc-100 dark:border-slate-700 ${__O.hidden} animate-pulse`}>
            <Div className="aspect-video bg-zinc-200 dark:bg-slate-700" />
            <Div className={`${__P.p5} space-y-2`}>
              <Div className="h-3 bg-zinc-200 dark:bg-slate-700 w-1/4" rounded="default" />
              <Div className="h-4 bg-zinc-200 dark:bg-slate-700 w-3/4" rounded="default" />
              <Div className="h-3 bg-zinc-200 dark:bg-slate-700 w-full" rounded="default" />
              <Div className="h-3 bg-zinc-200 dark:bg-slate-700 w-2/3" rounded="default" />
            </Div>
          </Div>
        ))}
      </Div>
    );
  }
  if (posts.length === 0) {
    return <Text className="py-12" color="muted" size="sm" align="center">No posts found.</Text>;
  }
  if (view === "list") {
    return (
      <Stack className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800" rounded="xl">
        {posts.map((post) => <BlogCard key={post.id} post={post} href={String(ROUTES.BLOG.ARTICLE(post.slug))} />)}
      </Stack>
    );
  }
  return (
    <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => <BlogCard key={post.id} post={post} href={String(ROUTES.BLOG.ARTICLE(post.slug))} />)}
    </Div>
  );
}

function renderBlogFilterDrawer(props: {
  filterOpen: boolean; setFilterOpen: (v: boolean) => void;
  activeFilterCount: number; clearFilters: () => void;
  applyFilters: () => void; pendingTable: UrlTable;
}) {
  const { filterOpen, setFilterOpen, activeFilterCount, clearFilters, applyFilters, pendingTable } = props;
  return (
    <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
      <BlogFilters table={pendingTable} variant="public" />
    </ListingFilterDrawer>
  );
}

const PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(BLOG_FIELDS.PUBLISHED_AT);
const FILTER_KEYS = [TABLE_KEYS.CATEGORY, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO];

export interface BlogIndexListingProps {
  initialData?: any;
}

export function BlogIndexListing({ initialData }: BlogIndexListingProps) {
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
    !!table.get(TABLE_KEYS.TAGS) ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    activeFilterCount > 0;

  const params = {
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    category: (table.get(TABLE_KEYS.CATEGORY) || undefined) as BlogPostCategory | undefined,
    tags: table.get(TABLE_KEYS.TAGS) || undefined,
    sort: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    perPage: table.getNumber(TABLE_KEYS.PAGE_SIZE, PAGE_SIZE),
  };

  const { posts, total, totalPages, isLoading } = useBlogPosts(params, { initialData });
  const currentPage = table.getNumber("page", 1);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  return (
    <Div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search posts..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={BLOG_PUBLIC_SORT_OPTIONS as any}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {/* ── Sticky pagination (below toolbar) ─────────────────────────── */}
      {totalPages > 1 && (
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5" justify="center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Row>
      )}

      {/* ── Blog grid ──────────────────────────────────────────────────── */}
      <Div className="py-6">{renderBlogGrid({ isLoading, posts, view })}</Div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {renderBlogFilterDrawer({ filterOpen, setFilterOpen, activeFilterCount, clearFilters, applyFilters, pendingTable })}
    </Div>
  );
}
