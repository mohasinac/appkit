"use client";

import React from "react";
import {
  Button,
  Div,
  Heading,
  Pagination,
  Row,
  Skeleton,
  Span,
  Text,
} from "../../../ui";
import { StarRating } from "../../../ui";
import type { Review } from "../types";

// ─── ReviewCard ───────────────────────────────────────────────────────────────

export interface ReviewCardProps {
  review: Review;
  className?: string;
}

export function ReviewCard({ review, className = "" }: ReviewCardProps) {
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const initials = review.userName.charAt(0).toUpperCase();

  return (
    <Div
      className={`rounded-xl border border-neutral-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
    >
      <Div className="flex items-start gap-3">
        {review.userAvatar ? (
          <Div
            role="img"
            aria-label={review.userName}
            className="h-9 w-9 flex-shrink-0 rounded-full bg-center bg-cover"
            style={{ backgroundImage: `url(${review.userAvatar})` }}
          />
        ) : (
          <Div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-600 dark:bg-zinc-700 dark:text-zinc-300">
            {initials}
          </Div>
        )}
        <Div className="flex-1 min-w-0">
          <Row wrap gap="sm">
            <Span className="font-medium text-neutral-900 dark:text-white">
              {review.userName}
            </Span>
            {review.verified && (
              <Span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Verified
              </Span>
            )}
            {date && (
              <Span className="text-xs text-neutral-400 dark:text-zinc-500">
                {date}
              </Span>
            )}
          </Row>
          <Div className="mt-1">
            <StarRating value={review.rating} size="sm" readOnly />
          </Div>
        </Div>
      </Div>

      {review.title && (
        <Heading
          level={4}
          className="mt-3 font-semibold text-neutral-900 dark:text-white"
        >
          {review.title}
        </Heading>
      )}

      {review.comment && (
        <Text className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-zinc-400">
          {review.comment}
        </Text>
      )}

      {review.images && review.images.length > 0 && (
        <Row wrap gap="sm" className="mt-3">
          {review.images.map((img, i) => (
            <Div
              key={i}
              role="img"
              aria-label={`Review image ${i + 1}`}
              className="h-16 w-16 rounded-lg bg-center bg-cover border border-neutral-100 dark:border-zinc-700"
              style={{ backgroundImage: `url(${img.thumbnailUrl ?? img.url})` }}
            />
          ))}
        </Row>
      )}

      {(review.helpfulCount ?? 0) > 0 && (
        <Text className="mt-3 text-xs text-neutral-400 dark:text-zinc-500">
          {review.helpfulCount} found this helpful
        </Text>
      )}
    </Div>
  );
}

// ─── ReviewsList ──────────────────────────────────────────────────────────────

export interface ReviewsListProps {
  reviews: Review[];
  isLoading?: boolean;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  emptyLabel?: string;
}

export function ReviewsList({
  reviews,
  isLoading,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  emptyLabel = "No reviews yet",
}: ReviewsListProps) {
  if (isLoading) {
    return (
      <Div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Div
            key={i}
            className="rounded-xl border border-neutral-200 dark:border-zinc-700 p-5"
          >
            <Div className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </Div>
            </Div>
            <Div className="mt-3 space-y-1">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </Div>
          </Div>
        ))}
      </Div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Text className="py-12 text-center text-sm text-neutral-500 dark:text-zinc-500">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Div className="space-y-6">
      <Div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </Div>
      {totalPages > 1 && onPageChange && (
        <Div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </Div>
      )}
    </Div>
  );
}
