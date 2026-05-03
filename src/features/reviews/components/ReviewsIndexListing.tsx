"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { Pagination, SortDropdown } from "../../../ui";
import { ReviewCard } from "./ReviewsList";
import { ReviewFilters, REVIEW_PUBLIC_SORT_OPTIONS } from "./ReviewFilters";
import type { Review } from "../types";
import type { UrlTable } from "../../filters/FilterPanel";

const PAGE_SIZE = 12;

export interface ReviewsIndexListingProps {
  reviews: Review[];
  variant?: "admin" | "seller" | "public";
}

export function ReviewsIndexListing({
  reviews,
  variant = "public",
}: ReviewsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: "-createdAt" } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const closeFilters = () => setFilterOpen(false);

  const activeSearch = table.get("q");
  const ratingFilter = table.get("rating");
  const dateFrom = table.get("dateFrom");
  const dateTo = table.get("dateTo");
  const minVotes = table.get("minVotes") ? Number(table.get("minVotes")) : undefined;
  const sort = table.get("sort") || "-createdAt";
  const currentPage = table.getNumber("page", 1);

  const filtered = useMemo(() => {
    let result = [...reviews];

    const q = activeSearch.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q) ||
          (r as any).productTitle?.toLowerCase().includes(q) ||
          (r as any).userName?.toLowerCase().includes(q),
      );
    }

    if (ratingFilter) {
      const ratings = ratingFilter.split("|").filter(Boolean).map(Number);
      if (ratings.length > 0) {
        result = result.filter((r) => ratings.includes(r.rating));
      }
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      result = result.filter((r) => {
        const rTime = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return rTime >= fromTime;
      });
    }
    if (dateTo) {
      const toTime = new Date(dateTo).getTime();
      result = result.filter((r) => {
        const rTime = r.createdAt ? new Date(r.createdAt).getTime() : Infinity;
        return rTime <= toTime;
      });
    }

    if (minVotes !== undefined) {
      result = result.filter((r) => ((r as any).helpfulCount ?? 0) >= minVotes);
    }

    result.sort((a, b) => {
      if (sort === "-rating") return b.rating - a.rating;
      if (sort === "rating") return a.rating - b.rating;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sort === "createdAt" ? aTime - bTime : bTime - aTime;
    });

    return result;
  }, [reviews, activeSearch, ratingFilter, dateFrom, dateTo, minVotes, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const sortOptions = REVIEW_PUBLIC_SORT_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.key,
  }));

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <div className="flex items-center gap-2.5 max-w-full">

          {/* Filter button */}
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 dark:border-slate-600 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* Search input */}
          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch()}
              placeholder="Search reviews by product, store, or user..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); table.set("q", ""); }}
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

          {/* Sort dropdown */}
          <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={sort}
              onChange={(v) => { table.set("sort", v); table.setPage(1); }}
              options={sortOptions}
            />
          </div>
        </div>
      </div>

      {/* ── Reviews grid ───────────────────────────────────────────────── */}
      <div className="py-6">
        {paginated.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No reviews found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={currentPage}
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
              <ReviewFilters table={table as unknown as UrlTable} variant={variant} />
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
