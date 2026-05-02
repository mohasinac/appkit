"use client";
import React, { useMemo, useState } from "react";
import { Pagination, SortDropdown } from "../../../ui";
import { ReviewCard } from "./ReviewsList";
import type { Review } from "../types";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "-rating", label: "Highest Rating" },
  { value: "rating", label: "Lowest Rating" },
];

const STAR_FILTERS = [
  { value: "", label: "All" },
  { value: "5", label: "★★★★★" },
  { value: "4", label: "★★★★" },
  { value: "3", label: "★★★" },
  { value: "2", label: "★★" },
  { value: "1", label: "★" },
];

export interface ReviewsIndexListingProps {
  reviews: Review[];
}

export function ReviewsIndexListing({ reviews }: ReviewsIndexListingProps) {
  const [sort, setSort] = useState("-createdAt");
  const [starFilter, setStarFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...reviews];
    if (starFilter) {
      const star = parseInt(starFilter, 10);
      result = result.filter((r) => r.rating === star);
    }
    result.sort((a, b) => {
      if (sort === "-rating") return b.rating - a.rating;
      if (sort === "rating") return a.rating - b.rating;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sort === "createdAt" ? aTime - bTime : bTime - aTime;
    });
    return result;
  }, [reviews, sort, starFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (val: string) => { setSort(val); setPage(1); };
  const handleStarFilter = (val: string) => { setStarFilter(val); setPage(1); };

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Star rating filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STAR_FILTERS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStarFilter(opt.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  starFilter === opt.value
                    ? "border-primary bg-primary text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-primary hover:text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex ml-auto shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={sort}
              onChange={handleSort}
              options={SORT_OPTIONS}
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
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
