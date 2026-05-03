"use client";
import React, { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useCategoriesList } from "../hooks/useCategories";
import { ROUTES } from "../../../next";
import { Pagination } from "../../../ui";
import { CategoryCard } from "./CategoryGrid";
import type { CategoryItem } from "../types";
import { CategoryFilters } from "./CategoryFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import { useUrlTable } from "../../../react/hooks/useUrlTable";

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: "name", label: "Name A–Z" },
  { value: "-name", label: "Name Z–A" },
  { value: "-productCount", label: "Most Products" },
];

export interface CategoriesIndexListingProps {
  initialData?: CategoryItem[];
}

export function CategoriesIndexListing({ initialData }: CategoriesIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: "name" } });
  const { categories, isLoading } = useCategoriesList({ initialData });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);

  const sort = table.get("sort") || "name";
  const activeSearch = table.get("q") || "";
  const page = table.getNumber("page", 1);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const clearSearch = () => {
    setSearchInput("");
    table.set("q", "");
  };

  const closeFilters = () => setFilterOpen(false);

  // Client-side filter: search + tier + featured + brand + rootOnly + itemCount
  const isFeatured = table.get("isFeatured") === "true";
  const isBrand = table.get("isBrand") === "true";
  const rootOnly = table.get("rootOnly") === "true";
  const minItemCount = table.get("minItemCount") ? Number(table.get("minItemCount")) : undefined;
  const maxItemCount = table.get("maxItemCount") ? Number(table.get("maxItemCount")) : undefined;
  const tierRaw = table.get("tier");
  const selectedTiers = tierRaw ? tierRaw.split("|").filter(Boolean) : [];

  const filtered = useMemo(() => {
    let result = [...categories];

    const q = activeSearch.toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q),
      );
    }

    if (isFeatured) result = result.filter((c) => (c as any).isFeatured === true);
    if (isBrand) result = result.filter((c) => (c as any).isBrand === true);
    if (rootOnly) result = result.filter((c) => (c as any).tier === 0 || !(c as any).parentId);
    if (selectedTiers.length > 0) {
      result = result.filter((c) => selectedTiers.includes(String((c as any).tier ?? "")));
    }
    if (minItemCount !== undefined) {
      result = result.filter((c) => {
        const count = (c as any).metrics?.totalItemCount ?? (c as any).productCount ?? 0;
        return count >= minItemCount;
      });
    }
    if (maxItemCount !== undefined) {
      result = result.filter((c) => {
        const count = (c as any).metrics?.totalItemCount ?? (c as any).productCount ?? 0;
        return count <= maxItemCount;
      });
    }

    result.sort((a, b) => {
      if (sort === "-productCount") {
        const aCount = a.metrics?.productCount ?? (a as any).productCount ?? 0;
        const bCount = b.metrics?.productCount ?? (b as any).productCount ?? 0;
        return bCount - aCount;
      }
      if (sort === "-name") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [categories, activeSearch, sort, isFeatured, isBrand, rootOnly, selectedTiers, minItemCount, maxItemCount]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4 -mx-4">
        <div className="flex items-center gap-2.5 max-w-full">

          {/* Filters button */}
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 dark:border-slate-600 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* Search */}
          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch()}
              placeholder="Search categories..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-2 text-zinc-400 hover:text-zinc-600 transition-colors"
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
          </div>

          {/* Sort */}
          <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort</span>
            <select
              value={sort}
              onChange={(e) => { table.set("sort", e.target.value); table.setPage(1); }}
              className="rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-primary/30"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Category grid ──────────────────────────────────────────────── */}
      <div className="py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-zinc-200 dark:bg-slate-700" />
                <div className="p-3.5 space-y-2">
                  <div className="h-3.5 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-7 bg-zinc-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {activeSearch ? `No categories matching "${activeSearch}"` : "No categories found"}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginated.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug))}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </div>
        )}
      </div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={closeFilters}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <button
                type="button"
                onClick={closeFilters}
                aria-label="Close filters"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <CategoryFilters table={table as unknown as UrlTable} variant="public" />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button
                type="button"
                onClick={closeFilters}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
