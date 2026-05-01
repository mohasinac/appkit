"use client";
import React, { useMemo, useState } from "react";
import {
  Div,
  Grid,
  Pagination,
  SlottedListingView,
  SortDropdown,
  Stack,
  Text,
} from "../../../ui";
import { ReviewCard } from "./ReviewsList";
import type { Review } from "../types";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "-rating", label: "Highest Rating" },
  { value: "rating", label: "Lowest Rating" },
];

const STAR_OPTIONS = [
  { value: "", label: "All Ratings" },
  { value: "5", label: "5 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "2", label: "2 Stars" },
  { value: "1", label: "1 Star" },
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

  const handleSort = (val: string) => {
    setSort(val);
    setPage(1);
  };

  const handleStarFilter = (val: string) => {
    setStarFilter(val);
    setPage(1);
  };

  return (
    <Div className="min-h-screen">
      <SlottedListingView
        portal="public"
        manageSearch={false}
        manageSort={false}
        inlineToolbar
        renderSort={() => (
          <SortDropdown
            value={sort}
            onChange={handleSort}
            options={SORT_OPTIONS}
          />
        )}
        renderFilters={() => (
          <Div className="space-y-2 p-4">
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Filter by Rating
            </Text>
            {STAR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStarFilter(opt.value)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  starFilter === opt.value
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </Div>
        )}
        renderTable={() =>
          paginated.length === 0 ? (
            <Stack align="center" gap="3" className="justify-center py-24 text-center">
              <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
                No reviews found
              </Text>
            </Stack>
          ) : (
            <Grid cols={3} gap="md">
              {paginated.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </Grid>
          )
        }
        renderPagination={() =>
          totalPages > 1 ? (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          ) : null
        }
        total={filtered.length}
        isLoading={false}
      />
    </Div>
  );
}
