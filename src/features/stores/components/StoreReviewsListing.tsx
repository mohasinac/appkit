"use client";
import React, { useState } from "react";
import { useStoreReviews } from "../hooks/useStores";
import {
  Container,
  Div,
  Grid,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { ReviewCard } from "../../reviews/components/ReviewsList";

const STAR_OPTIONS = [
  { value: 0, label: "All Ratings" },
  { value: 5, label: "5 ★" },
  { value: 4, label: "4 ★" },
  { value: 3, label: "3 ★" },
  { value: 2, label: "2 ★" },
  { value: 1, label: "1 ★" },
];

const PAGE_SIZE = 12;

export interface StoreReviewsListingProps {
  storeSlug: string;
}

export function StoreReviewsListing({ storeSlug }: StoreReviewsListingProps) {
  const [ratingFilter, setRatingFilter] = useState(0);
  const [page, setPage] = useState(1);

  const { reviews, averageRating, totalReviews, isLoading } = useStoreReviews(storeSlug);

  const filtered = ratingFilter > 0
    ? reviews.filter((r) => Math.round(r.rating) === ratingFilter)
    : reviews;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  return (
    <Section>
      <Container size="xl">
        {/* Rating summary */}
        {totalReviews > 0 && (
          <Row align="center" gap="sm" className="mb-6">
            <Span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {averageRating.toFixed(1)}
            </Span>
            <Span className="text-zinc-500 text-sm">/ 5 · {totalReviews} reviews</Span>
          </Row>
        )}

        {/* Rating filter */}
        <Row gap="xs" className="mb-6 flex-wrap">
          {STAR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setRatingFilter(opt.value); setPage(1); }}
              className={[
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                ratingFilter === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </Row>

        {isLoading ? (
          <Stack align="center" gap="3" className="justify-center py-12">
            <Text className="text-zinc-500">Loading reviews...</Text>
          </Stack>
        ) : paginated.length === 0 ? (
          <Stack align="center" gap="3" className="justify-center py-24 text-center">
            <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
              No reviews yet
            </Text>
            <Text className="text-sm text-zinc-500">
              {ratingFilter > 0
                ? `No ${ratingFilter}-star reviews yet.`
                : "Be the first to review this store by purchasing a product."}
            </Text>
          </Stack>
        ) : (
          <>
            <Grid cols={3} gap="md">
              {paginated.map((review) => (
                <ReviewCard key={review.id} review={review as any} />
              ))}
            </Grid>

            {totalPages > 1 && (
              <Row gap="xs" className="mt-8 justify-center">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  ‹
                </button>
                <Div className="flex items-center px-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {page} / {totalPages}
                </Div>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  ›
                </button>
              </Row>
            )}
          </>
        )}
      </Container>
    </Section>
  );
}
